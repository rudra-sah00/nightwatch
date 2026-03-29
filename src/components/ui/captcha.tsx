'use client';

import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { Turnstile } from '@marsidev/react-turnstile';
import { useEffect, useImperativeHandle, useRef } from 'react';
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
  ref?: React.Ref<CaptchaHandle>;
}

export function Captcha({ onVerify, onError, onExpire, ref }: CaptchaProps) {
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
      <div className="w-full bg-[#f2ede5]/50 border-b-4 border-[#1a1a1a] p-2 flex items-center justify-center gap-2 select-none h-[42px]">
        <div className="w-2 h-2 rounded-full bg-[#00aa44] animate-pulse" />
        <span className="text-[10px] font-headline font-bold uppercase tracking-widest text-[#1a1a1a] opacity-40">
          Dev Bypass Active
        </span>
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
}
