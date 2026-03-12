'use client';

import { Loader2, Play, Radio, Users, X } from 'lucide-react';
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
      className={`flex-1 flex flex-col items-center justify-center gap-4 py-8 px-4 ${
        align === 'left' ? 'border-r border-white/5' : 'border-l border-white/5'
      }`}
    >
      {/* Avatar */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full blur-2xl opacity-30 bg-white/20" />
        <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-2xl overflow-hidden bg-zinc-800/60 border border-white/10 flex items-center justify-center shadow-2xl">
          {team.avatar ? (
            <img
              src={team.avatar}
              alt={team.name}
              className="w-full h-full object-contain p-2"
            />
          ) : (
            <span className="text-2xl font-bold text-zinc-500">
              {team.name.charAt(0)}
            </span>
          )}
        </div>
      </div>

      {/* Name */}
      <p className="text-sm md:text-base font-semibold text-white text-center leading-tight max-w-[120px]">
        {team.name}
      </p>

      {/* Score */}
      {showScore && (
        <span
          className={`text-3xl md:text-5xl font-black tabular-nums tracking-tight ${
            Number(score) > 0 ? 'text-white' : 'text-zinc-500'
          }`}
        >
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
      className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="fixed top-4 right-4 z-50 p-3 rounded-full bg-background/50 backdrop-blur-md hover:bg-muted transition-colors border border-border"
        aria-label="Close"
      >
        <X className="w-6 h-6 text-foreground" />
      </button>

      {/* Hero — team panels */}
      <div className="relative w-full h-[50vh] md:h-[55vh] bg-zinc-950 overflow-hidden">
        {/* Ambient glows behind each team */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-0 inset-y-0 w-1/2 bg-gradient-to-r from-blue-900/10 via-transparent to-transparent" />
          <div className="absolute right-0 inset-y-0 w-1/2 bg-gradient-to-l from-live/10 via-transparent to-transparent" />
        </div>
        {/* Bottom gradient fade into content */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />

        <div className="relative h-full flex items-stretch">
          {/* Team 1 */}
          <TeamPanel
            team={match.team1}
            score={match.team1.score}
            isLive={isLive}
            isEnded={isEnded}
            align="left"
          />

          {/* Centre column */}
          <div className="flex-shrink-0 w-24 md:w-36 flex flex-col items-center justify-center gap-3 relative z-10">
            {/* LIVE badge */}
            {isLive && (
              <div className="flex items-center gap-1.5 bg-live-strong/15 border border-live-strong/30 px-2.5 py-1 rounded-full">
                <Radio className="w-3 h-3 text-live animate-pulse" />
                <span className="text-[10px] font-bold text-live uppercase tracking-widest">
                  Live
                </span>
              </div>
            )}
            {isEnded && (
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-800/60 px-2.5 py-1 rounded-full border border-zinc-700/40">
                Final
              </span>
            )}
            {isUpcoming && (
              <span className="text-[10px] font-medium text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded-full">
                {formattedTime}
              </span>
            )}

            {/* VS */}
            <span className="text-3xl md:text-5xl font-black text-zinc-600 tracking-tighter select-none">
              VS
            </span>

            {/* Live time desc */}
            {isLive && match.timeDesc && (
              <span className="text-[10px] text-zinc-500 font-medium">
                {match.timeDesc}
              </span>
            )}
          </div>

          {/* Team 2 */}
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
      <div className="px-6 md:px-10 lg:px-16 py-6 bg-background">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Title row */}
          <div className="text-center space-y-1">
            <h1 className="text-xl md:text-3xl font-bold text-white">
              {match.team1.name} <span className="text-zinc-600">vs</span>{' '}
              {match.team2.name}
            </h1>
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 flex-wrap">
              {match.league && (
                <span className="bg-zinc-800/60 border border-zinc-700/40 px-2.5 py-0.5 rounded-full text-xs font-medium">
                  {match.league}
                </span>
              )}
              {isUpcoming && (
                <span className="text-zinc-500 text-xs">
                  {formattedDate} · {formattedTime}
                </span>
              )}
              {match.type && match.type !== match.league && (
                <span className="text-zinc-600 text-xs uppercase tracking-wider">
                  {match.type}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {/* Watch Solo — always visible */}
            <button
              type="button"
              onClick={onWatchSolo}
              disabled={!canWatch}
              className={`flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-semibold text-base transition-all duration-200 ${
                canWatch
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20'
                  : 'bg-zinc-800/60 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-5 h-5 fill-current" />
              {canWatch
                ? 'Watch Solo'
                : isUpcoming
                  ? 'Not Started Yet'
                  : 'Stream Unavailable'}
            </button>

            {/* Watch Party — desktop only */}
            {!isMobile && (
              <button
                type="button"
                onClick={onWatchParty}
                disabled={isCreatingParty || !canWatch}
                className={`flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl font-semibold text-base transition-all duration-200 border ${
                  canWatch && !isCreatingParty
                    ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/25 hover:border-indigo-400/60'
                    : 'bg-zinc-800/40 border-zinc-700/30 text-zinc-600 cursor-not-allowed'
                }`}
              >
                {isCreatingParty ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Users className="w-5 h-5" />
                )}
                {isCreatingParty ? 'Creating...' : 'Watch Party'}
              </button>
            )}
          </div>

          {/* Mobile-only note */}
          {isMobile && (
            <p className="text-center text-xs text-zinc-600">
              Watch Party is only available on desktop.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
