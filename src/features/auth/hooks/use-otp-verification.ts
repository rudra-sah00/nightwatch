'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { handleApiError } from '@/lib/errors';

interface UseOtpVerificationOptions {
  /** Email to send/resend OTP to */
  email: string;
  /** Resend OTP API call */
  resendOtp: (email: string) => Promise<unknown>;
  /** Verify OTP API call — caller handles the response */
  verifyOtp: (email: string, otp: string) => Promise<void>;
  /** Initial countdown seconds (default 30) */
  initialCountdown?: number;
}

export function useOtpVerification({
  email,
  resendOtp,
  verifyOtp,
  initialCountdown = 30,
}: UseOtpVerificationOptions) {
  const t = useTranslations('toasts');
  const tErr = useTranslations('auth.errors');
  const tErrors = useTranslations('errors');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(initialCountdown);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startCountdown = useCallback((seconds: number) => {
    setCountdown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Start countdown on mount
  useEffect(() => {
    startCountdown(initialCountdown);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [initialCountdown, startCountdown]);

  const handleResend = useCallback(async () => {
    if (countdown > 0) return;
    setIsLoading(true);
    setError(null);
    try {
      await resendOtp(email);
      startCountdown(60);
      toast.success(t('verificationResent'));
    } catch (err) {
      const msg = handleApiError(err, tErr('resendFailed'), tErrors);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [countdown, email, resendOtp, startCountdown, t, tErr, tErrors]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      if (!otp || otp.length !== 6) {
        const msg = tErr('invalidOtp');
        setError(msg);
        toast.error(msg);
        return;
      }
      setIsLoading(true);
      try {
        await verifyOtp(email, otp);
      } catch (err) {
        const msg = handleApiError(err, tErr('verificationFailed'), tErrors);
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    },
    [otp, email, verifyOtp, tErr, tErrors],
  );

  return {
    otp,
    setOtp,
    isLoading,
    error,
    setError,
    countdown,
    handleResend,
    handleSubmit,
  };
}
