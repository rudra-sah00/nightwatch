'use client';

import { Play } from 'lucide-react';
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
}

export function LiveMatchCard({ match }: LiveMatchCardProps) {
  const {
    isLive,
    isEnded,
    isUpcoming,
    canWatch,
    formattedTime,
    showPrompt,
    setShowPrompt,
    isCreatingParty,
    handleWatchClick,
    handleWatchSolo,
    handleWatchParty,
  } = useLiveMatchCard(match);

  const isServer2 = match.id.startsWith('pm:');
  const providerName = isServer2 ? 'Private Server' : 'Sports Today';

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

  return (
    <>
      {matchModal}
      <div className="group relative bg-white border-b-[3px] border-[#1a1a1a]/10 hover:bg-[#f5f0e8] transition-colors">
        <div className="flex items-center gap-4 px-6 py-5">
          {/* Status Column */}
          <div className="w-20 flex-shrink-0">
            {isLive ? (
              <div className="flex flex-col items-center">
                <span className="px-2 py-0.5 bg-[#e63b2e] text-white text-[10px] font-black uppercase tracking-widest border-2 border-[#1a1a1a] neo-shadow-sm font-headline">
                  Live
                </span>
                <span
                  className={`mt-1.5 text-[8px] font-black uppercase tracking-tighter ${
                    isServer2 ? 'text-[#0055ff]' : 'text-[#ffcc00]'
                  }`}
                >
                  {providerName}
                </span>
              </div>
            ) : isUpcoming ? (
              <span className="text-xs font-black uppercase tracking-widest text-[#1a1a1a] font-headline tabular-nums block text-center">
                {formattedTime}
              </span>
            ) : (
              <span className="text-xs font-black uppercase tracking-widest text-[#1a1a1a]/40 font-headline block text-center">
                Final
              </span>
            )}
          </div>

          <div className="w-[3px] h-12 bg-[#1a1a1a] hidden sm:block" />

          {/* Teams Column */}
          <div className="flex-grow min-w-0 grid grid-cols-1 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-white border-2 border-[#1a1a1a] flex-shrink-0 overflow-hidden flex items-center justify-center p-0.5 neo-shadow-sm">
                {match.team1.avatar ? (
                  <img
                    src={match.team1.avatar}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                ) : null}
              </div>
              <span className="text-sm font-black uppercase tracking-tight text-[#1a1a1a] font-headline truncate">
                {match.team1.name}
              </span>
              {(isLive || isEnded) && (
                <span className="ml-auto text-sm font-black font-headline tabular-nums">
                  {match.type === 'cricket'
                    ? getCricketScore(match, 1)
                    : match.team1.score}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-white border-2 border-[#1a1a1a] flex-shrink-0 overflow-hidden flex items-center justify-center p-0.5 neo-shadow-sm">
                {match.team2.avatar ? (
                  <img
                    src={match.team2.avatar}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                ) : null}
              </div>
              <span className="text-sm font-black uppercase tracking-tight text-[#1a1a1a] font-headline truncate">
                {match.team2.name}
              </span>
              {(isLive || isEnded) && (
                <span className="ml-auto text-sm font-black font-headline tabular-nums">
                  {match.type === 'cricket'
                    ? getCricketScore(match, 2)
                    : match.team2.score}
                </span>
              )}
            </div>
          </div>

          <div className="w-32 flex-shrink-0 hidden lg:flex items-center justify-center">
            <span className="px-3 py-1 bg-white border-2 border-[#1a1a1a] text-[10px] font-black uppercase tracking-[0.1em] font-headline neo-shadow-sm">
              {match.league || match.type}
            </span>
          </div>

          {/* Action Button */}
          <div className="w-24 flex-shrink-0 flex justify-end">
            <button
              type="button"
              onClick={handleWatchClick}
              className={`group/watch flex items-center gap-2 px-4 py-2 border-[3px] border-[#1a1a1a] font-black font-headline uppercase text-[10px] tracking-widest transition-all ${
                canWatch
                  ? 'bg-gradient-to-r from-[#e63b2e] to-[#ff6b00] text-white neo-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                  : 'bg-[#f5f0e8] text-[#1a1a1a]/40 cursor-not-allowed opacity-50'
              }`}
            >
              <Play className="w-3 h-3 fill-current transition-transform group-hover/watch:scale-110" />
              Watch
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
