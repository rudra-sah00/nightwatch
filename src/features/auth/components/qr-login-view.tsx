'use client';

import { Loader2, Mail, Smartphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/providers/theme-provider';
import { useQrLogin } from '../hooks/use-qr-login';
import { AuthCard } from './auth-card';

interface QrLoginViewProps {
  onSwitchToEmail: () => void;
}

export function QrLoginView({ onSwitchToEmail }: QrLoginViewProps) {
  const t = useTranslations('auth');
  const { code, status, secondsLeft, loading } = useQrLogin();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  const [qrReady, setQrReady] = useState(false);

  useEffect(() => {
    if (!code || !canvasRef.current) return;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    QRCode.toCanvas(canvasRef.current, `nightwatch://qr?code=${code}`, {
      width: 180,
      margin: 2,
      color: {
        dark: isDark ? '#ffffff' : '#000000',
        light: isDark ? '#000000' : '#ffffff',
      },
    }).then(() => setQrReady(true));
  }, [code, theme]);

  const isExpired = status === 'expired';

  return (
    <AuthCard title={t('title.entrance')} className="h-[440px]">
      <div className="h-full flex flex-col items-center justify-between pt-2 pb-1">
        {/* QR Code area */}
        <div className="flex flex-col items-center gap-2 flex-1 justify-center">
          <div className="flex items-center gap-1.5 mb-1">
            <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-[10px] font-headline font-black uppercase tracking-[0.15em] text-muted-foreground">
              {t('qr.scanToLogin')}
            </p>
          </div>

          <div className="relative">
            <canvas
              ref={canvasRef}
              className={`rounded-lg transition-opacity ${isExpired ? 'opacity-20' : qrReady ? 'opacity-100' : 'opacity-0'}`}
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {!isExpired && (
            <p className="text-[9px] font-headline font-bold uppercase tracking-widest text-muted-foreground/60">
              {t('qr.expiresIn', { minutes: Math.ceil(secondsLeft / 60) })}
            </p>
          )}
        </div>

        {/* Switch to email/password */}
        <Button
          type="button"
          variant="neo-outline"
          size="xl"
          onClick={onSwitchToEmail}
          className="w-full h-[42px] text-xs font-black tracking-widest uppercase italic font-headline shrink-0 mb-2"
        >
          <Mail className="w-3.5 h-3.5 mr-2" />
          {t('qr.useEmailPassword')}
        </Button>
      </div>
    </AuthCard>
  );
}
