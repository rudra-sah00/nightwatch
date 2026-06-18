'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { connectGoogle, googleLogin } from '@/features/auth/google-api';
import { invalidateProfileCache } from '@/features/profile/api';
import { trackEvent } from '@/lib/analytics';
import { storeUser } from '@/lib/auth';
import { setTokenExpiration } from '@/lib/fetch';
import { useAuthStore } from '@/store/use-auth-store';

export default function GoogleCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state') as 'login' | 'connect' | null;
    const error = searchParams.get('error');

    if (error || !code) {
      toast.error(error || 'Google sign-in was cancelled');
      router.replace(state === 'connect' ? '/profile' : '/login');
      return;
    }

    const handleCallback = async () => {
      try {
        if (state === 'connect') {
          const { user } = await connectGoogle({ code });
          useAuthStore.getState().updateUser(user);
          invalidateProfileCache();
          toast.success('Google account connected');
          router.replace('/profile');
        } else {
          const response = await googleLogin({ code });
          if (response.user) {
            trackEvent('login_success', { method: 'google' });
            storeUser(response.user);
            useAuthStore.getState().setUser(response.user);
            if (response.expiresIn) setTokenExpiration(response.expiresIn);
            router.replace('/home');
          }
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Google sign-in failed';
        toast.error(msg);
        router.replace(state === 'connect' ? '/profile' : '/login');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-foreground/20 border-t-foreground rounded-full animate-spin" />
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
          Signing in...
        </p>
      </div>
    </div>
  );
}
