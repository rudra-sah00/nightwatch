'use client';

import * as Sentry from '@sentry/nextjs';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          {t('error.heading')}
        </h2>
        <p className="text-muted-foreground mb-8">{t('error.description')}</p>
        <Button onClick={reset} variant="default">
          {t('error.tryAgain')}
        </Button>
      </div>
    </div>
  );
}
