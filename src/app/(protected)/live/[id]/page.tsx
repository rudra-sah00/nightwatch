'use client';

import { ArrowLeft, Calendar, Loader2, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLiveMatch } from '@/features/livestream/hooks/use-livestreams';
import { WatchLivePlayer } from '@/features/watch/components/WatchLivePlayer';
import type { VideoMetadata } from '@/features/watch/player/context/types';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { useLiveMatchPlayer } from './use-live-match-player';

export default function LiveMatchPlayerPage() {
  const params = useParams();
  const matchId = params.id as string;
  const { match, isLoading, error } = useLiveMatch(matchId);
  const { isCreatingParty, handleCreateParty } = useLiveMatchPlayer(
    match ?? null,
    matchId,
  );
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-black text-white px-4">
        <h2 className="text-2xl font-bold mb-4">Stream Unavailable</h2>
        <p className="text-zinc-400 mb-8">
          {error?.message || 'Match not found or stream unavailable.'}
        </p>
        <Link href="/live">
          <Button variant="outline">
            <ArrowLeft className="mr-2 w-4 h-4" /> Back to Schedule
          </Button>
        </Link>
      </div>
    );
  }

  if (match.status === 'MatchNotStart') {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-900 flex flex-col items-center justify-center text-white">
        <Calendar className="w-16 h-16 text-zinc-600 mb-4" />
        <h2 className="text-3xl font-bold mb-2">Match Has Not Started</h2>
        <p className="text-zinc-400 mb-8">
          Please check back closer to the start time.
        </p>
        <Link href="/live">
          <Button variant="outline">
            <ArrowLeft className="mr-2 w-4 h-4" /> Back to Schedule
          </Button>
        </Link>
      </div>
    );
  }

  if (!match.playPath && match.status === 'MatchIng') {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-zinc-600 animate-spin mb-4" />
        <h2 className="text-2xl font-bold mb-2">Waiting for Feed...</h2>
        <p className="text-zinc-400">
          The stream URL has not been broadcasted by the source yet.
        </p>
      </div>
    );
  }

  // Build the proxy stream URL
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
  const streamUrl = match.playPath
    ? `${backendUrl}/api/livestream/playlist.m3u8?url=${encodeURIComponent(match.playPath)}&token=LIVESTREAM`
    : null;

  // Build metadata for the WatchPage component
  const metadata: VideoMetadata = {
    movieId: matchId,
    title: `${match.team1.name} vs ${match.team2.name}`,
    type: 'livestream',
    posterUrl: match.team1.avatar,
    providerId: 's1', // Force HLS engine
  };

  // Live match header content for mobile
  const mobileHeader = (
    <div className="flex items-center gap-3 ml-auto">
      {match.status === 'MatchIng' && (
        <Badge
          variant="destructive"
          className="animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)] border-none"
        >
          LIVE
        </Badge>
      )}
      <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-sm">
        <img
          src={match.team1.avatar}
          alt="T1"
          className="w-5 h-5 rounded-full"
        />
        {match.type === 'cricket' ? (
          <span className="font-medium text-xs max-w-[140px] truncate">
            {match.matchResult || `${match.team1.name} vs ${match.team2.name}`}
          </span>
        ) : (
          <>
            <span className="font-bold">{match.team1.score}</span>
            <span className="text-zinc-500">-</span>
            <span className="font-bold">{match.team2.score}</span>
          </>
        )}
        <img
          src={match.team2.avatar}
          alt="T2"
          className="w-5 h-5 rounded-full"
        />
      </div>
      {!isMobile && (
        <Button
          onClick={handleCreateParty}
          disabled={isCreatingParty}
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full gap-1.5 border border-indigo-500/50"
        >
          {isCreatingParty ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Users className="w-3.5 h-3.5" />
          )}
          Party
        </Button>
      )}
    </div>
  );

  return (
    <WatchLivePlayer
      streamUrl={streamUrl}
      metadata={metadata}
      mobileHeaderContent={mobileHeader}
    />
  );
}
