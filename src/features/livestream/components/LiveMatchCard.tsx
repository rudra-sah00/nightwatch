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
          className={`group bg-white border-[4px] border-[#1a1a1a] neo-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all duration-200 w-full text-left flex flex-col ${
            canWatch ? 'cursor-pointer' : 'cursor-default'
          }`}
        >
          {/* Top header bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b-[4px] border-[#1a1a1a] bg-[#f5f0e8]">
            <div className="flex items-center gap-3">
              {isLive && (
                <span className="flex items-center gap-2 text-sm font-black font-headline uppercase tracking-widest text-[#e63b2e]">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full bg-[#e63b2e] opacity-75" />
                    <span className="relative inline-flex h-3 w-3 bg-[#e63b2e] border-2 border-[#1a1a1a]" />
                  </span>
                  Live
                </span>
              )}
              {isUpcoming && (
                <span className="flex items-center gap-2 text-xs font-black font-headline uppercase tracking-widest text-[#1a1a1a]">
                  <Clock className="w-4 h-4 stroke-[3px]" />
                  {formattedTime}
                </span>
              )}
              {isEnded && (
                <span className="text-xs font-black font-headline uppercase tracking-widest text-[#1a1a1a] bg-[#ffcc00] px-2 py-0.5 border-2 border-[#1a1a1a]">
                  Final
                </span>
              )}
            </div>
            <span className="text-xs font-black font-headline uppercase tracking-widest text-[#1a1a1a] truncate max-w-[140px]">
              {match.league || match.type}
            </span>
          </div>

          {/* Teams */}
          <div className="px-5 py-6 space-y-5">
            {/* Team 1 */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-white border-[3px] border-[#1a1a1a]">
                  {match.team1.avatar ? (
                    <img
                      src={match.team1.avatar}
                      alt={match.team1.name}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-sm text-[#1a1a1a] font-black font-headline uppercase">
                      T1
                    </span>
                  )}
                </div>
                <span className="text-lg md:text-xl font-black font-headline uppercase tracking-tighter text-[#1a1a1a] truncate">
                  {match.team1.name}
                </span>
              </div>
              {!isUpcoming && (
                <span className="text-3xl font-black font-headline tracking-tighter text-[#1a1a1a] tabular-nums">
                  {match.type === 'cricket'
                    ? getCricketScore(match, 1)
                    : match.team1.score}
                </span>
              )}
            </div>

            {/* VS divider */}
            <div className="flex items-center gap-4">
              <div className="w-12 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-black font-headline text-[#1a1a1a] uppercase bg-[#ffcc00] px-2 py-0.5 border-2 border-[#1a1a1a]">
                  VS
                </span>
              </div>
              <div className="flex-1 h-1 bg-[#1a1a1a]" />
            </div>

            {/* Team 2 */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center bg-white border-[3px] border-[#1a1a1a]">
                  {match.team2.avatar ? (
                    <img
                      src={match.team2.avatar}
                      alt={match.team2.name}
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-sm text-[#1a1a1a] font-black font-headline uppercase">
                      T2
                    </span>
                  )}
                </div>
                <span className="text-lg md:text-xl font-black font-headline uppercase tracking-tighter text-[#1a1a1a] truncate">
                  {match.team2.name}
                </span>
              </div>
              {!isUpcoming && (
                <span className="text-3xl font-black font-headline tracking-tighter text-[#1a1a1a] tabular-nums">
                  {match.type === 'cricket'
                    ? getCricketScore(match, 2)
                    : match.team2.score}
                </span>
              )}
            </div>
          </div>

          {/* Bottom bar */}
          {canWatch && (
            <div className="border-t-[4px] border-[#1a1a1a] px-5 py-4 flex items-center justify-between bg-[#1a1a1a] mt-auto">
              <span className="text-xs font-black font-headline uppercase tracking-widest text-[#f5f0e8]">
                {match.timeDesc || 'In Progress'}
              </span>
              <span className="flex items-center gap-2 text-sm font-black font-headline uppercase tracking-widest text-[#0055ff] bg-white px-3 py-1 border-[3px] border-[#1a1a1a] group-hover:bg-[#ffcc00] group-hover:text-[#1a1a1a] transition-colors">
                <Play className="w-4 h-4 fill-current stroke-[3px]" />
                Watch
              </span>
            </div>
          )}
          {isUpcoming && (
            <div className="border-t-[4px] border-[#1a1a1a] bg-[#f5f0e8] px-5 py-4 mt-auto">
              <span className="text-xs font-black font-headline uppercase tracking-widest text-[#1a1a1a]">
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
      {matchModal}
      <button
        type="button"
        onClick={handleWatchClick}
        className={`group flex items-center gap-4 px-6 py-4 transition-all duration-200 w-full text-left bg-white hover:bg-[#ffcc00] ${
          canWatch ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        {/* Time / Status column */}
        <div className="w-16 flex-shrink-0 text-center">
          {isLive ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#e63b2e] font-headline bg-white px-2 py-0.5 border-2 border-[#1a1a1a]">
              Liv
            </span>
          ) : isEnded ? (
            <span className="text-xs font-black uppercase tracking-widest text-[#1a1a1a] font-headline bg-[#ffcc00] px-2 py-0.5 border-2 border-[#1a1a1a]">
              Fin
            </span>
          ) : (
            <span className="text-xs font-black uppercase tracking-widest text-[#1a1a1a] font-headline tabular-nums">
              {formattedTime}
            </span>
          )}
        </div>

        {/* Vertical separator */}
        <div className="w-[3px] h-10 bg-[#1a1a1a] flex-shrink-0" />

        {/* Teams column */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-white border-2 border-[#1a1a1a] flex-shrink-0 overflow-hidden flex items-center justify-center">
              {match.team1.avatar ? (
                <img
                  src={match.team1.avatar}
                  alt=""
                  className="w-full h-full object-contain p-0.5"
                />
              ) : null}
            </div>
            <span className="text-sm font-black uppercase tracking-widest text-[#1a1a1a] font-headline truncate">
              {match.team1.name}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-white border-2 border-[#1a1a1a] flex-shrink-0 overflow-hidden flex items-center justify-center">
              {match.team2.avatar ? (
                <img
                  src={match.team2.avatar}
                  alt=""
                  className="w-full h-full object-contain p-0.5"
                />
              ) : null}
            </div>
            <span className="text-sm font-black uppercase tracking-widest text-[#1a1a1a] font-headline truncate">
              {match.team2.name}
            </span>
          </div>
        </div>

        {/* Score column */}
        {(isLive || isEnded) && (
          <div className="flex-shrink-0 text-right space-y-2 min-w-[32px]">
            <p className="text-sm tabular-nums text-[#1a1a1a] font-headline font-black">
              {match.type === 'cricket'
                ? getCricketScore(match, 1)
                : match.team1.score || '-'}
            </p>
            <p className="text-sm tabular-nums text-[#1a1a1a] font-headline font-black">
              {match.type === 'cricket'
                ? getCricketScore(match, 2)
                : match.team2.score || '-'}
            </p>
          </div>
        )}

        {/* League tag */}
        <div className="w-24 flex-shrink-0 hidden md:block">
          <span className="text-[10px] text-[#4a4a4a] bg-white border-2 border-[#1a1a1a] px-2 py-0.5 uppercase tracking-widest font-headline font-black truncate block text-center">
            {match.league || match.type}
          </span>
        </div>

        {/* Action */}
        {canWatch && (
          <div className="flex-shrink-0 pl-2">
            <span className="flex items-center justify-center w-8 h-8 bg-white border-[3px] border-[#1a1a1a] text-[#1a1a1a] group-hover:bg-[#1a1a1a] group-hover:text-white transition-colors">
              <Play className="w-4 h-4 fill-current stroke-[3px]" />
            </span>
          </div>
        )}
      </button>
    </>
  );
}
