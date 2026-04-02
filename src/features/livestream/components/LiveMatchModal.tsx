'use client';

import { Loader2, Play, Users, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/utils';
import type { LiveMatch } from '../types';

interface LiveMatchModalProps {
  match: LiveMatch;
  isOpen: boolean;
  isCreatingParty: boolean;
  onClose: () => void;
  onWatchSolo: () => void;
  onWatchParty: () => void;
}

function TeamPanel({
  team,
  score,
  isLive,
  isEnded,
}: {
  team: { id: string; name: string; score: string; avatar: string };
  score: string;
  isLive: boolean;
  isEnded: boolean;
}) {
  const showScore = isLive || isEnded;

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8 px-4">
      {/* Avatar */}
      <div className="relative w-20 h-20 md:w-32 md:h-32 bg-white border-[4px] border-border  flex items-center justify-center overflow-hidden">
        {team.avatar ? (
          <img
            src={team.avatar}
            alt={team.name}
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <span className="text-3xl font-black font-headline text-foreground uppercase">
            {team.name.charAt(0)}
          </span>
        )}
      </div>

      {/* Name */}
      <p className="text-[11px] sm:text-sm md:text-2xl font-black font-headline text-foreground text-center uppercase tracking-widest leading-tight line-clamp-2 max-w-[120px] sm:max-w-[160px] md:max-w-[240px]">
        {team.name}
      </p>

      {/* Score */}
      {showScore && (
        <span className="text-4xl md:text-7xl font-black font-headline tracking-tighter text-foreground tabular-nums">
          {score || '0'}
        </span>
      )}
    </div>
  );
}

