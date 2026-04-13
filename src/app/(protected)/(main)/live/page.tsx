'use client';

import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Globe2,
  Radio,
  Trophy,
} from 'lucide-react';
import { Suspense, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LiveMatchSkeleton } from '@/components/ui/skeletons';
import { LiveMatchCard } from '@/features/livestream/components/LiveMatchCard';
import { useLivestreams } from '@/features/livestream/hooks/use-livestreams';
import { useLiveContent } from './use-live-content';

const SERVERS = [
  { id: 'server1', label: 'Server 1', desc: 'Main Sports' },
  { id: 'server2', label: 'Server 2', desc: 'Global Sports' },
] as const;

const SERVER_1_SPORTS = [
  { id: 'basketball', label: 'Basketball' },
  { id: 'football', label: 'Football' },
  { id: 'cricket', label: 'Cricket' },
] as const;

const SERVER_2_SPORTS = [
  { id: 'all_channels', label: 'All Channels' },
  { id: 'soccer', label: 'Soccer' },
  { id: 'nba', label: 'NBA' },
  { id: 'ufc', label: 'UFC/MMA' },
  { id: 'boxing', label: 'Boxing' },
  { id: 'racing', label: 'Racing/F1' },
  { id: 'fifawc', label: 'FIFA WC' },
  { id: 'rugby', label: 'Rugby' },
  { id: 'rugby_league', label: 'Rugby League' },
  { id: 'nhl', label: 'NHL' },
  { id: 'mlb', label: 'MLB' },
  { id: 'ncaab', label: 'NCAAB' },
  { id: 'afl', label: 'AFL' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'gaa', label: 'GAA' },
  { id: 'golf', label: 'Golf' },
  { id: 'events', label: 'Events' },
  { id: 'curling', label: 'Curling' },
  { id: 'ufl', label: 'UFL' },
] as const;

