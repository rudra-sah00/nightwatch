'use client';

import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';

export default function MusicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');

  useEffect(() => {
    Sentry.captureException(error, { tags: { feature: 'music' } });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <div className="w-14 h-14 mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-destructive" />
      </div>
      <h2 className="text-lg font-headline font-bold mb-1">
        {t('error.heading')}
      </h2>
      <p className="text-muted-foreground text-sm mb-5">
        {t('error.description')}
      </p>
      <button
        type="button"
        onClick={reset}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        {t('error.tryAgain')}
      </button>
    </div>
  );
}
