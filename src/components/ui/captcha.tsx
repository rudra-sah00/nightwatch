'use client';

import type { TurnstileInstance } from '@marsidev/react-turnstile';
import { Turnstile } from '@marsidev/react-turnstile';
import { useEffect, useImperativeHandle, useRef } from 'react';
import { env } from '@/lib/env';

// Hoisted to module level to prevent recreation on each render (rule 5.4)
const TURNSTILE_OPTIONS = { theme: 'dark', size: 'flexible' } as const;

/**
 * Imperative handle exposed by {@link Captcha} via `ref`.
 */
export interface CaptchaHandle {
  /** Reset the Turnstile widget so the user can re-verify. */
  reset: () => void;
}

/** Props for the {@link Captcha} component. */
interface CaptchaProps {
  /** Called with the verification token on successful challenge completion. */
  onVerify: (token: string) => void;
  /** Called when the challenge encounters an error. */
  onError?: () => void;
  /** Called when a previously valid token expires. Defaults to `onError`. */
  onExpire?: () => void;
  ref?: React.Ref<CaptchaHandle>;
  className?: string;
  /**
   * Layout variant.
   * - `'full'` (default) — standalone bordered box.
   * - `'bottom'` — flush bottom-border style for inline placement.
   */
  variant?: 'full' | 'bottom';
}

/**
 * Cloudflare Turnstile CAPTCHA widget with development/test bypass.
 *
 * In development mode the challenge is auto-verified with a `'dev-bypass-token'`.
 * In test mode a static placeholder is rendered. In production the real
 * Turnstile widget is displayed using the site key from {@link env}.
 */
export function Captcha({
  onVerify,
  onError,
  onExpire,
  ref,
  className,
  variant = 'full',
}: CaptchaProps) {
  const isDev = process.env.NODE_ENV === 'development';
  const isTest = process.env.NODE_ENV === 'test';
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

  if (isDev || isTest) {
    const isBottom = variant === 'bottom';
    return (
      <div
        className={`w-full bg-muted/50 flex items-center justify-center gap-3 select-none group transition-colors hover:bg-neo-yellow ${
          isBottom
            ? 'h-[65px] border-b-4 border-border'
            : 'h-[65px] border-4 border-border bg-background'
        } ${className}`}
      >
        <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse  border border-border" />
        <span
          className={`font-headline font-black uppercase tracking-widest text-foreground ${
            isBottom ? 'text-[10px] opacity-40' : 'text-xs'
          }`}
        >
          Security Verified (65PX PROD)
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
