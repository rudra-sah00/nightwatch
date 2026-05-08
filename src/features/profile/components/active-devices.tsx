'use client';

import {
  Camera,
  Globe,
  Loader2,
  LogOut,
  Monitor,
  Plus,
  Smartphone,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { qrAuthorize } from '@/features/auth/qr-api';
import { checkIsMobile } from '@/lib/electron-bridge';
import { apiFetch } from '@/lib/fetch';

interface Session {
  sessionId: string;
  device: string;
  createdAt: number;
  isCurrent: boolean;
}

function parseDevice(ua: string): {
  icon: typeof Monitor;
  label: string;
  color: string;
} {
  const lower = ua.toLowerCase();
  if (lower === 'desktop app')
    return { icon: Monitor, label: 'Desktop App', color: 'text-neo-blue' };
  if (
    lower.includes('mobile') ||
    lower.includes('android') ||
    lower.includes('iphone')
  )
    return { icon: Smartphone, label: 'Mobile', color: 'text-neo-green' };
  if (lower.includes('electron'))
    return { icon: Monitor, label: 'Desktop App', color: 'text-neo-blue' };
  if (lower.includes('chrome'))
    return { icon: Globe, label: 'Chrome', color: 'text-neo-yellow' };
  if (lower.includes('firefox'))
    return { icon: Globe, label: 'Firefox', color: 'text-neo-yellow' };
  if (lower.includes('safari'))
    return { icon: Globe, label: 'Safari', color: 'text-neo-yellow' };
  return { icon: Globe, label: 'Browser', color: 'text-neo-yellow' };
}

function timeAgo(timestamp: number): string {
  if (!timestamp) return 'Unknown';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActiveDevices() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(
      checkIsMobile() || /mobile|android|iphone/i.test(navigator.userAgent),
    );
  }, []);

  const fetchSessions = useCallback(async () => {
    try {
      const data = await apiFetch<{ sessions: Session[] }>(
        '/api/auth/sessions',
      );
      setSessions(data.sessions);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      await apiFetch(`/api/auth/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      toast.success('Device signed out');
    } catch {
      toast.error('Failed to sign out device');
    } finally {
      setRevoking(null);
    }
  };

  if (loading) {
    return (
      <section className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8">
        <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-8">
          Active Devices
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-4xl font-black font-headline uppercase tracking-tighter">
          Active Devices
        </h2>
        {isMobile && (
          <button
            type="button"
            onClick={() => setScanning(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-headline font-bold uppercase tracking-wider border-2 border-border rounded-lg hover:bg-secondary active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Device
          </button>
        )}
      </div>

      {scanning && (
        <QrScanner
          onClose={() => setScanning(false)}
          onSuccess={() => {
            setScanning(false);
            fetchSessions();
          }}
        />
      )}

      <div className="space-y-3">
        {sessions.map((session) => {
          const { icon: Icon, label, color } = parseDevice(session.device);
          return (
            <div
              key={session.sessionId}
              className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card"
            >
              <Icon className={`w-5 h-5 ${color} shrink-0`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-headline font-bold">
                  {label}
                  {session.isCurrent ? (
                    <span className="ml-2 text-xs text-neo-green font-semibold">
                      This device
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session.createdAt
                    ? `Signed in ${timeAgo(session.createdAt)}`
                    : 'Unknown'}
                </p>
              </div>
              {!session.isCurrent ? (
                <button
                  type="button"
                  onClick={() => handleRevoke(session.sessionId)}
                  disabled={revoking === session.sessionId}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-headline font-bold text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 active:scale-95 transition-all disabled:opacity-50"
                >
                  {revoking === session.sessionId ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <LogOut className="w-3 h-3" />
                  )}
                  Sign out
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {sessions.filter((s) => !s.isCurrent).length > 1 ? (
        <button
          type="button"
          onClick={async () => {
            const others = sessions.filter((s) => !s.isCurrent);
            for (const s of others) {
              await apiFetch(`/api/auth/sessions/${s.sessionId}`, {
                method: 'DELETE',
              });
            }
            setSessions((prev) => prev.filter((s) => s.isCurrent));
            toast.success('All other devices signed out');
          }}
          className="mt-6 px-4 py-2 text-sm font-headline font-bold text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 active:scale-95 transition-all"
        >
          Sign out all other devices
        </button>
      ) : null}
    </section>
  );
}

// ── QR Scanner (mobile camera) ──────────────────────────────────────────────

function QrScanner({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => {
      t.stop();
    });
    streamRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => {
            t.stop();
          });
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        setError('Camera access denied');
      }
    };
    start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [stopCamera]);

  // Scan frames using BarcodeDetector or manual parsing
  useEffect(() => {
    if (!('BarcodeDetector' in window)) {
      setError('QR scanning not supported on this device');
      return;
    }
    const detector = new (
      window as unknown as {
        BarcodeDetector: new (opts: {
          formats: string[];
        }) => {
          detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>;
        };
      }
    ).BarcodeDetector({ formats: ['qr_code'] });
    let raf: number;

    const scan = async () => {
      if (
        !videoRef.current ||
        videoRef.current.readyState < 2 ||
        processingRef.current
      ) {
        raf = requestAnimationFrame(scan);
        return;
      }
      try {
        const results = await detector.detect(videoRef.current);
        if (results.length > 0) {
          const url = results[0].rawValue;
          if (url.includes('nightwatch://qr') || url.includes('code=')) {
            processingRef.current = true;
            const code = new URL(
              url.replace('nightwatch://', 'https://x/'),
            ).searchParams.get('code');
            if (code) {
              stopCamera();
              try {
                await qrAuthorize(code);
                toast.success('Device authorized');
                onSuccess();
              } catch {
                toast.error('Failed to authorize. QR may be expired.');
                onClose();
              }
              return;
            }
          }
        }
      } catch {
        // Detection failed, retry
      }
      raf = requestAnimationFrame(scan);
    };

    raf = requestAnimationFrame(scan);
    return () => cancelAnimationFrame(raf);
  }, [onSuccess, onClose, stopCamera]);

  return (
    <div className="mb-6 p-4 border-2 border-border rounded-xl bg-secondary/30 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs font-headline font-bold uppercase tracking-widest text-muted-foreground">
            Scan QR from desktop
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="text-xs font-headline font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>

      {error ? (
        <p className="text-xs text-destructive font-bold py-8">{error}</p>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full max-w-[280px] aspect-square rounded-lg object-cover"
        />
      )}
    </div>
  );
}
