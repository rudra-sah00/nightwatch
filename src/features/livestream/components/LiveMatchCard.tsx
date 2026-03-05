'use client';

import { Clock, Play } from 'lucide-react';
import type { CricketMatchInfo, LiveMatch } from '../api';
import { useLiveMatchCard } from '../hooks/use-live-match-card';
import { LiveMatchModal } from './LiveMatchModal';

/** Format cricket innings score e.g. "212/5 (17.3 ov)" */
function formatCricketScore(info: CricketMatchInfo | undefined): string {
  if (!info || !info.crtRunsScored) return '-';
  const runs = info.crtRunsScored;
  const wickets = info.crtWicketsLost;
  const overs = info.crtOvers;
  const balls = info.crtOversExtraBalls;
  let score = wickets ? `${runs}/${wickets}` : runs;
  if (overs) {
    const ballStr = balls && balls !== '0' ? `.${balls}` : '';
    score += ` (${overs}${ballStr} ov)`;
  }
  return score;
}

function getCricketScore(match: LiveMatch, team: 1 | 2): string {
  const info = team === 1 ? match.teamMatchInfo1 : match.teamMatchInfo2;
  return formatCricketScore(info);
}

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

  const matchModal = (
    <LiveMatchModal
      match={match}
      isOpen={showPrompt}
      isCreatingParty={isCreatingParty}
      onClose={() => setShowPrompt(false)}
      onWatchSolo={handleWatchSolo}
      onWatchParty={handleWatchParty}
    />
  );

  if (variant === 'featured') {
    return (
      <>
        {matchModal}
        <button
          type="button"
          onClick={handleWatchClick}
          className={`group relative rounded-xl overflow-hidden bg-zinc-900/80 border border-zinc-800/50 hover:border-zinc-700/70 transition-all duration-300 w-full text-left ${canWatch ? 'cursor-pointer' : ''}`}
        >
          {/* Subtle animated glow for live matches */}
          {isLive && (
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/8 via-transparent to-transparent" />
              <div className="absolute -inset-px rounded-xl border border-red-500/10" />
            </div>
          )}

          {/* Top header bar */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2.5">
            <div className="flex items-center gap-2.5">
              {isLive && (
                <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-live">
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
                <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-[0.12em]">
                  Final
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider truncate max-w-[140px] bg-zinc-800/40 px-2.5 py-0.5 rounded-full">
              {match.league || match.type}
            </span>
          </div>

          {/* Separator */}
          <div className="mx-5 h-px bg-zinc-800/40" />

          {/* Teams */}
          <div className="px-5 py-4 space-y-3">
            {/* Team 1 */}
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-zinc-800/60 flex-shrink-0 flex items-center justify-center overflow-hidden border border-zinc-700/30">
                {match.team1.avatar ? (
                  <img
                    src={match.team1.avatar}
                    alt={match.team1.name}
                    className="w-full h-full object-contain p-0.5"
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
                <span className="text-xl font-bold tabular-nums tracking-tight text-white">
                  {match.type === 'cricket'
                    ? getCricketScore(match, 1)
                    : match.team1.score}
                </span>
              )}
            </div>

            {/* VS divider */}
            <div className="flex items-center gap-3 pl-[3.25rem]">
              <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">
                vs
              </span>
              <div className="flex-1 h-px bg-zinc-800/30" />
            </div>

            {/* Team 2 */}
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-zinc-800/60 flex-shrink-0 flex items-center justify-center overflow-hidden border border-zinc-700/30">
                {match.team2.avatar ? (
                  <img
                    src={match.team2.avatar}
                    alt={match.team2.name}
                    className="w-full h-full object-contain p-0.5"
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
                <span className="text-xl font-bold tabular-nums tracking-tight text-white">
                  {match.type === 'cricket'
                    ? getCricketScore(match, 2)
                    : match.team2.score}
                </span>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          {canWatch && (
            <div className="border-t border-zinc-800/40 px-5 py-3 flex items-center justify-between bg-zinc-800/15">
              <span className="text-[11px] text-zinc-500">
                {match.timeDesc || 'In Progress'}
              </span>
              <span className="flex items-center gap-2 text-xs font-semibold text-live group-hover:translate-x-0.5 transition-transform duration-200">
                <Play className="w-3 h-3 fill-current" />
                Watch Live
              </span>
            </div>
          )}
          {isUpcoming && (
            <div className="border-t border-zinc-800/40 px-5 py-3 bg-zinc-800/15">
              <span className="text-[11px] text-zinc-500">
                {formattedDate} · {formattedTime}
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
      {matchModal}
      <button
        type="button"
        onClick={handleWatchClick}
        className={`group flex items-center gap-4 px-5 py-4 transition-all duration-200 w-full text-left ${
          isLive
            ? 'bg-zinc-900/30 hover:bg-zinc-800/40'
            : 'hover:bg-zinc-800/20'
        } ${canWatch ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {/* Time / Status column */}
        <div className="w-14 flex-shrink-0 text-center">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-live">
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
            <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
              FT
            </span>
          ) : (
            <span className="text-[11px] font-medium text-zinc-500 tabular-nums">
              {formattedTime}
            </span>
          )}
        </div>

        {/* Vertical separator */}
        <div className="w-px h-8 bg-zinc-800/40 flex-shrink-0" />

        {/* Teams column */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-zinc-800/60 flex-shrink-0 overflow-hidden border border-zinc-700/30">
              {match.team1.avatar ? (
                <img
                  src={match.team1.avatar}
                  alt=""
                  className="w-full h-full object-contain"
                />
              ) : null}
            </div>
            <span className="text-sm truncate text-zinc-300">
              {match.team1.name}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-zinc-800/60 flex-shrink-0 overflow-hidden border border-zinc-700/30">
              {match.team2.avatar ? (
                <img
                  src={match.team2.avatar}
                  alt=""
                  className="w-full h-full object-contain"
                />
              ) : null}
            </div>
            <span className="text-sm truncate text-zinc-300">
              {match.team2.name}
            </span>
          </div>
        </div>

        {/* Score column */}
        {(isLive || isEnded) && (
          <div className="flex-shrink-0 text-right space-y-2 min-w-[32px]">
            <p className="text-sm tabular-nums text-white font-bold">
              {match.type === 'cricket'
                ? getCricketScore(match, 1)
                : match.team1.score || '-'}
            </p>
            <p className="text-sm tabular-nums text-zinc-400">
              {match.type === 'cricket'
                ? getCricketScore(match, 2)
                : match.team2.score || '-'}
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
            <span className="flex items-center gap-1 text-xs font-semibold text-live opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5">
              <Play className="w-3 h-3 fill-current" />
            </span>
          </div>
        )}
      </button>
    </>
  );
}
