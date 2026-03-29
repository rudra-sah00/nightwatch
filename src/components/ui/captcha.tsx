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
  className?: string;
  variant?: 'full' | 'bottom';
}

export function Captcha({
  onVerify,
  onError,
  onExpire,
  ref,
  className,
  variant = 'full',
}: CaptchaProps) {
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
    const isBottom = variant === 'bottom';
    return (
      <div
        className={`w-full bg-[#f2ede5]/50 flex items-center justify-center gap-3 select-none group transition-colors hover:bg-[#ffcc00] ${
          isBottom
            ? 'border-b-4 border-[#1a1a1a] h-[42px]'
            : 'border-4 border-[#1a1a1a] bg-white h-[52px]'
        } ${className}`}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-[#00aa44] animate-pulse neo-shadow-sm border border-[#1a1a1a]" />
        <span
          className={`font-headline font-black uppercase tracking-widest text-[#1a1a1a] ${
            isBottom ? 'text-[10px] opacity-40' : 'text-xs'
          }`}
        >
          Security Verified
        </span>
      </div>
    );
  }

  const siteKey = env.TURNSTILE_SITE_KEY;

  return (
    <div className={`w-full flex justify-center py-2 ${className}`}>
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