export function LiveMatchModal({
  match,
  isOpen,
  isCreatingParty,
  onClose,
  onWatchSolo,
  onWatchParty,
}: LiveMatchModalProps) {
  const isMobile = useIsMobile();

  if (!isOpen) return null;

  const isLive = match.status === 'MatchIng';
  const isEnded = match.status === 'MatchEnded';
  const isUpcoming = match.status === 'MatchNotStart';
  const isServer2 = match.id.startsWith('pm:');
  const providerName = isServer2 ? 'Private Server' : 'Sports Today';
  const canWatch = (isLive || isServer2) && match.playType === 'PlayTypeVideo';

  const startTime = new Date(match.startTime);
  const formattedTime = startTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedDate = startTime.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full h-full overflow-y-auto bg-white flex flex-col no-scrollbar">
        {/* Header / Close button */}
        <div className="border-b-[4px] border-border bg-background flex justify-between items-center p-4 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <span className="font-headline font-black uppercase tracking-widest text-foreground text-lg">
              Match Details
            </span>
            <div
              className={`px-3 py-1 border border-gray-200 text-[10px] font-black font-headline uppercase tracking-[0.2em] rounded-md hidden sm:block ${
                isServer2
                  ? 'bg-[#0055ff] text-white'
                  : 'bg-[#ffcc00] text-foreground'
              }`}
            >
              {providerName}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border-[3px] border-border bg-[#e63b2e] text-white hover:bg-[#1a1a1a] hover:text-white transition-all flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[3px]" />
          </button>
        </div>

        {/* Hero — team panels */}
        <div className="relative w-full bg-background border-b-[4px] border-border">
          <div className="relative flex items-stretch py-8 md:py-16">
            <TeamPanel
              team={match.team1}
              score={match.team1.score}
              isLive={isLive}
              isEnded={isEnded}
            />

            {/* Centre column */}
            <div className="flex-shrink-0 w-24 md:w-48 flex flex-col items-center justify-center gap-4 relative z-10 px-2 lg:px-4">
              {/* LIVE badge */}
              {isLive && (
                <div className="flex items-center gap-2 bg-[#e63b2e] border-[3px] border-border px-3 py-1 ">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full bg-white opacity-75" />
                    <span className="relative inline-flex h-3 w-3 bg-white border-2 border-border" />
                  </span>
                  <span className="text-xs md:text-sm font-black font-headline text-white uppercase tracking-widest">
                    Live
                  </span>
                </div>
              )}
              {isEnded && (
                <span className="text-xs md:text-sm font-black font-headline text-foreground uppercase tracking-widest bg-[#ffcc00] border-[3px] border-border px-3 py-1 ">
                  Final
                </span>
              )}
              {isUpcoming && (
                <span className="text-xs md:text-sm font-black font-headline text-foreground bg-white border-[3px] border-border px-3 py-1 ">
                  {formattedTime}
                </span>
              )}

              {/* VS */}
              <span className="text-3xl md:text-6xl font-black font-headline text-foreground tracking-widest">
                VS
              </span>

              {/* Live time desc */}
              {isLive && match.timeDesc && (
                <span className="text-[10px] md:text-sm font-bold font-headline uppercase tracking-widest text-foreground text-center">
                  {match.timeDesc}
                </span>
              )}
            </div>

            <TeamPanel
              team={match.team2}
              score={match.team2.score}
              isLive={isLive}
              isEnded={isEnded}
            />
          </div>
        </div>

        {/* Details section */}
        <div className="px-6 md:px-10 py-10 bg-white">
          <div className="max-w-3xl mx-auto space-y-10">
            {/* Title row */}
            <div className="text-center space-y-6">
              <h1 className="text-2xl md:text-4xl font-black font-headline text-foreground uppercase tracking-tighter leading-tight">
                {match.team1.name} <span className="text-[#e63b2e]">vs</span>{' '}
                {match.team2.name}
              </h1>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {match.league && (
                  <span className="bg-white border-[3px] border-border px-4 py-1.5 text-xs md:text-sm font-black font-headline tracking-widest uppercase text-foreground">
                    {match.league}
                  </span>
                )}
                {isUpcoming && (
                  <span className="bg-background border-[3px] border-border px-4 py-1.5 text-xs md:text-sm font-black font-headline tracking-widest uppercase text-foreground">
                    {formattedDate} • {formattedTime}
                  </span>
                )}
                {match.type && match.type !== match.league && (
                  <span className="text-foreground text-xs md:text-sm font-black font-headline uppercase tracking-widest border-[3px] border-border px-4 py-1.5 bg-[#ffcc00]">
                    {match.type}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* Watch Solo */}
              <button
                type="button"
                className={cn(
                  'w-full sm:w-auto sm:min-w-[220px] flex-1',
                  'flex items-center justify-center gap-3 px-6 py-4 md:px-8 md:py-5 border-[4px] border-border font-black font-headline uppercase tracking-widest text-base md:text-lg transition-all duration-200 whitespace-nowrap',
                  !canWatch
                    ? 'bg-background text-[#4a4a4a] cursor-not-allowed opacity-70'
                    : 'bg-[#ffcc00] text-foreground hover:bg-[#ffe066]',
                )}
                onClick={onWatchSolo}
                disabled={!canWatch}
              >
                <Play className="w-5 h-5 md:w-6 md:h-6 fill-current stroke-[3px]" />
                <span className="truncate">
                  {canWatch
                    ? 'Watch Solo'
                    : isUpcoming
                      ? 'Not Started Yet'
                      : 'Stream Unavailable'}
                </span>
              </button>

              {/* Watch Party */}
              {!isMobile && (
                <button
                  type="button"
                  className={cn(
                    'w-full sm:w-auto sm:min-w-[220px] flex-1',
                    'flex items-center justify-center gap-3 px-6 py-4 md:px-8 md:py-5 border-[4px] border-border font-black font-headline uppercase tracking-widest text-base md:text-lg transition-all duration-200 whitespace-nowrap',
                    isCreatingParty || !canWatch
                      ? 'bg-background text-[#4a4a4a] cursor-not-allowed opacity-70'
                      : 'bg-[#1a1a1a] text-white hover:bg-[#0055ff]',
                  )}
                  onClick={onWatchParty}
                  disabled={isCreatingParty || !canWatch}
                >
                  {isCreatingParty ? (
                    <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                  ) : (
                    <Users className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
                  )}
                  <span className="truncate">
                    {isCreatingParty ? 'Creating' : 'Watch Together'}
                  </span>
                </button>
              )}
            </div>

            {/* Mobile-only note */}
            {isMobile && (
              <p className="text-center text-sm font-black uppercase tracking-widest text-[#e63b2e] font-headline">
                Watch Party is only available on desktop.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
