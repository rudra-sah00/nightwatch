'use client';

import {
  Globe,
  Loader2,
  LogOut,
  Monitor,
  Plus,
  RefreshCw,
  Smartphone,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { qrInitiate, qrPollStatus } from '@/features/auth/qr-api';
import { apiFetch } from '@/lib/fetch';
import { useTheme } from '@/providers/theme-provider';

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
  const [showAddDevice, setShowAddDevice] = useState(false);

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
        <button
          type="button"
          onClick={() => setShowAddDevice(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-headline font-bold uppercase tracking-wider border-2 border-border rounded-lg hover:bg-secondary active:scale-95 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Device
        </button>
      </div>

      {showAddDevice && (
        <AddDeviceQr
          onClose={() => setShowAddDevice(false)}
          onSuccess={() => {
            setShowAddDevice(false);
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

// ── Add Device QR Dialog ────────────────────────────────────────────────────

const QR_LIFETIME = 300;

function AddDeviceQr({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [code, setCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(QR_LIFETIME);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const activeCode = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    pollRef.current = null;
    countdownRef.current = null;
  }, []);

  const initiate = useCallback(async () => {
    cleanup();
    setLoading(true);
    setExpired(false);
    try {
      const res = await qrInitiate();
      setCode(res.code);
      activeCode.current = res.code;
      setSecondsLeft(QR_LIFETIME);
      setLoading(false);

      pollRef.current = setInterval(async () => {
        if (!activeCode.current) return;
        try {
          const poll = await qrPollStatus(activeCode.current);
          if (poll.status === 'authorized') {
            cleanup();
            toast.success('Device added successfully');
            onSuccess();
          } else if (poll.status === 'expired') {
            cleanup();
            setExpired(true);
          }
        } catch {
          // Silent retry
        }
      }, 3000);

      countdownRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            cleanup();
            setExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setLoading(false);
      setExpired(true);
    }
  }, [cleanup, onSuccess]);

  useEffect(() => {
    initiate();
    return cleanup;
  }, [initiate, cleanup]);

  useEffect(() => {
    if (!code || !canvasRef.current) return;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    QRCode.toCanvas(canvasRef.current, `nightwatch://qr?code=${code}`, {
      width: 200,
      margin: 2,
      color: {
        dark: isDark ? '#ffffff' : '#000000',
        light: isDark ? '#000000' : '#ffffff',
      },
    });
  }, [code, theme]);

  return (
    <div className="mb-6 p-6 border-2 border-border rounded-xl bg-secondary/30 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-muted-foreground" />
          <p className="text-xs font-headline font-bold uppercase tracking-widest text-muted-foreground">
            Scan with new device
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            cleanup();
            onClose();
          }}
          className="p-1 rounded-md hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          className={`rounded-lg border-2 border-border transition-opacity ${expired ? 'opacity-20' : code ? 'opacity-100' : 'opacity-0'}`}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {expired && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              type="button"
              onClick={initiate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-headline font-bold uppercase tracking-wider hover:bg-primary/90 active:scale-95 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        )}
      </div>

      {!expired && (
        <p className="text-[10px] font-headline font-bold uppercase tracking-widest text-muted-foreground/60">
          Expires in {Math.ceil(secondsLeft / 60)}m
        </p>
      )}
    </div>
  );
}
