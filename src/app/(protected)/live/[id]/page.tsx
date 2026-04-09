'use client';

import { ArrowLeft, Calendar, Loader2, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLiveMatch } from '@/features/livestream/hooks/use-livestreams';
import { playVideo } from '@/features/watch/api';
import { WatchLivePlayer } from '@/features/watch/components/WatchLivePlayer';
import type { VideoMetadata } from '@/features/watch/player/context/types';

export default function LiveMatchPlayerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const matchId = params.id as string;
  const titleFromRoute = searchParams.get('title')?.trim() ?? '';
  const { match, isLoading, error } = useLiveMatch(matchId);

  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (!match || !match.playPath || sessionUrl || sessionLoading) return;

    const initSession = async () => {
      setSessionLoading(true);
      try {
        const response = await playVideo({
          type: 'livestream',
          title: `${match.team1.name} vs ${match.team2.name}`,
          movieId: match.playPath!,
        });

        if (response.success && response.masterPlaylistUrl) {
          setSessionUrl(response.masterPlaylistUrl);
        } else {
          setSessionError('Failed to initialize secure stream session.');
        }
      } catch (_err) {
        setSessionError('Error connecting to stream server.');
      } finally {
        setSessionLoading(false);
      }
    };

    initSession();
  }, [match, sessionUrl, sessionLoading]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 text-white animate-spin stroke-[3px]" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-black text-white px-4">
        <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-4 text-[#e63b2e]">
          Stream Unavailable
        </h2>
        <p className="font-headline font-bold uppercase tracking-widest text-white/60 mb-8 text-center max-w-md">
          {error?.message || 'Match not found or stream unavailable.'}
        </p>
        <Link href="/live">
          <Button className="bg-white text-black border-4 border-black  px-8 py-4 h-auto text-lg font-black font-headline uppercase tracking-widest transition-colors">
            <ArrowLeft className="mr-3 w-5 h-5 stroke-[4px]" /> Back to Schedule
          </Button>
        </Link>
      </div>
    );
  }

  // Guaranteed non-null from here
  const activeMatch = match;

  const isServer2 = activeMatch.id.startsWith('pm:');
  const isEffectivelyLive = activeMatch.status === 'MatchIng' || isServer2;

  if (activeMatch.status === 'MatchNotStart' && !isServer2) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white">
        <Calendar className="w-20 h-20 text-white/20 mb-6 stroke-[3px]" />
        <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-2 text-center px-4">
          Match Has Not Started
        </h2>
        <p className="font-headline font-bold uppercase tracking-widest text-white/60 mb-8 max-w-sm text-center px-4">
          Prepare for the event. Please check back closer to the scheduled start
          time.
        </p>
        <Link href="/live">
          <Button className="bg-[#ffcc00] text-black border-4 border-black  px-8 py-4 h-auto text-lg font-black font-headline uppercase tracking-widest transition-colors">
            <ArrowLeft className="mr-3 w-5 h-5 stroke-[4px]" /> Back to Schedule
          </Button>
        </Link>
      </div>
    );
  }

  if (!activeMatch.playPath && activeMatch.status === 'MatchIng') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white">
        <Loader2 className="w-16 h-16 text-white/20 animate-spin mb-6 stroke-[3px]" />
        <h2 className="text-3xl font-black font-headline uppercase tracking-tighter mb-2">
          Waiting for Feed...
        </h2>
        <p className="font-headline font-bold uppercase tracking-widest text-white/60 max-w-xs text-center">
          The stream URL has not been broadcasted by the source yet.
        </p>
      </div>
    );
  }

  if (activeMatch.status === 'MatchEnded') {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white">
        <Trophy className="w-20 h-20 text-[#ffcc00] mb-6 stroke-[3px]" />
        <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-2">
          Match Concluded
        </h2>
        <p className="font-headline font-bold uppercase tracking-widest text-white/60 mb-8 max-w-md text-center px-4">
          {activeMatch.matchResult ||
            `${activeMatch.team1.name} vs ${activeMatch.team2.name} has ended.`}
        </p>
        <Link href="/live">
          <Button className="bg-white text-black border-4 border-black  px-8 py-4 h-auto text-lg font-black font-headline uppercase tracking-widest transition-colors">
            <ArrowLeft className="mr-3 w-5 h-5 stroke-[4px]" /> Back to Schedule
          </Button>
        </Link>
      </div>
    );
  }

  if (!sessionLoading && sessionError) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-black text-white px-4">
        <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-4 text-[#e63b2e]">
          Access Denied
        </h2>
        <p className="font-headline font-bold uppercase tracking-widest text-white/60 mb-8 text-center max-w-md">
          {sessionError}
        </p>
        <Link href="/live">
          <Button className="bg-white text-black border-4 border-black  px-8 py-4 h-auto text-lg font-black font-headline uppercase tracking-widest transition-colors">
            <ArrowLeft className="mr-3 w-5 h-5 stroke-[4px]" /> Back to Schedule
          </Button>
        </Link>
      </div>
    );
  }

  const team1Name = activeMatch.team1.name;
  const team2Name = activeMatch.team2.name;
  const normalizedTeam1 = team1Name.trim().toUpperCase();
  const normalizedTeam2 = team2Name.trim().toUpperCase();
  const normalizedTeam2Lower = team2Name.trim().toLowerCase();
  const isGenericLivePair =
    normalizedTeam1 === 'LIVE' &&
    (normalizedTeam2 === 'STREAM' ||
      normalizedTeam2 === 'LIVE STREAM' ||
      normalizedTeam2 === '');
  const channelLabelCandidates = [
    activeMatch.channelName,
    titleFromRoute,
    activeMatch.league,
    activeMatch.timeDesc,
  ]
    .map((value) => value?.trim())
    .filter((value): value is string => {
      if (!value) return false;
      const normalized = value.toUpperCase();
      return (
        normalized !== 'LIVE' &&
        normalized !== 'STREAM' &&
        normalized !== 'LIVE STREAM'
      );
    });
  const channelLabel = channelLabelCandidates[0] ?? '';
  const isChannelCard =
    activeMatch.contentKind === 'channel' ||
    activeMatch.type === 'all_channels' ||
    normalizedTeam2 === 'STREAM' ||
    normalizedTeam2Lower === 'live stream' ||
    normalizedTeam2 === '' ||
    normalizedTeam2 === 'TBA' ||
    normalizedTeam2Lower === 'team 2' ||
    isGenericLivePair;

  const channelDisplayName = channelLabel || team1Name || 'LIVE STREAM';

  let displayTitle = '';

  if (isChannelCard) {
    displayTitle = channelDisplayName;
  } else if (
    team1Name.toUpperCase() === 'LIVE' &&
    team2Name.toUpperCase() === 'STREAM'
  ) {
    displayTitle = channelLabel || 'LIVE STREAM';
  } else {
    const isChannelOrEvent =
      !team2Name ||
      team2Name.toLowerCase() === 'team 2' ||
      team2Name.toUpperCase() === 'TBA' ||
      team2Name.toUpperCase() === 'STREAM' ||
      team1Name === team2Name;

    displayTitle = isChannelOrEvent
      ? team1Name
      : `${team1Name} vs ${team2Name}`;
  }

  const metadata: VideoMetadata = {
    movieId: matchId,
    title: displayTitle,
    type: 'livestream',
    posterUrl: activeMatch.team1.avatar,
    providerId: 's1', // Force HLS engine
  };

  const mobileHeader = (
    <div className="flex items-center gap-3 ml-auto">
      {isEffectivelyLive && (
        <Badge variant="red" className="animate-pulse">
          LIVE
        </Badge>
      )}
      {isChannelCard ? (
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-3 py-1 text-foreground scale-90 max-w-[180px]">
          {activeMatch.team1.avatar ? (
            <img
              src={activeMatch.team1.avatar}
              alt={channelDisplayName}
              className="w-5 h-5 rounded-none border border-border"
            />
          ) : (
            <span className="w-5 h-5 flex items-center justify-center font-black text-[10px] bg-background border border-border">
              {channelDisplayName.charAt(0)}
            </span>
          )}
          <span className="font-black font-headline uppercase text-[10px] max-w-[120px] truncate tracking-tight">
            {channelDisplayName}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-3 py-1 text-foreground scale-90">
          {activeMatch.team1.avatar ? (
            <img
              src={activeMatch.team1.avatar}
              alt={activeMatch.team1.name}
              className="w-5 h-5 rounded-none border border-border"
            />
          ) : (
            <span className="w-5 h-5 flex items-center justify-center font-black text-[10px] bg-background border border-border">
              {activeMatch.team1.name.charAt(0)}
            </span>
          )}
          <span className="font-black font-headline uppercase text-[10px] max-w-[120px] truncate tracking-tight">
            VS
          </span>
          {activeMatch.team2.avatar ? (
            <img
              src={activeMatch.team2.avatar}
              alt={activeMatch.team2.name}
              className="w-5 h-5 rounded-none border border-border"
            />
          ) : (
            <span className="w-5 h-5 flex items-center justify-center font-black text-[10px] bg-background border border-border">
              {activeMatch.team2.name.charAt(0)}
            </span>
          )}
        </div>
      )}
    </div>
  );

  const startLabel = new Date(activeMatch.startTime).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-background">
      <WatchLivePlayer
        streamUrl={sessionUrl}
        metadata={metadata}
        mobileHeaderContent={mobileHeader}
        mobileLayout="inline"
      />

      <section className="md:hidden px-4 py-4 space-y-4 bg-background text-foreground border-t border-border/60">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-black font-headline uppercase tracking-tight truncate">
              {displayTitle}
            </h1>
            <p className="text-xs text-muted-foreground font-headline uppercase tracking-widest mt-1 truncate">
              {activeMatch.league} · {startLabel}
            </p>
          </div>
          {isEffectivelyLive ? (
            <Badge variant="red" className="animate-pulse shrink-0">
              LIVE
            </Badge>
          ) : null}
        </div>

        <div className="bg-card border border-border rounded-md p-3 shadow-[0_1px_0_0_rgba(0,0,0,0.06)]">
          {isChannelCard ? (
            <div className="flex items-center gap-3 min-w-0">
              {activeMatch.team1.avatar ? (
                <img
                  src={activeMatch.team1.avatar}
                  alt={channelDisplayName}
                  className="w-9 h-9 rounded-sm border border-border shrink-0"
                />
              ) : (
                <span className="w-9 h-9 flex items-center justify-center text-[11px] font-black bg-muted rounded-sm border border-border shrink-0">
                  {channelDisplayName.charAt(0)}
                </span>
              )}
              <span className="text-sm font-black font-headline uppercase truncate">
                {channelDisplayName}
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
                {activeMatch.team1.avatar ? (
                  <img
                    src={activeMatch.team1.avatar}
                    alt={activeMatch.team1.name}
                    className="w-9 h-9 rounded-sm border border-border"
                  />
                ) : (
                  <span className="w-9 h-9 flex items-center justify-center text-[11px] font-black bg-muted rounded-sm border border-border">
                    {activeMatch.team1.name.charAt(0)}
                  </span>
                )}
                <span className="text-sm font-black font-headline uppercase truncate max-w-[120px] text-center">
                  {activeMatch.team1.name}
                </span>
              </div>

              <span className="font-black font-headline text-sm uppercase tracking-widest text-muted-foreground">
                VS
              </span>

              <div className="flex flex-col items-center gap-2 min-w-0 flex-1">
                {activeMatch.team2.avatar ? (
                  <img
                    src={activeMatch.team2.avatar}
                    alt={activeMatch.team2.name}
                    className="w-9 h-9 rounded-sm border border-border"
                  />
                ) : (
                  <span className="w-9 h-9 flex items-center justify-center text-[11px] font-black bg-muted rounded-sm border border-border">
                    {activeMatch.team2.name.charAt(0)}
                  </span>
                )}
                <span className="text-sm font-black font-headline uppercase truncate max-w-[120px] text-center">
                  {activeMatch.team2.name}
                </span>
              </div>
            </div>
          )}
        </div>

        {activeMatch.matchResult ? (
          <p className="text-xs text-muted-foreground font-headline uppercase tracking-wider leading-relaxed">
            {activeMatch.matchResult}
          </p>
        ) : null}
      </section>
    </div>
  );
}
