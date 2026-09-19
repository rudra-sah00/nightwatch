'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FeatureErrorBoundary } from '@/components/ui/feature-error-boundary';
import { PlayerLoadingSkeleton } from '@/components/ui/PlayerLoadingSkeleton';
import { useClipRecorder } from '@/features/clips/hooks/use-clip-recorder';
import { fetchIptvResolve } from '@/features/livestream/api';
import { WatchLivePlayer } from '@/features/watch/components/WatchLivePlayer';
import type { VideoMetadata } from '@/features/watch/player/context/types';
import { isTV } from '@/platforms/smart-tv/lib/detection';
import { TvWatch } from '@/platforms/smart-tv/pages/TvWatch';

export default function LiveMatchPlayerPage() {
  return (
    <FeatureErrorBoundary feature="Livestream Player">
      <LiveChannelPlayerContent />
    </FeatureErrorBoundary>
  );
}

/**
 * Live channel player.
 *
 * The route id is an IPTV channel id, resolved to a stream URL on demand because the
 * upstream URLs are short-lived. Both callers — LiveClient's "Watch Solo" and TvLive —
 * pass `?type=iptv&title=…`, and `poster` when the channel has an icon.
 *
 * This page used to branch on that `type` param, with the other half rendering a
 * sports-match scoreboard fed by `/api/livestream/match/:id`. That route was removed
 * from the backend along with the rest of the sports endpoints, so the branch resolved
 * to null forever — and no caller could reach it anyway, since both always pass
 * `type=iptv`. A URL without the param now resolves as a channel and falls through to
 * the unavailable state, rather than rendering a match page that could never load.
 */
function LiveChannelPlayerContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const channelId = params.id as string;
  const titleFromRoute = searchParams.get('title')?.trim() ?? '';
  const poster = searchParams.get('poster') ?? null;
  const t = useTranslations('live');

  const { data: resolvedUrl = null, isLoading: resolving } = useQuery({
    queryKey: ['live', 'iptv-resolve', channelId],
    queryFn: () => fetchIptvResolve(channelId),
  });

  const title = titleFromRoute || 'Live TV';

  const clip = useClipRecorder({
    matchId: channelId,
    title: titleFromRoute || 'Live Clip',
    streamToken: null,
    streamUrl: resolvedUrl,
  });

  if (resolving) return <PlayerLoadingSkeleton />;

  if (!resolvedUrl) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-background text-foreground px-4">
        <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-4 text-neo-red">
          {t('streamUnavailableHeading')}
        </h2>
        <Link href="/live">
          <Button
            variant="default"
            className="px-8 py-4 h-auto text-lg font-bold font-headline uppercase tracking-widest"
          >
            <ArrowLeft className="mr-3 w-5 h-5 stroke-[4px]" />{' '}
            {t('backToSchedule')}
          </Button>
        </Link>
      </div>
    );
  }

  if (isTV()) {
    return (
      <TvWatch
        streamUrl={resolvedUrl}
        title={title}
        isLive
        isClipping={clip.isRecording}
        clipDuration={clip.duration}
        onClipStart={clip.start}
        onClipStop={clip.stop}
      />
    );
  }

  const metadata: VideoMetadata = {
    movieId: channelId,
    title,
    type: 'livestream',
    posterUrl: poster || undefined,
  };

  return (
    <div className="min-h-screen bg-background">
      <title>{`${title} — Nightwatch`}</title>
      <WatchLivePlayer
        streamUrl={resolvedUrl}
        metadata={metadata}
        secondaryPosterUrl={null}
      />
      <section className="md:hidden px-4 py-4 space-y-4 bg-background text-foreground border-t border-border/60 min-h-[60vh]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-black font-headline uppercase tracking-tight truncate">
              {title}
            </h1>
            <p className="text-xs text-muted-foreground font-headline uppercase tracking-widest mt-1">
              IPTV
            </p>
          </div>
          <Badge variant="red" className="animate-pulse shrink-0">
            {t('liveStream')}
          </Badge>
        </div>
      </section>
    </div>
  );
}
