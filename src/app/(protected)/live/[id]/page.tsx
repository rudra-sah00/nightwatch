'use client';

import { ArrowLeft, Calendar, Loader2, Trophy, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLiveMatchPlayer } from '@/features/livestream/hooks/use-live-match-player';
import { useLiveMatch } from '@/features/livestream/hooks/use-livestreams';
import { WatchLivePlayer } from '@/features/watch/components/WatchLivePlayer';
import type { VideoMetadata } from '@/features/watch/player/context/types';
import { env } from '@/lib/env';

export default function LiveMatchPlayerPage() {
  const params = useParams();
  const matchId = params.id as string;
  const { match, isLoading, error } = useLiveMatch(matchId);
  const { isCreatingParty, handleCreateParty } = useLiveMatchPlayer(
    match ?? null,
    matchId,
  );

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 text-white animate-spin stroke-[3px]" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-[#f5f0e8] text-[#1a1a1a] px-4">
        <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-4">
          Stream Unavailable
        </h2>
        <p className="font-headline font-bold uppercase tracking-widest text-[#1a1a1a]/60 mb-8">
          {error?.message || 'Match not found or stream unavailable.'}
        </p>
        <Link href="/live">
          <Button className="bg-white text-[#1a1a1a] border-4 border-[#1a1a1a] neo-shadow-sm px-8 py-4 h-auto text-lg font-black font-headline uppercase tracking-widest hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
            <ArrowLeft className="mr-3 w-5 h-5 stroke-[4px]" /> Back to Schedule
          </Button>
        </Link>
      </div>
    );
  }

  if (match.status === 'MatchNotStart') {
    return (
      <div className="fixed inset-0 z-50 bg-[#f5f0e8] flex flex-col items-center justify-center text-[#1a1a1a]">
        <Calendar className="w-20 h-20 text-[#1a1a1a]/20 mb-6 stroke-[3px]" />
        <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-2 text-center px-4">
          Match Has Not Started
        </h2>
        <p className="font-headline font-bold uppercase tracking-widest text-[#1a1a1a]/60 mb-8 max-w-sm text-center px-4">
          Prepare for the event. Please check back closer to the scheduled start
          time.
        </p>
        <Link href="/live">
          <Button className="bg-[#ffcc00] text-[#1a1a1a] border-4 border-[#1a1a1a] neo-shadow-sm px-8 py-4 h-auto text-lg font-black font-headline uppercase tracking-widest hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
            <ArrowLeft className="mr-3 w-5 h-5 stroke-[4px]" /> Back to Schedule
          </Button>
        </Link>
      </div>
    );
  }

  if (!match.playPath && match.status === 'MatchIng') {
    return (
      <div className="fixed inset-0 z-50 bg-[#f5f0e8] flex flex-col items-center justify-center text-[#1a1a1a]">
        <Loader2 className="w-16 h-16 text-[#1a1a1a]/20 animate-spin mb-6 stroke-[3px]" />
        <h2 className="text-3xl font-black font-headline uppercase tracking-tighter mb-2">
          Waiting for Feed...
        </h2>
        <p className="font-headline font-bold uppercase tracking-widest text-[#1a1a1a]/60 max-w-xs text-center">
          The stream URL has not been broadcasted by the source yet.
        </p>
      </div>
    );
  }

  if (match.status === 'MatchEnded') {
    return (
      <div className="fixed inset-0 z-50 bg-[#f5f0e8] flex flex-col items-center justify-center text-[#1a1a1a]">
        <Trophy className="w-20 h-20 text-[#ffcc00] mb-6 stroke-[3px]" />
        <h2 className="text-4xl font-black font-headline uppercase tracking-tighter mb-2">
          Match Concluded
        </h2>
        <p className="font-headline font-bold uppercase tracking-widest text-[#1a1a1a]/60 mb-8 max-w-md text-center px-4">
          {match.matchResult ||
            `${match.team1.name} vs ${match.team2.name} has ended.`}
        </p>
        <Link href="/live">
          <Button className="bg-white text-[#1a1a1a] border-4 border-[#1a1a1a] neo-shadow-sm px-8 py-4 h-auto text-lg font-black font-headline uppercase tracking-widest hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
            <ArrowLeft className="mr-3 w-5 h-5 stroke-[4px]" /> Back to Schedule
          </Button>
        </Link>
      </div>
    );
  }

  // Build the proxy stream URL
  const streamUrl = match.playPath
    ? `${env.BACKEND_URL}/api/livestream/playlist.m3u8?url=${encodeURIComponent(match.playPath)}&token=LIVESTREAM`
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
          variant="red"
          className="animate-pulse shadow-[0_0_15px_rgba(230,59,46,0.6)]"
        >
          LIVE
        </Badge>
      )}
      <div className="flex items-center gap-2 bg-white border-[3px] border-[#1a1a1a] px-3 py-1 text-[#1a1a1a] neo-shadow-sm scale-90">
        <img
          src={match.team1.avatar}
          alt="T1"
          className="w-5 h-5 rounded-none border border-[#1a1a1a]"
        />
        {match.type === 'cricket' ? (
          <span className="font-black font-headline uppercase text-[10px] max-w-[120px] truncate tracking-tight">
            {match.matchResult || `${match.team1.name} vs ${match.team2.name}`}
          </span>
        ) : (
          <>
            <span className="font-black font-headline tabular-nums">
              {match.team1.score}
            </span>
            <span className="text-[#1a1a1a]/30 font-black">-</span>
            <span className="font-black font-headline tabular-nums">
              {match.team2.score}
            </span>
          </>
        )}
        <img
          src={match.team2.avatar}
          alt="T2"
          className="w-5 h-5 rounded-none border border-[#1a1a1a]"
        />
      </div>
      <Button
        onClick={handleCreateParty}
        disabled={isCreatingParty}
        size="sm"
        className="bg-[#0055ff] hover:bg-[#3377ff] text-white rounded-none border-[3px] border-[#1a1a1a] gap-1.5 font-headline font-black uppercase tracking-widest neo-shadow-sm h-8"
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
      streamUrl={streamUrl}
      metadata={metadata}
      mobileHeaderContent={mobileHeader}
    />
  );
}
