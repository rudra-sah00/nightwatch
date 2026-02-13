'use client';

import { Turnstile } from '@marsidev/react-turnstile';
import { useEffect, useRef } from 'react';
import { env } from '@/lib/env';

// Hoisted to module level to prevent recreation on each render (rule 5.4)
const TURNSTILE_OPTIONS = { theme: 'dark', size: 'flexible' } as const;

interface CaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
}

export function Captcha({ onVerify, onError }: CaptchaProps) {
  const isDev = process.env.NODE_ENV === 'development';
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;

  useEffect(() => {
    if (isDev) {
      // Auto-verify in development
      onVerifyRef.current('dev-bypass-token');
    }
  }, [isDev]);

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
        options={TURNSTILE_OPTIONS}
        className="w-full"
      />
    </div>
  );
}
