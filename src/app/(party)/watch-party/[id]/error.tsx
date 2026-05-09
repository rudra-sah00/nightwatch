'use client';

import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

export default function WatchPartyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');
  const router = useRouter();

  useEffect(() => {
    Sentry.captureException(error, { tags: { feature: 'watch-party' } });
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-headline font-bold text-white mb-2">
          {t('error.heading')}
        </h2>
        <p className="text-white/60 text-sm mb-6">{t('error.description')}</p>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => router.push('/home')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('actions.close')}
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {t('error.tryAgain')}
          </button>
        </div>
      </div>
    </div>
  );
}
