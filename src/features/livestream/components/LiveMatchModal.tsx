'use client';

import { Loader2, Play, Users, X } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { useSidebar } from '@/app/(protected)/(main)/layout';
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
    <div className="flex-1 flex flex-col items-center justify-center gap-3 md:gap-6 py-4 md:py-8 px-4">
      {/* Avatar */}
      <div className="relative w-14 h-14 md:w-32 md:h-32 bg-white border-[4px] border-border  flex items-center justify-center overflow-hidden">
        {team.avatar ? (
          <img
            src={team.avatar}
            alt={team.name}
            className="w-full h-full object-contain p-2 bg-white"
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
        <span className="text-2xl md:text-7xl font-black font-headline tracking-tighter text-foreground tabular-nums">
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

  return (
    <LiveMatchModalContent
      match={match}
      isCreatingParty={isCreatingParty}
      onClose={onClose}
      onWatchSolo={onWatchSolo}
      onWatchParty={onWatchParty}
      isMobile={isMobile}
    />
  );
}

function LiveMatchModalContent({
  match,
  isCreatingParty,
  onClose,
  onWatchSolo,
  onWatchParty,
  isMobile,
}: Omit<LiveMatchModalProps, 'isOpen'> & { isMobile: boolean }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const t = useTranslations('live');
  const format = useFormatter();
  const { setSidebarsDisabled } = useSidebar();

  // Disable sidebars while modal is open
  useEffect(() => {
    setSidebarsDisabled(true);
    document.body.style.overflow = 'hidden';
    return () => {
      setSidebarsDisabled(false);
      document.body.style.overflow = '';
    };
  }, [setSidebarsDisabled]);

  // Escape key to close + auto-focus on open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isLive = match.status === 'MatchIng';
  const isEnded = match.status === 'MatchEnded';
  const isUpcoming = match.status === 'MatchNotStart';
  const isLivestream = match.id.startsWith('live-server1');
  const providerName = isLivestream ? t('liveTV') : t('sportsToday');
  const canWatch =
    (isLive || isLivestream) &&
    (match.playType === 'PlayTypeVideo' ||
      isLivestream ||
      match.playType === 'hls');
  const team1Name = asText(match.team1?.name, t('teamFallback1'));
  const team2Name = asText(match.team2?.name, t('teamFallback2'));
  const leagueName = asText(match.league);
  const typeName = asText(match.type);
  const timeDesc = asText(match.timeDesc);
  const isChannelCard =
    isLivestream ||
    match.contentKind === 'channel' ||
    typeName === 'all_channels';
  const channelTitle = asText(match.channelName) || team1Name;

  const safeTeam1 = {
    ...match.team1,
    name: team1Name,
    score: asText(match.team1?.score, '0'),
  };
  const safeTeam2 = {
    ...match.team2,
    name: team2Name,
    score: asText(match.team2?.score, '0'),
  };

  const startTime = new Date(match.startTime);
  const formattedTime = format.dateTime(startTime, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedDate = format.dateTime(startTime, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-x-0 bottom-0 top-[var(--electron-titlebar-height,0px)] z-[10000] bg-black/80 backdrop-blur-sm outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-match-modal-title"
    >
      <div className="relative w-full h-full overflow-y-auto bg-background flex flex-col no-scrollbar">
        {/* Header / Close button */}
        <div
          className="border-b-[4px] border-border bg-background flex justify-between items-center p-4 sticky top-0 z-20 [-webkit-app-region:drag]"
          style={{ paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))' }}
        >
          <div className="flex items-center gap-4">
            <span
              id="live-match-modal-title"
              className="font-headline font-black uppercase tracking-widest text-foreground text-lg"
            >
              {isChannelCard ? t('channelDetails') : t('matchDetails')}
            </span>
            <div
              className={`px-3 py-1 border border-gray-200 text-[10px] font-black font-headline uppercase tracking-[0.2em] rounded-md hidden sm:block ${
                isLivestream
                  ? 'bg-neo-blue text-primary-foreground'
                  : 'bg-neo-yellow text-foreground'
              }`}
            >
              {providerName}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border-[3px] border-border bg-neo-red text-primary-foreground hover:bg-primary hover:text-primary-foreground transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-blue focus-visible:ring-offset-2 [-webkit-app-region:no-drag]"
            aria-label={t('closeModal')}
          >
            <X className="w-5 h-5 stroke-[3px]" />
          </button>
        </div>

        {/* Hero — team panels */}
        <div className="relative w-full bg-background border-b-[4px] border-border">
          {isChannelCard ? (
            <div className="relative py-4 md:py-16">
              <div className="max-w-2xl mx-auto flex flex-col items-center gap-3 md:gap-5 px-4">
                <TeamPanel
                  team={safeTeam1}
                  score={safeTeam1.score}
                  isLive={false}
                  isEnded={false}
                />
                {isLive && (
                  <div className="flex items-center gap-2 bg-neo-red border-[3px] border-border px-3 py-1 ">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full bg-background opacity-75" />
                      <span className="relative inline-flex h-3 w-3 bg-background border-2 border-border" />
                    </span>
                    <span className="text-xs md:text-sm font-black font-headline text-primary-foreground uppercase tracking-widest">
                      {t('live')}
                    </span>
                  </div>
                )}
                {isUpcoming && (
                  <span className="text-xs md:text-sm font-black font-headline text-foreground bg-background border-[3px] border-border px-3 py-1 ">
                    {formattedTime}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="relative flex items-stretch py-4 md:py-16">
              <TeamPanel
                team={safeTeam1}
                score={safeTeam1.score}
                isLive={isLive}
                isEnded={isEnded}
              />

              {/* Centre column */}
              <div className="flex-shrink-0 w-24 md:w-48 flex flex-col items-center justify-center gap-4 relative z-10 px-2 lg:px-4">
                {/* LIVE badge */}
                {isLive && (
                  <div className="flex items-center gap-2 bg-neo-red border-[3px] border-border px-3 py-1 ">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full bg-background opacity-75" />
                      <span className="relative inline-flex h-3 w-3 bg-background border-2 border-border" />
                    </span>
                    <span className="text-xs md:text-sm font-black font-headline text-primary-foreground uppercase tracking-widest">
                      {t('live')}
                    </span>
                  </div>
                )}
                {isEnded && (
                  <span className="text-xs md:text-sm font-black font-headline text-foreground uppercase tracking-widest bg-neo-yellow border-[3px] border-border px-3 py-1 ">
                    {t('final')}
                  </span>
                )}
                {isUpcoming && (
                  <span className="text-xs md:text-sm font-black font-headline text-foreground bg-background border-[3px] border-border px-3 py-1 ">
                    {formattedTime}
                  </span>
                )}

                {/* VS */}
                <span className="text-xl md:text-6xl font-black font-headline text-foreground tracking-widest">
                  VS
                </span>

                {/* Live time desc */}
                {isLive && !isChannelCard && timeDesc && (
                  <span className="text-[10px] md:text-sm font-bold font-headline uppercase tracking-widest text-foreground text-center">
                    {timeDesc}
                  </span>
                )}
              </div>

              <TeamPanel
                team={safeTeam2}
                score={safeTeam2.score}
                isLive={isLive}
                isEnded={isEnded}
              />
            </div>
          )}
        </div>

        {/* Details section */}
        <div className="px-4 md:px-10 py-6 md:py-10 bg-background">
          <div className="max-w-3xl mx-auto space-y-6 md:space-y-10">
            {/* Title row */}
            <div className="text-center space-y-3 md:space-y-6">
              <h1 className="text-2xl md:text-4xl font-black font-headline text-foreground uppercase tracking-tighter leading-tight">
                {isChannelCard ? (
                  channelTitle
                ) : (
                  <>
                    {team1Name} <span className="text-neo-red">vs</span>{' '}
                    {team2Name}
                  </>
                )}
              </h1>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                {leagueName && (
                  <span className="bg-background border-[3px] border-border px-4 py-1.5 text-xs md:text-sm font-black font-headline tracking-widest uppercase text-foreground">
                    {leagueName}
                  </span>
                )}
                {isUpcoming && (
                  <span className="bg-background border-[3px] border-border px-4 py-1.5 text-xs md:text-sm font-black font-headline tracking-widest uppercase text-foreground">
                    {formattedDate} • {formattedTime}
                  </span>
                )}
                {typeName && typeName !== leagueName && (
                  <span className="text-foreground text-xs md:text-sm font-black font-headline uppercase tracking-widest border-[3px] border-border px-4 py-1.5 bg-neo-yellow">
                    {typeName}
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
                  'flex items-center justify-center gap-3 px-6 py-4 md:px-8 md:py-5 border-[4px] border-border font-black font-headline uppercase tracking-widest text-base md:text-lg transition-colors duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-blue focus-visible:ring-offset-2',
                  !canWatch
                    ? 'bg-background text-muted-foreground cursor-not-allowed opacity-70'
                    : 'bg-neo-yellow text-foreground hover:bg-neo-yellow/80',
                )}
                onClick={onWatchSolo}
                disabled={!canWatch}
              >
                <Play className="w-5 h-5 md:w-6 md:h-6 fill-current stroke-[3px]" />
                <span className="truncate">
                  {canWatch
                    ? t('watchSolo')
                    : isUpcoming
                      ? t('notStartedYet')
                      : t('streamUnavailable')}
                </span>
              </button>

              {/* Watch Party */}
              {!isMobile && (
                <button
                  type="button"
                  className={cn(
                    'w-full sm:w-auto sm:min-w-[220px] flex-1',
                    'flex items-center justify-center gap-3 px-6 py-4 md:px-8 md:py-5 border-[4px] border-border font-black font-headline uppercase tracking-widest text-base md:text-lg transition-colors duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-blue focus-visible:ring-offset-2',
                    isCreatingParty || !canWatch
                      ? 'bg-background text-muted-foreground cursor-not-allowed opacity-70'
                      : 'bg-primary text-primary-foreground hover:bg-neo-blue',
                  )}
                  onClick={onWatchParty}
                  disabled={isCreatingParty || !canWatch}
                >
                  {isCreatingParty ? (
                    <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Users className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
                  )}
                  <span className="truncate">
                    {isCreatingParty ? t('creating') : t('watchTogether')}
                  </span>
                </button>
              )}
            </div>

            {/* Mobile-only note */}
            {isMobile && (
              <p className="text-center text-sm font-black uppercase tracking-widest text-neo-red font-headline">
                {t('watchPartyDesktopOnly')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
