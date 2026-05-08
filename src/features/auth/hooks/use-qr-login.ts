import { useCallback, useEffect, useRef, useState } from 'react';
import { storeUser } from '@/lib/auth';
import { setTokenExpiration } from '@/lib/fetch';
import { useAuthStore } from '@/store/use-auth-store';
import type { QrStatus } from '../qr-api';
import { qrInitiate, qrPollStatus } from '../qr-api';

const POLL_INTERVAL = 3000;
const QR_LIFETIME = 300;

export function useQrLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<QrStatus>('pending');
  const [secondsLeft, setSecondsLeft] = useState(QR_LIFETIME);
  const [loading, setLoading] = useState(true);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const activeCode = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    pollRef.current = null;
    countdownRef.current = null;
  }, []);

  const initiate = useCallback(async () => {
    cleanup();
    setLoading(true);
    setStatus('pending');
    try {
      const res = await qrInitiate();
      setCode(res.code);
      activeCode.current = res.code;
      setSecondsLeft(QR_LIFETIME);
      setLoading(false);

      pollRef.current = setInterval(async () => {
        if (!activeCode.current) return;
        try {
          const poll = await qrPollStatus(activeCode.current);
          if (poll.status === 'authorized' && poll.user) {
            cleanup();
            setStatus('authorized');
            storeUser(poll.user);
            if (poll.expiresIn) setTokenExpiration(poll.expiresIn);
            setUser(poll.user);
          } else if (poll.status === 'expired') {
            cleanup();
            setStatus('expired');
          }
        } catch {
          // Silent retry
        }
      }, POLL_INTERVAL);

      countdownRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            cleanup();
            setStatus('expired');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      setLoading(false);
      setStatus('expired');
    }
  }, [cleanup, setUser]);

  useEffect(() => {
    initiate();
    return cleanup;
  }, [initiate, cleanup]);

  // Auto-refresh when expired
  useEffect(() => {
    if (status !== 'expired') return;
    const timer = setTimeout(() => initiate(), 500);
    return () => clearTimeout(timer);
  }, [status, initiate]);

  return { code, status, secondsLeft, loading, refresh: initiate };
}
