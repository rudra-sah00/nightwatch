'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Camera,
  Check,
  Globe,
  Loader2,
  LogOut,
  Monitor,
  Plus,
  Smartphone,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getSessions, revokeSession } from '@/features/auth/api';
import { qrAuthorize, qrReject } from '@/features/auth/qr-api';
import { checkIsMobile } from '@/lib/electron-bridge';

interface Session {
  sessionId: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

function parseDevice(ua: string): {
  icon: typeof Monitor;
  label: string;
  color: string;
} {
  const lower = ua.toLowerCase();
  if (lower === 'desktop app' || lower.includes('desktop app'))
    return { icon: Monitor, label: ua, color: 'text-neo-blue' };
  if (
    lower.includes('android') ||
    lower.includes('iphone') ||
    lower.includes('ios')
  )
    return { icon: Smartphone, label: ua, color: 'text-neo-green' };
  if (lower.includes('electron'))
    return { icon: Monitor, label: ua, color: 'text-neo-blue' };
  if (lower === 'web browser')
    return { icon: Globe, label: 'Web Browser', color: 'text-neo-yellow' };
  if (lower.includes('chrome'))
    return { icon: Globe, label: 'Chrome', color: 'text-neo-yellow' };
  if (lower.includes('firefox'))
    return { icon: Globe, label: 'Firefox', color: 'text-neo-yellow' };
  if (lower.includes('safari'))
    return { icon: Globe, label: 'Safari', color: 'text-neo-yellow' };
  return { icon: Globe, label: ua || 'Unknown', color: 'text-neo-yellow' };
}

function timeAgo(
  timestamp: number,
  t: ReturnType<typeof useTranslations<'profile'>>,
): string {
  if (!timestamp) return t('devices.unknown');
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('devices.justNow');
  if (mins < 60) return t('devices.minutesAgo', { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('devices.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  return t('devices.daysAgo', { count: days });
}

export function ActiveDevices() {
  const t = useTranslations('profile');
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(
      checkIsMobile() || /mobile|android|iphone/i.test(navigator.userAgent),
    );
  }, []);

  const { data: sessions = [], isLoading: loading } = useQuery<Session[]>({
    queryKey: ['profile', 'devices'],
    queryFn: getSessions as () => Promise<Session[]>,
    retry: 1,
    retryDelay: 2000,
  });

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => revokeSession(sessionId),
    onMutate: async (sessionId) => {
      await queryClient.cancelQueries({ queryKey: ['profile', 'devices'] });
      const prev = queryClient.getQueryData<Session[]>(['profile', 'devices']);
      queryClient.setQueryData<Session[]>(['profile', 'devices'], (old) =>
        old?.filter((s) => s.sessionId !== sessionId),
      );
      return { prev };
    },
    onSuccess: () => toast.success(t('devices.signedOutSuccess')),
    onError: (_err, _id, context) => {
      queryClient.setQueryData(['profile', 'devices'], context?.prev);
      toast.error(t('devices.signedOutFailed'));
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['profile', 'devices'] }),
  });

  const revoking = revokeMutation.isPending
    ? (revokeMutation.variables as string)
    : null;

  const handleRevoke = (sessionId: string) => {
    revokeMutation.mutate(sessionId);
  };

  if (loading) {
    return (
      <section className="bg-card text-card-foreground border border-border rounded-xl shadow-sm p-8">
        <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-8">
          {t('devices.title')}
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
          {t('devices.title')}
        </h2>
        {isMobile && (
          <button
            type="button"
            onClick={() => setScanning(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-headline font-bold uppercase tracking-wider border-2 border-border rounded-lg hover:bg-secondary active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('devices.addDevice')}
          </button>
        )}
      </div>

      {scanning && (
        <QrScanner
          onClose={() => setScanning(false)}
          onSuccess={() => {
            setScanning(false);
            queryClient.invalidateQueries({ queryKey: ['profile', 'devices'] });
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
                      {t('devices.thisDevice')}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session.lastActive
                    ? t('devices.signedIn', {
                        time: timeAgo(
                          new Date(session.lastActive).getTime(),
                          t,
                        ),
                      })
                    : t('devices.unknown')}
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
                  {t('devices.signOut')}
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
              await revokeSession(s.sessionId);
            }
            queryClient.setQueryData<Session[]>(['profile', 'devices'], (old) =>
              old?.filter((s) => s.isCurrent),
            );
            toast.success(t('devices.allSignedOut'));
          }}
          className="mt-6 px-4 py-2 text-sm font-headline font-bold text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 active:scale-95 transition-all"
        >
          {t('devices.signOutAll')}
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
  const t = useTranslations('profile');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [authorizing, setAuthorizing] = useState(false);
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
        setError(t('devices.cameraAccessDenied'));
      }
    };
    start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [stopCamera, t]);

  // Scan frames using jsQR (works on all platforms including iOS)
  useEffect(() => {
    let raf: number;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scan = async () => {
      if (
        !videoRef.current ||
        videoRef.current.readyState < 2 ||
        processingRef.current ||
        !ctx
      ) {
        raf = requestAnimationFrame(scan);
        return;
      }
      const { videoWidth, videoHeight } = videoRef.current;
      if (!videoWidth || !videoHeight) {
        raf = requestAnimationFrame(scan);
        return;
      }
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = ctx.getImageData(0, 0, videoWidth, videoHeight);

      const { default: jsQR } = await import('jsqr');
      const result = jsQR(imageData.data, videoWidth, videoHeight);

      if (result) {
        const url = result.data;
        if (!url.includes('nightwatch://qr')) {
          processingRef.current = true;
          toast.error(t('devices.invalidQr'));
          setTimeout(() => {
            processingRef.current = false;
          }, 2000);
          raf = requestAnimationFrame(scan);
          return;
        }
        processingRef.current = true;
        const code = new URL(
          url.replace('nightwatch://', 'https://x/'),
        ).searchParams.get('code');
        if (code) {
          stopCamera();
          setScannedCode(code);
          return;
        }
      }
      raf = requestAnimationFrame(scan);
    };

    raf = requestAnimationFrame(scan);
    return () => cancelAnimationFrame(raf);
  }, [stopCamera, t]);

  const handleConfirm = async () => {
    if (!scannedCode) return;
    setAuthorizing(true);
    try {
      await qrAuthorize(scannedCode);
      toast.success(t('devices.authorized'));
      // Wait for desktop to poll and create its session, then refresh
      setTimeout(() => onSuccess(), 4000);
    } catch {
      toast.error(t('devices.authorizeFailed'));
      onClose();
    }
  };

  return (
    <>
      <div className="mb-6 p-4 border-2 border-border rounded-xl bg-secondary/30 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-headline font-bold uppercase tracking-widest text-muted-foreground">
              {t('devices.scanQr')}
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
            {t('devices.cancel')}
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

      {scannedCode && (
        <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-hidden="true"
          />
          <div className="relative flex flex-col items-center gap-6 p-8 animate-in zoom-in-95 duration-200">
            <p className="font-headline font-black text-lg sm:text-2xl uppercase tracking-wider text-white text-center max-w-xs">
              {t('devices.authorizePrompt')}
            </p>
            <div className="flex items-center gap-8">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={authorizing}
                className="w-16 h-16 rounded-full bg-neo-green flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-50"
              >
                {authorizing ? (
                  <Loader2 className="w-8 h-8 stroke-[3px] text-white animate-spin" />
                ) : (
                  <Check className="w-8 h-8 stroke-[3px] text-white" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (scannedCode) qrReject(scannedCode).catch(() => {});
                  setScannedCode(null);
                  onClose();
                }}
                className="w-16 h-16 rounded-full bg-neo-red flex items-center justify-center hover:scale-110 transition-transform"
              >
                <X className="w-8 h-8 stroke-[3px] text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
