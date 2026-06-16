import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { checkIsMobile } from '@/lib/electron-bridge';
import { useAuth } from '@/providers/auth-provider';
import { connectSpotify, disconnectService } from '../api';

const PROVIDERS = {
  spotify: { name: 'Spotify', color: '#1DB954' },
} as const;

const ALL_SERVICES = Object.keys(PROVIDERS) as (keyof typeof PROVIDERS)[];

export function useConnectedAccounts() {
  const t = useTranslations('profile');
  const user = useAuth((s) => s.user);
  const updateUser = useAuth((s) => s.updateUser);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);

  const connectedServices = user?.connectedServices ?? [];
  const availableToConnect = ALL_SERVICES.filter(
    (s) => !connectedServices.includes(s),
  );

  const disconnect = useCallback(
    async (provider: string) => {
      setDisconnecting(provider);
      try {
        await disconnectService(provider);
        updateUser({
          connectedServices: connectedServices.filter((s) => s !== provider),
        });
        toast.success(
          t('connectedAccounts.disconnected', {
            provider:
              PROVIDERS[provider as keyof typeof PROVIDERS]?.name ?? provider,
          }),
        );
      } catch {
        toast.error(t('connectedAccounts.disconnectFailed'));
      } finally {
        setDisconnecting(null);
      }
    },
    [connectedServices, updateUser, t],
  );

  const connect = useCallback(
    async (provider: string) => {
      if (provider !== 'spotify') return;

      setConnecting(provider);
      try {
        const { SpotifyAuth } = await import('capacitor-spotify-auth');
        const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || '';
        const redirectUri = checkIsMobile()
          ? 'nightwatch://music/spotify/callback'
          : `${window.location.origin}/music/spotify/callback`;

        const result = await SpotifyAuth.authorize({
          clientId,
          redirectUri,
          scopes: 'playlist-read-private playlist-read-collaborative',
        });

        await connectSpotify(result.code, redirectUri);
        updateUser({
          connectedServices: [...connectedServices, 'spotify'],
        });
        toast.success(
          t('connectedAccounts.connected', {
            provider: PROVIDERS.spotify.name,
          }),
        );
      } catch {
        // User cancelled — do nothing
      } finally {
        setConnecting(null);
      }
    },
    [connectedServices, updateUser, t],
  );

  return {
    connectedServices,
    availableToConnect,
    providers: PROVIDERS,
    disconnect,
    connect,
    disconnecting,
    connecting,
  };
}
