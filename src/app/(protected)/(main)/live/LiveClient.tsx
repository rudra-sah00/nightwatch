'use client';

import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Radio,
  Search,
} from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LiveMatchSkeleton } from '@/components/ui/skeletons';
import { LiveMatchCard } from '@/features/livestream/components/LiveMatchCard';
import { useChannels } from '@/features/livestream/hooks/use-channels';
import { useLivestreams } from '@/features/livestream/hooks/use-livestreams';
import { useSports } from '@/features/livestream/hooks/use-sports';
import type { LiveMatch } from '@/features/livestream/types';
import { useLiveContent } from './use-live-content';

function LiveContent() {
  const [isSportMenuOpen, setIsSportMenuOpen] = useState(false);
  const [server1Search, setServer1Search] = useState('');
  const t = useTranslations('live');
  const format = useFormatter();

  const {
    activeTab,
    activeServer,
    isPending,
    handleTabChange,
    handleServerChange,
  } = useLiveContent();

  const { sports } = useSports();
  const { schedule, isLoading, error, refresh } = useLivestreams(activeTab);

  const isAllChannelsView = activeTab === 'all_channels';

  // Separate live, upcoming, and ended matches
  const endedMatches = schedule.filter((m) => m.status === 'MatchEnded');

  // Group BOTH Live and Upcoming matches by date
  const activeMatches = schedule.filter(
    (m) => m.status === 'MatchIng' || m.status === 'MatchNotStart',
  );

  const upcomingByDate = activeMatches.reduce(
    (acc, match) => {
      const date = format.dateTime(new Date(match.startTime), {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(match);
      return acc;
    },
    {} as Record<string, typeof activeMatches>,
  );

  const activeSport = sports.find((s) => s.id === activeTab);

  return (
    <div className="min-h-full pb-32 overflow-x-hidden">
      {/* Hero Header — clean, no controls */}
      <div className="mb-8 bg-neo-yellow relative overflow-hidden rounded-2xl">
        <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-10" />
        <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-red border-[4px] border-border opacity-20 rotate-12" />

        <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-foreground font-headline uppercase leading-none mb-4">
            {t('heroTitle')}
            <br />
            <span className="bg-background px-4 inline-block border-[4px] border-border -rotate-1 ml-2 mt-2">
              {t('heroTitleStream')}
            </span>
          </h1>
          <p className="font-headline font-bold uppercase tracking-widest text-foreground bg-background inline-block px-4 py-2 border-[3px] border-border">
            {t('heroSubtitle')}
          </p>
        </div>
      </div>

      {/* Controls Bar — server toggle + sport selector */}
      <div className="container mx-auto px-6 md:px-10 mb-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Server Toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleServerChange('1')}
              className={`px-5 py-3 font-headline font-black text-sm uppercase tracking-widest border-[3px] border-border rounded-md transition-colors cursor-pointer ${
                activeServer === '1'
                  ? 'bg-foreground text-background'
                  : 'bg-background text-foreground hover:bg-muted'
              }`}
            >
              Server 1
            </button>
            <button
              type="button"
              onClick={() => handleServerChange('2')}
              className={`px-5 py-3 font-headline font-black text-sm uppercase tracking-widest border-[3px] border-border rounded-md transition-colors cursor-pointer ${
                activeServer === '2'
                  ? 'bg-foreground text-background'
                  : 'bg-background text-foreground hover:bg-muted'
              }`}
            >
              Server 2
            </button>
          </div>

          {/* Sport Selector — Server 1 only */}
          {activeServer === '1' && (
            <div className="relative flex-grow min-w-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsSportMenuOpen(!isSportMenuOpen)}
                aria-haspopup="menu"
                aria-expanded={isSportMenuOpen}
                aria-controls="live-sport-menu"
                className="flex items-center justify-between gap-4 px-5 py-3 font-headline font-black text-sm uppercase tracking-widest transition-colors duration-200 border-[3px] border-border w-full bg-background text-foreground hover:bg-muted cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-blue focus-visible:ring-offset-2 min-w-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-3 h-3 bg-neo-red border-[2px] border-border rounded-full animate-pulse shrink-0" />
                  <span className="truncate">{activeSport?.label}</span>
                </div>
                <ChevronDown
                  className={`w-5 h-5 shrink-0 transition-transform duration-300 ${
                    isSportMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isSportMenuOpen && (
                <div
                  id="live-sport-menu"
                  role="menu"
                  className="absolute top-full left-0 right-0 mt-2 bg-background border-[3px] border-border z-50 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-200 motion-reduce:animate-none p-2 max-h-[400px] overflow-y-auto no-scrollbar rounded-md shadow-md"
                >
                  <div className="flex flex-col gap-1">
                    {sports.map((sport) => (
                      <button
                        type="button"
                        key={sport.id}
                        role="menuitem"
                        onClick={() => {
                          handleTabChange(sport.id);
                          setIsSportMenuOpen(false);
                        }}
                        className={`w-full px-5 py-3 font-headline font-bold text-sm uppercase tracking-widest border-[2px] border-border transition-colors text-left flex items-center justify-between cursor-pointer rounded-md focus-visible:outline-none focus-visible:bg-muted ${
                          activeTab === sport.id
                            ? 'bg-muted text-foreground'
                            : 'bg-background hover:bg-muted/80'
                        }`}
                      >
                        {sport.label}
                        {activeTab === sport.id && (
                          <div className="w-3 h-3 bg-primary rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 md:px-10">
        {activeServer === '2' ? (
          <Server2Channels />
        ) : isLoading || isPending ? (
          <div className="space-y-16">
            <section>
              <div className="h-10 w-48 bg-neo-red border-[4px] border-border  mb-8 animate-pulse" />
              <div className="flex flex-col gap-4">
                <LiveMatchSkeleton />
                <LiveMatchSkeleton />
                <LiveMatchSkeleton />
              </div>
            </section>
            <section>
              <div className="h-10 w-48 bg-neo-blue border-[4px] border-border  mb-8 animate-pulse" />
              <div className="flex flex-col gap-4">
                <LiveMatchSkeleton />
                <LiveMatchSkeleton />
                <LiveMatchSkeleton />
              </div>
            </section>
          </div>
        ) : error ? (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="bg-neo-red border-[4px] border-border  px-10 py-12 max-w-lg w-full flex flex-col items-center">
              <Radio className="w-12 h-12 text-foreground mb-6" />
              <p className="font-headline font-black text-2xl uppercase tracking-tighter text-foreground mb-8 bg-background px-4 py-2 border-[4px] border-border">
                {t('failedToLoadSchedule')}
              </p>
              <Button
                onClick={refresh}
                className="bg-background text-foreground border-[3px] border-border px-8 py-4 font-headline text-lg font-black uppercase tracking-widest transition-colors hover:bg-muted"
              >
                {t('tryAgain')}
              </Button>
            </div>
          </div>
        ) : schedule.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-background border-[4px] border-border  text-center max-w-2xl mx-auto">
            <Calendar className="w-20 h-20 text-neo-blue mb-6" />
            <h3 className="text-4xl font-black font-headline uppercase tracking-tighter text-foreground mb-4">
              {isAllChannelsView ? t('noChannelsFound') : t('noMatchesFound')}
            </h3>
            <p className="font-headline font-bold uppercase tracking-widest text-muted-foreground max-w-md">
              {isAllChannelsView
                ? t('noChannelsAvailable')
                : t('noMatchesScheduled', {
                    sport: activeSport?.label?.toLowerCase() || '',
                  })}
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {isAllChannelsView && (
              <section>
                <div className="relative w-full mb-8">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={server1Search}
                    onChange={(e) => setServer1Search(e.target.value)}
                    placeholder={t('searchChannels')}
                    className="w-full pl-12 pr-4 py-4 bg-background border-[3px] border-border font-headline font-bold text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-neo-blue rounded-md"
                  />
                </div>
                <div className="flex flex-col gap-4">
                  {(server1Search
                    ? schedule.filter((m) =>
                        (m.channelName || m.team1?.name || '')
                          .toLowerCase()
                          .includes(server1Search.toLowerCase()),
                      )
                    : schedule
                  ).map((match) => (
                    <LiveMatchCard key={match.id} match={match} />
                  ))}
                </div>
              </section>
            )}

            {!isAllChannelsView && (
              <>
                {Object.keys(upcomingByDate).length > 0 && (
                  <section>
                    <div className="flex items-center gap-4 mb-8 bg-neo-blue border-[4px] border-border px-5 py-3 inline-flex ">
                      <Clock className="w-6 h-6 text-primary-foreground stroke-[3px]" />
                      <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-primary-foreground font-headline">
                        {t('schedule')}
                      </h2>
                    </div>
                    <div className="space-y-8">
                      {Object.entries(upcomingByDate).map(([date, matches]) => {
                        const isToday =
                          format.dateTime(new Date(), {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          }) === date;
                        return (
                          <div key={date} className="mb-8">
                            <div className="px-6 py-4 bg-background border-[4px] border-border mb-6 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Calendar className="w-6 h-6 text-foreground stroke-[3px]" />
                                <span className="text-xl md:text-2xl font-black uppercase tracking-widest text-foreground font-headline mt-1">
                                  {isToday ? t('today') : date}
                                </span>
                              </div>
                              <span className="bg-primary text-neo-yellow px-3 py-1 text-sm font-black font-headline uppercase tracking-widest">
                                {matches.length}{' '}
                                {matches.length === 1
                                  ? t('match')
                                  : t('matches')}
                              </span>
                            </div>
                            <div className="flex flex-col gap-4">
                              {matches.map((match) => (
                                <LiveMatchCard key={match.id} match={match} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
                {endedMatches.length > 0 && (
                  <section>
                    <div className="flex items-center gap-4 mb-8 bg-primary border-[4px] border-border px-5 py-3 inline-flex ">
                      <CheckCircle2 className="w-6 h-6 text-primary-foreground stroke-[3px]" />
                      <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-primary-foreground font-headline">
                        {t('completed')}
                      </h2>
                      <span className="bg-secondary text-secondary-foreground px-3 py-1 border-[3px] border-border text-sm font-black font-headline uppercase tracking-widest">
                        {endedMatches.length}{' '}
                        {endedMatches.length === 1 ? t('match') : t('matches')}
                      </span>
                    </div>
                    <div className="bg-transparent">
                      <div className="flex flex-col gap-4">
                        {endedMatches.map((match) => (
                          <LiveMatchCard key={match.id} match={match} />
                        ))}
                      </div>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Converts a DB channel to a LiveMatch for the card component. */
function channelToMatch(ch: {
  id: string;
  providerId: string;
  name: string;
  category: string | null;
  icon: string | null;
  status?: 'online' | 'offline';
}): LiveMatch {
  const slug = ch.providerId.replace(/^lt:/, '');
  return {
    id: ch.providerId,
    team1: { id: slug, name: ch.name, score: '', avatar: ch.icon || '' },
    team2: { id: '0', name: 'Live Stream', score: '', avatar: '' },
    status: 'MatchIng',
    startTime: Date.now(),
    endTime: Date.now() + 7200000,
    league: ch.category || 'All Channels',
    type: 'all_channels',
    timeDesc: '24/7',
    playPath: `lt://${slug}`,
    playType: 'PlayTypeVideo',
    contentKind: 'channel',
    channelName: ch.name,
    channelStatus: ch.status,
  };
}

const _REGION_ORDER = [
  'UK',
  'USA',
  'Canada',
  'Spain',
  'France',
  'Germany',
  'Italy',
  'Brazil',
  'Middle East',
  'Israel',
  'Turkey',
  'Poland',
  'Serbia',
  'Croatia',
  'Netherlands',
  'Greece',
  'Romania',
  'Bulgaria',
  'Cyprus',
  'Russia',
  'Sweden',
  'Africa',
  'Portugal',
  'Entertainment',
  'International',
];

function Server2Channels() {
  const t = useTranslations('live');
  const [search, setSearch] = useState('');
  const { channels, isLoading } = useChannels(1, 300, search);

  const matches = useMemo(
    () => channels.map((ch) => channelToMatch(ch)),
    [channels],
  );

  return (
    <div className="space-y-8">
      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchChannels')}
          className="w-full pl-12 pr-4 py-4 bg-background border-[3px] border-border font-headline font-bold text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-neo-blue rounded-md"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <LiveMatchSkeleton />
          <LiveMatchSkeleton />
          <LiveMatchSkeleton />
        </div>
      ) : matches.length === 0 ? (
        <p className="text-center py-12 font-headline font-bold uppercase tracking-widest text-muted-foreground">
          {t('noChannelsFound')}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {matches.map((match) => (
            <LiveMatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LiveClient() {
  return <LiveContent />;
}
