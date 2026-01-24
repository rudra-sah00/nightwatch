'use client';

import { Turnstile } from '@marsidev/react-turnstile';
import { useEffect } from 'react';
import { env } from '@/lib/env';

interface CaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
}

export function Captcha({ onVerify, onError }: CaptchaProps) {
  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (isDev) {
      // Auto-verify in development
      onVerify('dev-bypass-token');
    }
  }, [isDev, onVerify]);

  if (isDev) {
    return (
      <div className="text-xs text-muted-foreground text-center my-2 p-2 border border-dashed rounded opacity-50">
        Captcha Bypassed (Dev Mode)
      </div>
    );
  }

  const siteKey = env.TURNSTILE_SITE_KEY;

  return (
    <div className="w-full flex justify-center my-4">
      <Turnstile
        siteKey={siteKey}
        onSuccess={onVerify}
        onError={onError}
        options={{
          theme: 'dark',
          size: 'flexible',
        }}
        className="w-full"
      />
    </div>
  );
}
