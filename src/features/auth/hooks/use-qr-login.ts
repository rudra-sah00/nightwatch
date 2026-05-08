import { useCallback, useEffect, useRef, useState } from 'react';
import { storeUser } from '@/lib/auth';
import { setTokenExpiration } from '@/lib/fetch';
import { useAuthStore } from '@/store/use-auth-store';
import type { QrStatus } from '../qr-api';
import { qrInitiate, qrPollStatus } from '../qr-api';

const POLL_INTERVAL = 3000;
const QR_LIFETIME = 300;
const MAX_RETRIES = 3;

export function useQrLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<QrStatus>('pending');
  const [secondsLeft, setSecondsLeft] = useState(QR_LIFETIME);
  const [loading, setLoading] = useState(true);

  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const activeCode = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const retriesRef = useRef(0);

  const cleanup = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    pollRef.current = null;
    countdownRef.current = null;
  }, []);

  const initiateRef = useRef<(() => Promise<void>) | null>(null);

  initiateRef.current = async () => {
    // Prevent overlapping calls
    if (pollRef.current) return;
    cleanup();
    setLoading(true);
    setStatus('pending');
    setCode(null);
    try {
      const res = await qrInitiate();
      if (!mountedRef.current) return;
      retriesRef.current = 0;
      setCode(res.code);
      activeCode.current = res.code;
      setSecondsLeft(QR_LIFETIME);
      setLoading(false);

      pollRef.current = setInterval(async () => {
        if (!activeCode.current) return;
        try {
          const poll = await qrPollStatus(activeCode.current);
          if (!mountedRef.current) return;
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
          // Silent — will retry next interval
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
      if (!mountedRef.current) return;
      setLoading(false);
      // Only auto-retry up to MAX_RETRIES to prevent infinite loop
      if (retriesRef.current < MAX_RETRIES) {
        retriesRef.current++;
        setStatus('expired');
      }
    }
  };

  const refresh = useCallback(() => {
    retriesRef.current = 0;
    initiateRef.current?.();
  }, []);

  // Mount once — no deps to prevent re-firing
  useEffect(() => {
    mountedRef.current = true;
    initiateRef.current?.();
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  // Auto-refresh when expired (with retry limit)
  useEffect(() => {
    if (status !== 'expired') return;
    if (retriesRef.current >= MAX_RETRIES) return;
    const timer = setTimeout(() => {
      if (mountedRef.current) initiateRef.current?.();
    }, 1500);
    return () => clearTimeout(timer);
  }, [status]);

  return { code, status, secondsLeft, loading, refresh };
}
