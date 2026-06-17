'use client';

import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/fetch';

/**
 * Spotify OAuth callback page.
 * Receives the auth code, fires the import request (queued in backend),
 * then redirects back to /music immediately. No blocking UI.
 */
export default function SpotifyCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useTranslations('music');
  const initiated = useRef(false);

  useEffect(() => {
    if (initiated.current) return;
    initiated.current = true;

    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error || !code) {
      toast.error(t('spotifyAuthFailed'));
      router.replace('/music');
      return;
    }

    const redirectUri = `${window.location.origin}/en/music/spotify/callback`;

    // Fire and forget — backend queues the job
    apiFetch('/api/music/spotify/import', {
      method: 'POST',
      body: JSON.stringify({ code, redirectUri }),
      headers: { 'Content-Type': 'application/json' },
    })
      .then(() => {
        toast.success(t('spotifyImportStarted'));
      })
      .catch(() => {
        toast.error(t('spotifyImportFailed'));
      });

    // Redirect immediately — don't block user
    router.replace('/music');
  }, [searchParams, router, t]);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <Loader2 className="w-8 h-8 animate-spin text-[#1DB954]" />
      <p className="font-headline font-black uppercase text-xs tracking-wider text-foreground/60">
        {t('spotifyImporting')}
      </p>
    </div>
  );
}
