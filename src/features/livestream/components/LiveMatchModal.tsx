'use client';

import { Loader2, Play, Users, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-is-mobile';
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
  align,
}: {
  team: { id: string; name: string; score: string; avatar: string };
  score: string;
  isLive: boolean;
  isEnded: boolean;
  align: 'left' | 'right';
}) {
  const showScore = isLive || isEnded;

  return (
    <div
      className={`flex-1 flex flex-col items-center justify-center gap-6 py-8 px-4 ${
        align === 'left' ? 'border-r-[4px] border-[#1a1a1a]' : ''
      }`}
    >
      {/* Avatar */}
      <div className="relative w-20 h-20 md:w-32 md:h-32 bg-white border-[4px] border-[#1a1a1a] neo-shadow flex items-center justify-center overflow-hidden">
        {team.avatar ? (
          <img
            src={team.avatar}
            alt={team.name}
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <span className="text-3xl font-black font-headline text-[#1a1a1a] uppercase">
            {team.name.charAt(0)}
          </span>
        )}
      </div>

      {/* Name */}
      <p className="text-sm md:text-2xl font-black font-headline text-[#1a1a1a] text-center uppercase tracking-widest leading-tight">
        {team.name}
      </p>

      {/* Score */}
      {showScore && (
        <span className="text-4xl md:text-7xl font-black font-headline tracking-tighter text-[#1a1a1a] tabular-nums">
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
  const canWatch = isLive && match.playType === 'PlayTypeVideo';

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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white border-[4px] border-[#1a1a1a] neo-shadow flex flex-col no-scrollbar">
        {/* Header / Close button */}
        <div className="border-b-[4px] border-[#1a1a1a] bg-[#f5f0e8] flex justify-between items-center p-4 sticky top-0 z-20">
          <span className="font-headline font-black uppercase tracking-widest text-[#1a1a1a] text-lg">
            Match Details
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 border-[4px] border-[#1a1a1a] bg-[#e63b2e] text-white hover:bg-[#1a1a1a] hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[3px]" />
          </button>
        </div>

        {/* Hero — team panels */}
        <div className="relative w-full bg-[#f5f0e8] border-b-[4px] border-[#1a1a1a]">
          <div className="relative flex items-stretch py-8 md:py-16">
            <TeamPanel
              team={match.team1}
              score={match.team1.score}
              isLive={isLive}
              isEnded={isEnded}
              align="left"
            />

            {/* Centre column */}
            <div className="flex-shrink-0 w-24 md:w-48 flex flex-col items-center justify-center gap-4 relative z-10 px-2 lg:px-4">
              {/* LIVE badge */}
              {isLive && (
                <div className="flex items-center gap-2 bg-[#e63b2e] border-[3px] border-[#1a1a1a] px-3 py-1 neo-shadow-sm">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full bg-white opacity-75" />
                    <span className="relative inline-flex h-3 w-3 bg-white border-2 border-[#1a1a1a]" />
                  </span>
                  <span className="text-xs md:text-sm font-black font-headline text-white uppercase tracking-widest">
                    Live
                  </span>
                </div>
              )}
              {isEnded && (
                <span className="text-xs md:text-sm font-black font-headline text-[#1a1a1a] uppercase tracking-widest bg-[#ffcc00] border-[3px] border-[#1a1a1a] px-3 py-1 neo-shadow-sm">
                  Final
                </span>
              )}
              {isUpcoming && (
                <span className="text-xs md:text-sm font-black font-headline text-[#1a1a1a] bg-white border-[3px] border-[#1a1a1a] px-3 py-1 neo-shadow-sm">
                  {formattedTime}
                </span>
              )}

              {/* VS */}
              <span className="text-3xl md:text-6xl font-black font-headline text-[#1a1a1a] tracking-widest">
                VS
              </span>

              {/* Live time desc */}
              {isLive && match.timeDesc && (
                <span className="text-[10px] md:text-sm font-bold font-headline uppercase tracking-widest text-[#1a1a1a] text-center">
                  {match.timeDesc}
                </span>
              )}
            </div>

            <TeamPanel
              team={match.team2}
              score={match.team2.score}
              isLive={isLive}
              isEnded={isEnded}
              align="right"
            />
          </div>
        </div>

        {/* Details section */}
        <div className="px-6 md:px-10 py-10 bg-white">
          <div className="max-w-3xl mx-auto space-y-10">
            {/* Title row */}
            <div className="text-center space-y-6">
              <h1 className="text-2xl md:text-4xl font-black font-headline text-[#1a1a1a] uppercase tracking-tighter leading-tight">
                {match.team1.name} <span className="text-[#e63b2e]">vs</span>{' '}
                {match.team2.name}
              </h1>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {match.league && (
                  <span className="bg-white border-[3px] border-[#1a1a1a] px-4 py-1.5 text-xs md:text-sm font-black font-headline tracking-widest uppercase text-[#1a1a1a]">
                    {match.league}
                  </span>
                )}
                {isUpcoming && (
                  <span className="bg-[#f5f0e8] border-[3px] border-[#1a1a1a] px-4 py-1.5 text-xs md:text-sm font-black font-headline tracking-widest uppercase text-[#1a1a1a]">
                    {formattedDate} • {formattedTime}
                  </span>
                )}
                {match.type && match.type !== match.league && (
                  <span className="text-[#1a1a1a] text-xs md:text-sm font-black font-headline uppercase tracking-widest border-[3px] border-[#1a1a1a] px-4 py-1.5 bg-[#ffcc00]">
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
                onClick={onWatchSolo}
                disabled={!canWatch}
                className={`flex items-center justify-center gap-3 px-8 py-5 border-[4px] border-[#1a1a1a] font-black font-headline uppercase tracking-widest text-base md:text-lg transition-all duration-200 ${
                  canWatch
                    ? 'bg-[#ffcc00] text-[#1a1a1a] neo-shadow-hover hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-[#ffe066]'
                    : 'bg-[#f5f0e8] text-[#4a4a4a] cursor-not-allowed opacity-70 border-[#4a4a4a]'
                }`}
              >
                <Play className="w-5 h-5 md:w-6 md:h-6 fill-current stroke-[3px]" />
                {canWatch
                  ? 'Watch Solo'
                  : isUpcoming
                    ? 'Not Started Yet'
                    : 'Stream Unavailable'}
              </button>

              {/* Watch Party */}
              {!isMobile && (
                <button
                  type="button"
                  onClick={onWatchParty}
                  disabled={isCreatingParty || !canWatch}
                  className={`flex items-center justify-center gap-3 px-8 py-5 border-[4px] border-[#1a1a1a] font-black font-headline uppercase tracking-widest text-base md:text-lg transition-all duration-200 ${
                    canWatch && !isCreatingParty
                      ? 'bg-[#1a1a1a] text-white neo-shadow-hover hover:bg-[#0055ff] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                      : 'bg-[#f5f0e8] text-[#4a4a4a] cursor-not-allowed opacity-70 border-[#4a4a4a]'
                  }`}
                >
                  {isCreatingParty ? (
                    <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                  ) : (
                    <Users className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
                  )}
                  {isCreatingParty ? 'Creating...' : 'Start Party'}
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
