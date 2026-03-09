'use client';

import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { Turnstile } from '@marsidev/react-turnstile';
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { env } from '@/lib/env';

// Hoisted to module level to prevent recreation on each render (rule 5.4)
const TURNSTILE_OPTIONS = { theme: 'dark', size: 'flexible' } as const;

export interface CaptchaHandle {
  reset: () => void;
}

interface CaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export const Captcha = forwardRef<CaptchaHandle, CaptchaProps>(function Captcha(
  { onVerify, onError, onExpire },
  ref,
) {
  const isDev = process.env.NODE_ENV === 'development';
  const onVerifyRef = useRef(onVerify);
  const turnstileRef = useRef<TurnstileInstance>(null);
  onVerifyRef.current = onVerify;

  useImperativeHandle(ref, () => ({
    reset: () => turnstileRef.current?.reset(),
  }));

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
        ref={turnstileRef}
        siteKey={siteKey}
        onSuccess={onVerify}
        onError={onError}
        onExpire={onExpire ?? onError}
        options={TURNSTILE_OPTIONS}
        className="w-full"
      />
    </div>
  );
});
