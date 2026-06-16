'use client';

import { Link as LinkIcon, Unlink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useConnectedAccounts } from '../hooks/use-connected-accounts';

/**
 * Renders the list of connected and available-to-connect external services.
 * Used on the /profile/connected-accounts page.
 */
export function ConnectedAccountsList() {
  const t = useTranslations('profile');
  const {
    connectedServices,
    availableToConnect,
    providers,
    disconnect,
    connect,
    disconnecting,
    connecting,
  } = useConnectedAccounts();

  return (
    <div className="flex flex-col gap-3">
      {/* Connected services */}
      {connectedServices.map((provider) => {
        const info = providers[provider as keyof typeof providers];
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
              onClick={() => disconnect(provider)}
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
      })}

      {/* Available to connect */}
      {availableToConnect.map((provider) => {
        const info = providers[provider as keyof typeof providers];
        return (
          <button
            key={provider}
            type="button"
            onClick={() => connect(provider)}
            disabled={connecting === provider}
            className="flex items-center gap-4 px-5 py-4 bg-card border border-border border-dashed rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <div
              className="w-3 h-3 rounded-full opacity-40"
              style={{ backgroundColor: info?.color ?? '#888' }}
            />
            <span className="flex-1 text-left font-headline font-bold uppercase tracking-wider text-sm text-muted-foreground">
              {info?.name ?? provider}
            </span>
            <span className="flex items-center gap-2 text-xs font-headline uppercase tracking-wider text-foreground/60">
              <LinkIcon className="w-3.5 h-3.5" />
              {connecting === provider
                ? t('connectedAccounts.connecting')
                : t('connectedAccounts.connect')}
            </span>
          </button>
        );
      })}

      {connectedServices.length === 0 && availableToConnect.length === 0 && (
        <p className="text-muted-foreground text-sm font-body px-2">
          {t('connectedAccounts.empty')}
        </p>
      )}
    </div>
  );
}