function LiveContent() {
  const [isServerMenuOpen, setIsServerMenuOpen] = useState(false);
  const [isSportMenuOpen, setIsSportMenuOpen] = useState(false);

  const {
    activeServer,
    activeTab,
    isPending,
    handleTabChange,
    handleServerChange,
  } = useLiveContent();

  const currentSports =
    activeServer === 'server1' ? SERVER_1_SPORTS : SERVER_2_SPORTS;

  const { schedule, isLoading, error, refresh } = useLivestreams(
    activeTab,
    activeServer,
  );

  const isAllChannelsView =
    activeServer === 'server2' && activeTab === 'all_channels';

  // Separate live, upcoming, and ended matches
  const endedMatches = schedule.filter((m) => m.status === 'MatchEnded');

  // Group BOTH Live and Upcoming matches by date
  const activeMatches = schedule.filter(
    (m) => m.status === 'MatchIng' || m.status === 'MatchNotStart',
  );

  const upcomingByDate = activeMatches.reduce(
    (acc, match) => {
      const date = new Date(match.startTime).toLocaleDateString([], {
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

  const activeSport = [...SERVER_1_SPORTS, ...SERVER_2_SPORTS].find(
    (s) => s.id === activeTab,
  );

  return (
    <div className="min-h-[calc(100vh-80px)] bg-background pb-32 overflow-x-hidden">
      {/* Hero Header */}
      <div className="border-b-[4px] border-border mb-12 bg-neo-yellow relative z-40">
        {/* Abstract background shapes */}
        <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-border rounded-full opacity-10" />
        <div className="absolute top-10 left-1/4 w-24 h-24 bg-neo-red border-[4px] border-border opacity-20 rotate-12" />

        <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
            <div className="flex-shrink-0">
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-foreground font-headline uppercase leading-none mb-4">
                LIVE
                <br />
                <span className="bg-background px-4 inline-block border-[4px] border-border  -rotate-1 ml-2 mt-2">
                  STREAM
                </span>
              </h1>
              <div className="flex items-center gap-3">
                <p className="font-headline font-bold uppercase tracking-widest text-foreground bg-background inline-block px-4 py-2 border-[3px] border-border">
                  Form Follows Action
                </p>
                <div className="w-12 h-[3px] bg-primary hidden sm:block" />
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 w-full max-w-full xl:max-w-4xl relative">
              {/* Server Selector Dropdown */}
              <div className="relative w-full md:w-auto shrink-0 z-50">
                <p className="font-headline font-black text-xs uppercase tracking-[0.2em] text-foreground/40 mb-2 ml-1">
                  1. Region Provider
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsServerMenuOpen(!isServerMenuOpen);
                    setIsSportMenuOpen(false);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={isServerMenuOpen}
                  aria-controls="live-server-menu"
                  className={`flex items-center justify-between gap-4 px-5 md:px-6 py-3 md:py-4 font-headline font-black text-base md:text-xl uppercase tracking-widest transition-colors duration-200 border-[3px] border-border whitespace-nowrap min-w-[220px] md:min-w-[260px] hover:bg-muted hover:text-foreground cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-blue focus-visible:ring-offset-2 ${
                    isServerMenuOpen || activeServer
                      ? 'bg-muted text-foreground'
                      : 'bg-background'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {activeServer === 'server1' ? (
                      <Trophy className="w-6 h-6" />
                    ) : (
                      <Globe2 className="w-6 h-6" />
                    )}
                    {SERVERS.find((s) => s.id === activeServer)?.label}
                  </div>
                  <ChevronDown
                    className={`w-6 h-6 transition-transform duration-300 ${
                      isServerMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isServerMenuOpen && (
                  <div
                    id="live-server-menu"
                    role="menu"
                    className="absolute top-full left-0 right-0 mt-3 bg-background border-[3px] border-border z-50 overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-200 motion-reduce:animate-none rounded-md shadow-md"
                  >
                    {SERVERS.map((server) => (
                      <button
                        type="button"
                        key={server.id}
                        role="menuitem"
                        onClick={() => {
                          handleServerChange(
                            server.id,
                            server.id === 'server1'
                              ? SERVER_1_SPORTS[0].id
                              : SERVER_2_SPORTS[0].id,
                          );
                          setIsServerMenuOpen(false);
                        }}
                        className={`w-full text-left px-6 py-4 font-headline font-bold text-lg uppercase tracking-widest border-b-[3px] last:border-b-0 border-border transition-colors flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:bg-muted ${
                          activeServer === server.id
                            ? 'bg-muted text-foreground'
                            : 'bg-background hover:bg-muted/80'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span>{server.label}</span>
                          <span className="text-[10px] opacity-60 tracking-normal font-bold">
                            {server.desc}
                          </span>
                        </div>
                        {activeServer === server.id && (
                          <div className="w-3 h-3 bg-primary rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sport Selector Dropdown */}
              <div className="relative w-full md:w-auto flex-grow z-40">
                <p className="font-headline font-black text-xs uppercase tracking-[0.2em] text-foreground/40 mb-2 ml-1">
                  2. Select Coverage
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsSportMenuOpen(!isSportMenuOpen);
                    setIsServerMenuOpen(false);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={isSportMenuOpen}
                  aria-controls="live-sport-menu"
                  className="flex items-center justify-between gap-4 px-5 md:px-6 py-3 md:py-4 font-headline font-black text-base md:text-xl uppercase tracking-widest transition-colors duration-200 border-[3px] border-border whitespace-nowrap w-full md:min-w-[300px] bg-background text-foreground hover:bg-muted cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-blue focus-visible:ring-offset-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 bg-neo-red border-[2px] border-border rounded-full animate-pulse shrink-0" />
                    {activeSport?.label}
                  </div>
                  <ChevronDown
                    className={`w-6 h-6 transition-transform duration-300 ${
                      isSportMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isSportMenuOpen && (
                  <div
                    id="live-sport-menu"
                    role="menu"
                    className="absolute top-full left-0 right-0 mt-3 bg-background border-[3px] border-border z-50 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-200 motion-reduce:animate-none p-2 max-h-[400px] overflow-y-auto no-scrollbar rounded-md shadow-md"
                  >
                    <div className="flex flex-col gap-2">
                      {currentSports.map((sport) => (
                        <button
                          type="button"
                          key={sport.id}
                          role="menuitem"
                          onClick={() => {
                            handleTabChange(sport.id);
                            setIsSportMenuOpen(false);
                          }}
                          className={`w-full px-6 py-4 font-headline font-bold text-base uppercase tracking-widest border-[3px] border-border transition-colors text-left flex items-center justify-between cursor-pointer rounded-md focus-visible:outline-none focus-visible:bg-muted ${
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
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 md:px-10">
        {isLoading || isPending ? (
          <div className="space-y-16">
            <section>
              <div className="h-10 w-48 bg-neo-red border-[4px] border-border  mb-8 animate-pulse" />
              <div className="bg-background border-[4px] border-border  overflow-hidden">
                <LiveMatchSkeleton />
                <LiveMatchSkeleton />
                <LiveMatchSkeleton />
              </div>
            </section>
            <section>
              <div className="h-10 w-48 bg-neo-blue border-[4px] border-border  mb-8 animate-pulse" />
              <div className="bg-background border-[4px] border-border  overflow-hidden">
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
                Failed to Load Schedule
              </p>
              <Button
                onClick={refresh}
                className="bg-background text-foreground border-[3px] border-border px-8 py-4 font-headline text-lg font-black uppercase tracking-widest transition-colors hover:bg-muted"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : schedule.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-background border-[4px] border-border  text-center max-w-2xl mx-auto">
            <Calendar className="w-20 h-20 text-neo-blue mb-6" />
            <h3 className="text-4xl font-black font-headline uppercase tracking-tighter text-foreground mb-4">
              {isAllChannelsView ? 'No Channels Found' : 'No Matches Found'}
            </h3>
            <p className="font-headline font-bold uppercase tracking-widest text-muted-foreground max-w-md">
              {isAllChannelsView
                ? 'No always-on channels are currently available from this provider.'
                : `No ${activeSport?.label?.toLowerCase()} matches scheduled for the upcoming days.`}
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {isAllChannelsView && (
              <section>
                <div className="flex items-center gap-4 mb-8 bg-neo-blue border-[4px] border-border px-5 py-3 inline-flex ">
                  <Radio className="w-6 h-6 text-primary-foreground stroke-[3px]" />
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-primary-foreground font-headline">
                    All Channels
                  </h2>
                  <span className="bg-primary text-neo-yellow px-3 py-1 text-sm font-black font-headline uppercase tracking-widest">
                    {schedule.length}
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  {schedule.map((match) => (
                    <LiveMatchCard key={match.id} match={match} />
                  ))}
                </div>
              </section>
            )}

            {!isAllChannelsView && (
              <>
                {/* SCHEDULE Section (Combines Live and Upcoming) */}{' '}
                {Object.keys(upcomingByDate).length > 0 && (
                  <section>
                    <div className="flex items-center gap-4 mb-8 bg-neo-blue border-[4px] border-border px-5 py-3 inline-flex ">
                      <Clock className="w-6 h-6 text-primary-foreground stroke-[3px]" />
                      <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-primary-foreground font-headline">
                        Schedule
                      </h2>
                    </div>
                    <div className="space-y-8">
                      {Object.entries(upcomingByDate).map(([date, matches]) => {
                        const isToday =
                          new Date().toLocaleDateString([], {
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
                                  {isToday ? 'Today' : date}
                                </span>
                              </div>
                              <span className="bg-primary text-neo-yellow px-3 py-1 text-sm font-black font-headline uppercase tracking-widest">
                                {matches.length}{' '}
                                {matches.length === 1 ? 'Match' : 'Matches'}
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
                {/* ENDED Section */}
                {endedMatches.length > 0 && (
                  <section>
                    <div className="flex items-center gap-4 mb-8 bg-primary border-[4px] border-border px-5 py-3 inline-flex ">
                      <CheckCircle2 className="w-6 h-6 text-primary-foreground stroke-[3px]" />
                      <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-primary-foreground font-headline">
                        Completed
                      </h2>
                      <span className="bg-secondary text-secondary-foreground px-3 py-1 border-[3px] border-border text-sm font-black font-headline uppercase tracking-widest">
                        {endedMatches.length}{' '}
                        {endedMatches.length === 1 ? 'Match' : 'Matches'}
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

export default function LivePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-80px)] bg-background pb-32">
          {/* Header Skeleton */}
          <div className="h-48 md:h-64 bg-neo-yellow border-b-[4px] border-border mb-12" />

          <div className="container mx-auto px-6 md:px-10">
            <div className="space-y-16">
              <section>
                <div className="h-10 w-48 bg-neo-red border-[4px] border-border  mb-8 animate-pulse" />
                <div className="bg-background border-[4px] border-border  overflow-hidden">
                  <LiveMatchSkeleton />
                  <LiveMatchSkeleton />
                  <LiveMatchSkeleton />
                </div>
              </section>
            </div>
          </div>
        </div>
      }
    >
      <LiveContent />
    </Suspense>
  );
}
