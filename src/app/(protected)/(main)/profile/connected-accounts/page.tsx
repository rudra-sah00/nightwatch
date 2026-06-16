'use client';

import { ArrowLeft, Unlink } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/fetch';
import { useAuth } from '@/providers/auth-provider';

const PROVIDERS: Record<string, { name: string; color: string }> = {
  spotify: { name: 'Spotify', color: '#1DB954' },
};

export default function ConnectedAccountsPage() {
  const t = useTranslations('profile');
  const user = useAuth((s) => s.user);
  const updateUser = useAuth((s) => s.updateUser);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const connectedServices = user?.connectedServices ?? [];

  const handleDisconnect = async (provider: string) => {
    setDisconnecting(provider);
    try {
      await apiFetch(`/api/music/${provider}/disconnect`, { method: 'DELETE' });
      updateUser({
        connectedServices: connectedServices.filter((s) => s !== provider),
      });
      toast.success(
        t('connectedAccounts.disconnected', {
          provider: PROVIDERS[provider]?.name ?? provider,
        }),
      );
    } catch {
      toast.error(t('connectedAccounts.disconnectFailed'));
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8 animate-in fade-in duration-200 w-full">
      <div className="flex items-center gap-3">
        <Link
          href="/profile"
          className="p-2 hover:bg-secondary/50 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-black font-headline uppercase tracking-tighter">
          {t('nav.connectedAccounts')}
        </h1>
      </div>

      <div className="flex flex-col gap-3">
        {connectedServices.length === 0 ? (
          <p className="text-muted-foreground text-sm font-body px-2">
            {t('connectedAccounts.empty')}
          </p>
        ) : (
          connectedServices.map((provider) => {
            const info = PROVIDERS[provider];
            return (
              <div
                key={provider}
                className="flex items-center gap-4 px-5 py-4 bg-card border border-border rounded-xl"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: info?.color ?? '#888' }}
                />
                <span className="flex-1 font-headline font-bold uppercase tracking-wider text-sm">
                  {info?.name ?? provider}
                </span>
                <button
                  type="button"
                  onClick={() => handleDisconnect(provider)}
                  disabled={disconnecting === provider}
                  className="flex items-center gap-2 text-xs font-headline uppercase tracking-wider text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  {disconnecting === provider
                    ? t('connectedAccounts.disconnecting')
                    : t('connectedAccounts.disconnect')}
                </button>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
