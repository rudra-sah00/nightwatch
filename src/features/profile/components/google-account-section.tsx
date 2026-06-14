'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  connectGoogle,
  disconnectGoogle,
  getGoogleOAuthUrl,
  nativeGoogleSignIn,
} from '@/features/auth/google-api';
import { invalidateProfileCache } from '@/features/profile/api';
import { useAuth } from '@/providers/auth-provider';

/**
 * Section on the profile page to connect/disconnect a Google account.
 */
export function GoogleAccountSection() {
  const t = useTranslations('profile');
  const { user, updateUser } = useAuth();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  if (!user) return null;

  const isConnected = !!user.googleId;

  const handleConnect = async () => {
    if (window.Capacitor?.isNativePlatform?.()) {
      setIsConnecting(true);
      try {
        const idToken = await nativeGoogleSignIn();
        const { user: updated } = await connectGoogle({ idToken });
        updateUser(updated);
        invalidateProfileCache();
        toast.success(t('google.disconnected'));
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : t('google.disconnectFailed');
        toast.error(msg);
      } finally {
        setIsConnecting(false);
      }
    } else {
      window.location.href = getGoogleOAuthUrl('connect');
    }
  };

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const { user: updated } = await disconnectGoogle();
      updateUser(updated);
      invalidateProfileCache();
      toast.success(t('google.disconnected'));
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t('google.disconnectFailed');
      toast.error(msg);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-8 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-3xl font-black font-headline uppercase tracking-tighter text-foreground flex items-center gap-3">
          <GoogleIcon />
          {t('google.title')}
        </h2>
        <p className="text-sm font-bold uppercase font-headline text-foreground/40">
          {isConnected
            ? t('google.connectedAs', { email: user.googleEmail ?? '' })
            : t('google.description')}
        </p>
      </div>

      {isConnected ? (
        <Button
          type="button"
          variant="neo-outline"
          size="default"
          onClick={handleDisconnect}
          disabled={isDisconnecting}
          className="w-full md:w-auto shrink-0"
        >
          {isDisconnecting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          {t('google.disconnect')}
        </Button>
      ) : (
        <Button
          type="button"
          variant="neo-outline"
          size="default"
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full md:w-auto shrink-0"
        >
          {isConnecting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          {t('google.connect')}
        </Button>
      )}
    </section>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
