'use client';

import { ArrowLeft, Calendar, Loader2, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLiveMatchPlayer } from '@/features/livestream/hooks/use-live-match-player';
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
  const { isCreatingParty, handleCreateParty } = useLiveMatchPlayer(
    match ?? null,
    matchId,
  );

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

  if (sessionLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 text-white animate-spin stroke-[3px]" />
      </div>
    );
  }

  if (sessionError) {
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
    team2Name.toUpperCase() === 'STREAM' ||
    team2Name.toLowerCase() === 'live stream' ||
    isGenericLivePair;

  let displayTitle = '';

  if (isChannelCard) {
    displayTitle = channelLabel || team1Name;
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
        {activeMatch.type === 'cricket' ? (
          <span className="font-black font-headline uppercase text-[10px] max-w-[120px] truncate tracking-tight">
            {activeMatch.matchResult || displayTitle}
          </span>
        ) : (
          <>
            <span className="font-black font-headline tabular-nums">
              {activeMatch.team1.score}
            </span>
            <span className="text-foreground/30 font-black">-</span>
            <span className="font-black font-headline tabular-nums">
              {activeMatch.team2.score}
            </span>
          </>
        )}
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
      <Button
        onClick={handleCreateParty}
        disabled={isCreatingParty}
        size="sm"
        className="bg-[#0055ff] hover:bg-[#3377ff] text-white rounded-none border-[3px] border-border gap-1.5 font-headline font-black uppercase tracking-widest  h-8"
      >
        {isCreatingParty ? (
          <Loader2 className="w-3 h-3 animate-spin stroke-[3px]" />
        ) : (
          <Users className="w-3.5 h-3.5 stroke-[3px]" />
        )}
        <span className="hidden sm:inline">Party</span>
      </Button>
    </div>
  );

  return (
    <WatchLivePlayer
      streamUrl={sessionUrl}
      metadata={metadata}
      mobileHeaderContent={mobileHeader}
    />
  );
}
