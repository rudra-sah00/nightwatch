'use client';

import { Play } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { CricketMatchInfo, LiveMatch } from '../api';
import { useLiveMatchCard } from '../hooks/use-live-match-card';
import { LiveMatchModal } from './LiveMatchModal';

/** Format cricket innings score e.g. "212/5 (17.3 ov)" */
function formatCricketScore(info: CricketMatchInfo | undefined): string {
  if (!info?.crtRunsScored) return '-';
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
  compact?: boolean;
}

function asText(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    const maybe = value as { name?: unknown; title?: unknown; id?: unknown };
    if (typeof maybe.name === 'string') return maybe.name;
    if (typeof maybe.title === 'string') return maybe.title;
    if (typeof maybe.id === 'string' || typeof maybe.id === 'number') {
      return String(maybe.id);
    }
  }
  return fallback;
}

export function LiveMatchCard({ match, compact }: LiveMatchCardProps) {
  const {
    isLive,
    isEnded,
    isUpcoming,
    canWatch,
    formattedTime,
    showPrompt,
    setShowPrompt,
    isCreatingParty,
    handleWatchSolo,
    handleWatchParty,
  } = useLiveMatchCard(match);

  const t = useTranslations('live');

  const isLivestream =
    match.id.startsWith('live-server1') || match.id.startsWith('lt:');
  const isChannelCard =
    match.contentKind === 'channel' ||
    match.type === 'all_channels' ||
    isLivestream;
  const isChannelOffline = isChannelCard && match.channelStatus === 'offline';
  const providerName = isLivestream ? t('liveTV') : t('sportsToday');
  const team1Name = asText(match.team1?.name, t('teamFallback1'));
  const team2Name = asText(match.team2?.name, t('teamFallback2'));
  const leagueName = asText(match.league) || asText(match.type);
  const channelName = asText(match.channelName) || team1Name;

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

  if (compact) {
    return (
      <>
        {matchModal}
        <button
          type="button"
          onClick={() => setShowPrompt(true)}
          className="group bg-card border-[3px] border-border p-3 flex flex-col items-center gap-2 hover:bg-accent transition-colors rounded-md cursor-pointer text-center"
        >
          <div className="w-12 h-12 bg-card border-[2px] border-border overflow-hidden flex items-center justify-center p-1 rounded-full">
            {match.team1.avatar ? (
              <img
                src={match.team1.avatar}
                alt={channelName}
                className="w-full h-full object-contain bg-white"
              />
            ) : (
              <div className="w-full h-full bg-secondary rounded-full" />
            )}
          </div>
          <p className="font-headline font-black text-[10px] uppercase tracking-wider text-foreground truncate w-full leading-tight">
            {channelName}
          </p>
          <span className="px-2 py-0.5 bg-neo-red text-white text-[8px] font-black uppercase tracking-widest border-[1px] border-border font-headline rounded-sm">
            {t('liveNow')}
          </span>
        </button>
      </>
    );
  }

  return (
    <>
      {matchModal}
      <div className="group bg-card border-[3px] border-border p-4 flex flex-col md:flex-row items-center gap-6 hover:bg-accent transition-colors rounded-md overflow-hidden">
        {/* 1. Time / Status / League (Left) */}
        <div className="flex flex-col items-center md:items-start w-full md:w-32 flex-shrink-0">
          {isLive ? (
            <div className="animate-pulse mb-1">
              <span className="px-3 py-1 bg-neo-red text-white text-[10px] font-black uppercase tracking-widest border-[2px] border-border font-headline rounded-md">
                {t('liveNow')}
              </span>
            </div>
          ) : isUpcoming ? (
            <span className="text-sm font-black uppercase tracking-widest text-foreground font-headline tabular-nums bg-secondary px-2 py-1 border-[2px] border-border mb-1 rounded-md">
              {formattedTime}
            </span>
          ) : (
            <span className="text-sm font-black uppercase tracking-widest text-foreground/60 font-headline mb-1">
              {t('final')}
            </span>
          )}

          <div className="flex flex-col items-center md:items-start gap-1 w-full mt-2">
            {leagueName && leagueName.trim() !== '' && (
              <span className="px-2 py-0.5 bg-secondary border-[2px] border-border text-[10px] font-bold uppercase tracking-[0.1em] text-foreground truncate max-w-full rounded-sm">
                {leagueName}
              </span>
            )}
            <span
              className={`text-[9px] font-black uppercase tracking-tighter ${
                isLivestream ? 'text-neo-blue' : 'text-[#ffcc00]'
              }`}
            >
              {providerName}
            </span>
          </div>
        </div>

        {/* 2. Teams / Channel (Center) */}
        <div className="flex flex-1 items-center justify-center gap-4 w-full min-w-0">
          {isChannelCard ? (
            <div className="flex w-full items-center justify-between gap-4 min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-card border-[2px] border-border flex-shrink-0 overflow-hidden flex items-center justify-center p-1 rounded-full">
                  {match.team1.avatar ? (
                    <img
                      src={match.team1.avatar}
                      alt={channelName}
                      className="w-full h-full object-contain bg-white"
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary rounded-full" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-headline font-black text-sm md:text-lg uppercase truncate text-foreground">
                    {channelName}
                  </p>
                  {isChannelOffline ? (
                    <span className="inline-block px-2 py-0.5 bg-muted text-muted-foreground text-[9px] font-black uppercase tracking-widest border-[1px] border-border font-headline rounded-sm mt-1">
                      {t('channelOffline')}
                    </span>
                  ) : isChannelCard ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest font-headline mt-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      {t('channelOnline')}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Team 1 */}
              <div className="flex flex-1 items-center justify-end gap-2 md:gap-3 text-right min-w-0">
                <div className="flex flex-col items-end min-w-0">
                  <span className="font-headline font-black text-[11px] sm:text-sm md:text-lg uppercase truncate max-w-full text-foreground">
                    {team1Name}
                  </span>
                  {(isLive || isEnded) && (
                    <span
                      aria-live="polite"
                      className="text-sm md:text-base font-black font-headline tabular-nums text-[#e63b2e] mt-1"
                    >
                      {match.type === 'cricket'
                        ? getCricketScore(match, 1)
                        : match.team1.score}
                    </span>
                  )}
                </div>
                <div className="w-10 h-10 md:w-14 md:h-14 bg-card border-[2px] border-border flex-shrink-0 overflow-hidden flex items-center justify-center p-1 rounded-full">
                  {match.team1.avatar ? (
                    <img
                      src={match.team1.avatar}
                      alt={team1Name}
                      className="w-full h-full object-contain bg-white"
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary rounded-full" />
                  )}
                </div>
              </div>

              {/* VS Badge */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center -mt-2">
                <span className="text-sm md:text-lg font-black italic text-muted-foreground font-headline bg-secondary px-2 py-1 rounded-md border border-border/20">
                  VS
                </span>
              </div>

              {/* Team 2 */}
              <div className="flex flex-1 items-center justify-start gap-2 md:gap-3 text-left min-w-0">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-card border-[2px] border-border flex-shrink-0 overflow-hidden flex items-center justify-center p-1 rounded-full">
                  {match.team2.avatar ? (
                    <img
                      src={match.team2.avatar}
                      alt={match.team2.name}
                      className="w-full h-full object-contain bg-white"
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary rounded-full" />
                  )}
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className="font-headline font-black text-[11px] sm:text-sm md:text-lg uppercase truncate max-w-full text-foreground">
                    {team2Name}
                  </span>
                  {(isLive || isEnded) && (
                    <span
                      aria-live="polite"
                      className="text-sm md:text-base font-black font-headline tabular-nums text-[#e63b2e] mt-1"
                    >
                      {match.type === 'cricket'
                        ? getCricketScore(match, 2)
                        : match.team2.score}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 3. Action Button (Right) */}
        <div className="w-full md:w-auto flex-shrink-0 flex justify-end mt-4 md:mt-0">
          <button
            type="button"
            onClick={() => setShowPrompt(true)}
            disabled={isChannelOffline}
            className={cn(
              'w-full md:w-auto md:min-w-[120px] md:max-w-[192px] md:px-6 h-12 md:h-16 flex items-center justify-center gap-3 font-black font-headline text-base md:text-xl uppercase tracking-[0.2em] border-[3px] md:border-[4px] border-border transition-colors rounded-md whitespace-nowrap cursor-pointer',
              isChannelOffline
                ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
                : canWatch
                  ? 'bg-neo-red text-primary-foreground hover:bg-foreground hover:text-background'
                  : 'bg-card text-foreground hover:bg-accent',
            )}
          >
            <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
            {t('watch')}
          </button>
        </div>
      </div>
    </>
  );
}
