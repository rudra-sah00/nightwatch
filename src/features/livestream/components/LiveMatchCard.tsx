'use client';

import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      <div className="group bg-white border-[3px] border-border p-4 flex flex-col md:flex-row items-center gap-6 hover:bg-[#f8f9fa] transition-colors rounded-md">
        {/* 1. Time / Status / League (Left) */}
        <div className="flex flex-col items-center md:items-start w-full md:w-32 flex-shrink-0">
          {isLive ? (
            <div className="animate-pulse mb-1">
              <span className="px-3 py-1 bg-[#e63b2e] text-white text-[10px] font-black uppercase tracking-widest border-[2px] border-border font-headline rounded-md">
                Live Now
              </span>
            </div>
          ) : isUpcoming ? (
            <span className="text-sm font-black uppercase tracking-widest text-foreground font-headline tabular-nums bg-gray-100 px-2 py-1 border-[2px] border-border mb-1 rounded-md">
              {formattedTime}
            </span>
          ) : (
            <span className="text-sm font-black uppercase tracking-widest text-foreground/60 font-headline mb-1">
              Final
            </span>
          )}

          <div className="flex flex-col items-center md:items-start gap-1 w-full mt-2">
            <span className="px-2 py-0.5 bg-gray-100 border-[2px] border-border text-[10px] font-bold uppercase tracking-[0.1em] text-foreground truncate max-w-full rounded-sm">
              {match.league || match.type}
            </span>
            <span
              className={`text-[9px] font-black uppercase tracking-tighter ${
                isServer2 ? 'text-[#0055ff]' : 'text-[#ffcc00]'
              }`}
            >
              {providerName}
            </span>
          </div>
        </div>

        {/* 2. Teams (Center) */}
        <div className="flex flex-1 items-center justify-center gap-4 w-full">
          {/* Team 1 */}
          <div className="flex flex-1 items-center justify-end gap-2 md:gap-3 text-right min-w-0">
            <div className="flex flex-col items-end min-w-0">
              <span className="font-headline font-black text-[11px] sm:text-sm md:text-lg uppercase max-w-[80px] sm:max-w-[140px] md:max-w-[200px] truncate text-foreground">
                {match.team1.name}
              </span>
              {(isLive || isEnded) && (
                <span className="text-sm md:text-base font-black font-headline tabular-nums text-[#e63b2e] mt-1">
                  {match.type === 'cricket'
                    ? getCricketScore(match, 1)
                    : match.team1.score}
                </span>
              )}
            </div>
            <div className="w-10 h-10 md:w-14 md:h-14 bg-white border-[2px] border-border flex-shrink-0 overflow-hidden flex items-center justify-center p-1 rounded-full">
              {match.team1.avatar ? (
                <img
                  src={match.team1.avatar}
                  alt={match.team1.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 rounded-full" />
              )}
            </div>
          </div>

          {/* VS Badge */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center -mt-2">
            <span className="text-sm md:text-lg font-black italic text-foreground/40 font-headline bg-gray-100 px-2 py-1 rounded-md border border-border/20">
              VS
            </span>
          </div>

          {/* Team 2 */}
          <div className="flex flex-1 items-center justify-start gap-2 md:gap-3 text-left min-w-0">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-white border-[2px] border-border flex-shrink-0 overflow-hidden flex items-center justify-center p-1 rounded-full">
              {match.team2.avatar ? (
                <img
                  src={match.team2.avatar}
                  alt={match.team2.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 rounded-full" />
              )}
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className="font-headline font-black text-[11px] sm:text-sm md:text-lg uppercase max-w-[80px] sm:max-w-[140px] md:max-w-[200px] truncate text-foreground">
                {match.team2.name}
              </span>
              {(isLive || isEnded) && (
                <span className="text-sm md:text-base font-black font-headline tabular-nums text-[#e63b2e] mt-1">
                  {match.type === 'cricket'
                    ? getCricketScore(match, 2)
                    : match.team2.score}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Action Button (Right) */}
        <div className="w-full md:w-auto flex-shrink-0 flex justify-end mt-4 md:mt-0">
          <Button
            onClick={handleWatchClick}
            disabled={!canWatch}
            variant={canWatch ? 'neo-red' : 'neo-outline'}
            className="w-full md:w-48 h-12 md:h-16 flex items-center justify-center gap-3 font-black font-headline text-base md:text-xl uppercase tracking-[0.2em] border-[3px] md:border-[4px] border-border transition-all hover:bg-[#1a1a1a] hover:text-white"
          >
            <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
            Watch
          </Button>
        </div>
      </div>
    </>
  );
}
