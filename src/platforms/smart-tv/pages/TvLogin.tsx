'use client';

import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type QrStatus,
  qrInitiate,
  qrPollStatus,
} from '@/features/auth/qr-api';
import { getProfile } from '@/features/profile/api';
import { useAuthStore } from '@/store/use-auth-store';
import { useTvFocus } from '../hooks/use-tv-focus';

export function TvLogin() {
  const t = useTranslations('common.tv.login');
  const [code, setCode] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<QrStatus>('pending');
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const setUser = useAuthStore((s) => s.setUser);

  useTvFocus('tv-login', 'TV_LOGIN_QR');

  const { ref, focusKey, focusSelf } = useFocusable({
    focusKey: 'TV_LOGIN_PAGE',
    isFocusBoundary: true,
  });

  const initQr = useCallback(async () => {
    try {
      setError(null);
      setStatus('pending');
      const { code: newCode } = await qrInitiate();
      setCode(newCode);
      // Generate QR code image
      const QRCode = await import('qrcode');
      const url = `https://www.nightwatch.in/auth/qr?code=${newCode}`;
      const dataUrl = await QRCode.toDataURL(url, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);
    } catch {
      setError('Failed to generate QR code. Check your connection.');
    }
  }, []);

  useEffect(() => {
    initQr();
    focusSelf();
  }, [initQr, focusSelf]);

  // Poll for authorization
  useEffect(() => {
    if (!code || status !== 'pending') return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await qrPollStatus(code);
        if (res.status === 'authorized') {
          setStatus('authorized');
          clearInterval(pollRef.current);
          const { user } = await getProfile();
          if (user) setUser(user);
        } else if (res.status === 'expired') {
          setStatus('expired');
          clearInterval(pollRef.current);
        }
      } catch {
        /* continue polling */
      }
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [code, status, setUser]);

  const { ref: retryRef, focused: retryFocused } = useFocusable({
    onEnterPress: () => initQr(),
  });

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        className="flex items-center justify-center h-screen bg-background"
      >
        <div className="flex flex-col items-center gap-6 max-w-md text-center">
          <Image
            src="/logo.png"
            alt="Nightwatch"
            className="w-16 h-16"
            width={64}
            height={64}
            unoptimized
          />
          <h1 className="text-3xl font-bold">{t('title')}</h1>

          {error && <p className="text-red-400">{error}</p>}

          {status === 'pending' && qrDataUrl && (
            <>
              <p className="text-muted-foreground">{t('scanHint')}</p>
              <div className="rounded-2xl overflow-hidden bg-white p-2">
                <Image
                  src={qrDataUrl}
                  alt="QR Code"
                  className="w-[280px] h-[280px]"
                  width={280}
                  height={280}
                  unoptimized
                />
              </div>
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <div className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                {t('waiting')}
              </div>
            </>
          )}

          {status === 'authorized' && (
            <div className="flex flex-col items-center gap-4">
              <span className="material-symbols-outlined text-5xl text-green-400">
                check_circle
              </span>
              <p className="text-green-400 text-xl">{t('success')}</p>
            </div>
          )}

          {status === 'expired' && (
            <div className="flex flex-col items-center gap-4">
              <p className="text-muted-foreground">{t('expired')}</p>
              <button
                ref={retryRef}
                type="button"
                className={`px-6 py-3 rounded-xl font-medium transition-all ${
                  retryFocused
                    ? 'bg-tv-focus text-foreground scale-105'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {t('retry')}
              </button>
            </div>
          )}
        </div>
      </div>
    </FocusContext.Provider>
  );
}
