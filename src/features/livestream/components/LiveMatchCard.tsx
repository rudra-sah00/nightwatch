'use client';

import { Clock, Loader2, Play, Tv, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { LiveMatch } from '../api';
import { useLiveMatchCard } from '../hooks/use-live-match-card';

interface LiveMatchCardProps {
  match: LiveMatch;
  variant?: 'featured' | 'compact';
}

export function LiveMatchCard({
  match,
  variant = 'compact',
}: LiveMatchCardProps) {
  const {
    isLive,
    isEnded,
    isUpcoming,
    canWatch,
    formattedTime,
    formattedDate,
    showPrompt,
    setShowPrompt,
    isCreatingParty,
    handleWatchClick,
    handleWatchSolo,
    handleWatchParty,
  } = useLiveMatchCard(match);

  const watchModeDialog = (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-sm bg-zinc-950 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">
            How do you want to watch?
          </DialogTitle>
          <DialogDescription className="text-center text-zinc-500 text-sm">
            {match.team1.name} vs {match.team2.name}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={handleWatchSolo}
            className="flex flex-col items-center gap-3 p-5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors group"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center transition-colors bg-[var(--live-bg)] group-hover:bg-[var(--live-bg-hover)]">
              <Tv className="w-5 h-5 text-live" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Watch Solo</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Just me</p>
            </div>
          </button>
          <button
            type="button"
            onClick={handleWatchParty}
            disabled={isCreatingParty}
            className="flex flex-col items-center gap-3 p-5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-500/50 transition-colors group disabled:opacity-60"
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center transition-colors bg-[var(--party-bg)] group-hover:bg-[var(--party-bg-hover)]">
              {isCreatingParty ? (
                <Loader2 className="w-5 h-5 text-party animate-spin" />
              ) : (
                <Users className="w-5 h-5 text-party" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Watch Party</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">With friends</p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (variant === 'featured') {
    return (
      <>
        {watchModeDialog}
        <button
          type="button"
          onClick={handleWatchClick}
          className={`group relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-800/80 border border-zinc-800/60 hover:border-zinc-700/80 transition-colors duration-500 min-w-[320px] snap-start w-full text-left ${canWatch ? 'cursor-pointer' : ''}`}
        >
          {/* Subtle animated glow for live matches */}
          {isLive && (
            <div className="absolute inset-0 rounded-2xl opacity-20 group-hover:opacity-30 transition-opacity duration-500 bg-gradient-to-br from-red-600/20 via-transparent to-transparent" />
          )}

          {/* Top header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div className="flex items-center gap-2">
              {isLive && (
                <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-live">
                  <span className="relative flex h-2 w-2">
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ backgroundColor: 'var(--live-color)' }}
                    />
                    <span
                      className="relative inline-flex rounded-full h-2 w-2"
                      style={{ backgroundColor: 'var(--live-color-strong)' }}
                    />
                  </span>
                  Live
                </span>
              )}
              {isUpcoming && (
                <span className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
                  <Clock className="w-3 h-3" />
                  {formattedTime}
                </span>
              )}
              {isEnded && (
                <span className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">
                  Final
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider truncate max-w-[120px]">
              {match.league || match.type}
            </span>
          </div>

          {/* Teams */}
          <div className="px-5 pb-5 pt-2 space-y-3">
            {/* Team 1 */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center overflow-hidden border border-zinc-700/50">
                {match.team1.avatar ? (
                  <img
                    src={match.team1.avatar}
                    alt={match.team1.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-zinc-500 font-bold">
                    T1
                  </span>
                )}
              </div>
              <span className="flex-1 text-sm font-medium text-zinc-200 truncate">
                {match.team1.name}
              </span>
              {!isUpcoming && (
                <span
                  className={`text-lg font-bold tabular-nums ${Number(match.team1.score) > Number(match.team2.score) ? 'text-white' : 'text-zinc-500'}`}
                >
                  {match.team1.score}
                </span>
              )}
            </div>

            {/* Team 2 */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-800 flex-shrink-0 flex items-center justify-center overflow-hidden border border-zinc-700/50">
                {match.team2.avatar ? (
                  <img
                    src={match.team2.avatar}
                    alt={match.team2.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <span className="text-[10px] text-zinc-500 font-bold">
                    T2
                  </span>
                )}
              </div>
              <span className="flex-1 text-sm font-medium text-zinc-200 truncate">
                {match.team2.name}
              </span>
              {!isUpcoming && (
                <span
                  className={`text-lg font-bold tabular-nums ${Number(match.team2.score) > Number(match.team1.score) ? 'text-white' : 'text-zinc-500'}`}
                >
                  {match.team2.score}
                </span>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          {canWatch && (
            <div className="border-t border-zinc-800/50 px-5 py-3 flex items-center justify-between bg-zinc-900/50">
              <span className="text-[11px] text-zinc-500">
                {match.timeDesc || 'In Progress'}
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-live group-hover:opacity-80 transition-opacity">
                <Play className="w-3 h-3 fill-current" />
                Watch Live
              </span>
            </div>
          )}
          {isUpcoming && (
            <div className="border-t border-zinc-800/50 px-5 py-3 bg-zinc-900/50">
              <span className="text-[11px] text-zinc-500">
                {formattedDate} • {formattedTime}
              </span>
            </div>
          )}
        </button>
      </>
    );
  }

  // Compact row variant — clean table-like row
  return (
    <>
      {watchModeDialog}
      <button
        type="button"
        onClick={handleWatchClick}
        className={`group flex items-center gap-4 px-4 py-3.5 rounded-xl transition-colors duration-200 w-full text-left ${
          isLive
            ? 'bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/40 hover:border-zinc-700/60'
            : 'hover:bg-zinc-900/40 border border-transparent'
        } ${canWatch ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {/* Time / Status column */}
        <div className="w-16 flex-shrink-0 text-center">
          {isLive ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-live">
              <span className="relative flex h-1.5 w-1.5">
                <span
                  className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{ backgroundColor: 'var(--live-color)' }}
                />
                <span
                  className="relative inline-flex rounded-full h-1.5 w-1.5"
                  style={{ backgroundColor: 'var(--live-color-strong)' }}
                />
              </span>
              Live
            </span>
          ) : isEnded ? (
            <span className="text-[11px] font-medium text-zinc-600 uppercase">
              FT
            </span>
          ) : (
            <span className="text-[11px] font-medium text-zinc-500">
              {formattedTime}
            </span>
          )}
        </div>

        {/* Teams column */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden border border-zinc-700/40">
              {match.team1.avatar ? (
                <img
                  src={match.team1.avatar}
                  alt=""
                  className="w-full h-full object-contain"
                />
              ) : null}
            </div>
            <span
              className={`text-sm truncate ${!isUpcoming && Number(match.team1.score) > Number(match.team2.score) ? 'text-white font-semibold' : 'text-zinc-300'}`}
            >
              {match.team1.name}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden border border-zinc-700/40">
              {match.team2.avatar ? (
                <img
                  src={match.team2.avatar}
                  alt=""
                  className="w-full h-full object-contain"
                />
              ) : null}
            </div>
            <span
              className={`text-sm truncate ${!isUpcoming && Number(match.team2.score) > Number(match.team1.score) ? 'text-white font-semibold' : 'text-zinc-300'}`}
            >
              {match.team2.name}
            </span>
          </div>
        </div>

        {/* Score column */}
        {(isLive || isEnded) && (
          <div className="flex-shrink-0 text-right space-y-1.5 min-w-[28px]">
            <p
              className={`text-sm tabular-nums ${Number(match.team1.score) > Number(match.team2.score) ? 'text-white font-bold' : 'text-zinc-400'}`}
            >
              {match.team1.score || '-'}
            </p>
            <p
              className={`text-sm tabular-nums ${Number(match.team2.score) > Number(match.team1.score) ? 'text-white font-bold' : 'text-zinc-400'}`}
            >
              {match.team2.score || '-'}
            </p>
          </div>
        )}

        {/* League tag */}
        <div className="w-24 flex-shrink-0 hidden md:block">
          <span className="text-[10px] text-zinc-600 uppercase tracking-wider truncate block text-right">
            {match.league || match.type}
          </span>
        </div>

        {/* Action */}
        {canWatch && (
          <div className="flex-shrink-0">
            <span className="flex items-center gap-1 text-xs font-semibold text-live opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-3 h-3 fill-current" />
            </span>
          </div>
        )}
      </button>
    </>
  );
}
