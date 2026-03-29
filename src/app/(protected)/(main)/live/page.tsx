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
    <div className="min-h-[calc(100vh-80px)] bg-[#f5f0e8] pb-32 overflow-x-hidden">
      {/* Hero Header */}
      <div className="border-b-[4px] border-[#1a1a1a] mb-12 bg-[#ffcc00] relative z-40">
        {/* Abstract background shapes */}
        <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-[#1a1a1a] rounded-full opacity-10" />
        <div className="absolute top-10 left-1/4 w-24 h-24 bg-[#e63b2e] border-[4px] border-[#1a1a1a] opacity-20 rotate-12" />

        <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
            <div className="flex-shrink-0">
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-[#1a1a1a] font-headline uppercase leading-none mb-4">
                LIVE
                <br />
                <span className="bg-white px-4 inline-block border-[4px] border-[#1a1a1a] neo-shadow-sm -rotate-1 ml-2 mt-2">
                  STREAM
                </span>
              </h1>
              <div className="flex items-center gap-3">
                <p className="font-headline font-bold uppercase tracking-widest text-[#1a1a1a] bg-white inline-block px-4 py-2 border-[3px] border-[#1a1a1a]">
                  Form Follows Action
                </p>
                <div className="w-12 h-[3px] bg-[#1a1a1a] hidden sm:block" />
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-start md:items-end gap-6 w-full max-w-full xl:max-w-4xl relative">
              {/* Server Selector Dropdown */}
              <div className="relative w-full md:w-auto shrink-0 z-50">
                <p className="font-headline font-black text-xs uppercase tracking-[0.2em] text-[#1a1a1a]/40 mb-2 ml-1">
                  1. Region Provider
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsServerMenuOpen(!isServerMenuOpen);
                    setIsSportMenuOpen(false);
                  }}
                  className={`flex items-center justify-between gap-4 px-5 md:px-6 py-3 md:py-4 font-headline font-black text-base md:text-xl uppercase tracking-widest transition-all duration-200 border-[3px] border-[#1a1a1a] whitespace-nowrap min-w-[220px] md:min-w-[260px] hover:bg-[#ffcc00] hover:text-[#1a1a1a] cursor-pointer ${
                    isServerMenuOpen || activeServer
                      ? 'bg-[#ffcc00] text-[#1a1a1a]'
                      : 'bg-white'
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
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white border-[4px] border-[#1a1a1a] neo-shadow z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {SERVERS.map((server) => (
                      <button
                        key={server.id}
                        type="button"
                        onClick={() => {
                          handleServerChange(
                            server.id,
                            server.id === 'server1'
                              ? SERVER_1_SPORTS[0].id
                              : SERVER_2_SPORTS[0].id,
                          );
                          setIsServerMenuOpen(false);
                        }}
                        className={`w-full text-left px-6 py-4 font-headline font-bold text-lg uppercase tracking-widest border-b-[3px] last:border-b-0 border-[#1a1a1a] transition-all flex items-center justify-between ${
                          activeServer === server.id
                            ? 'bg-[#ffcc00] text-[#1a1a1a]'
                            : 'bg-white hover:bg-[#ffcc00]/10'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span>{server.label}</span>
                          <span className="text-[10px] opacity-60 tracking-normal font-bold">
                            {server.desc}
                          </span>
                        </div>
                        {activeServer === server.id && (
                          <div className="w-3 h-3 bg-[#1a1a1a] rounded-full" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sport Selector Dropdown */}
              <div className="relative w-full md:w-auto flex-grow z-40">
                <p className="font-headline font-black text-xs uppercase tracking-[0.2em] text-[#1a1a1a]/40 mb-2 ml-1">
                  2. Select Coverage
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsSportMenuOpen(!isSportMenuOpen);
                    setIsServerMenuOpen(false);
                  }}
                  className="flex items-center justify-between gap-4 px-5 md:px-6 py-3 md:py-4 font-headline font-black text-base md:text-xl uppercase tracking-widest transition-all duration-200 border-[3px] border-[#1a1a1a] whitespace-nowrap w-full md:min-w-[300px] bg-white text-[#1a1a1a] hover:bg-[#ffcc00] cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 bg-[#ffcc00] border-[2px] border-[#1a1a1a] rounded-full animate-pulse shrink-0" />
                    {activeSport?.label}
                  </div>
                  <ChevronDown
                    className={`w-6 h-6 transition-transform duration-300 ${
                      isSportMenuOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isSportMenuOpen && (
                  <div className="absolute top-full left-0 right-0 mt-3 bg-white border-[4px] border-[#1a1a1a] neo-shadow z-50 animate-in fade-in slide-in-from-top-2 duration-200 p-2 max-h-[400px] overflow-y-auto no-scrollbar">
                    <div className="flex flex-col gap-2">
                      {currentSports.map((sport) => (
                        <button
                          key={sport.id}
                          type="button"
                          onClick={() => {
                            handleTabChange(sport.id);
                            setIsSportMenuOpen(false);
                          }}
                          className={`w-full px-6 py-4 font-headline font-bold text-base uppercase tracking-widest border-[3px] border-[#1a1a1a] transition-all text-left flex items-center justify-between cursor-pointer ${
                            activeTab === sport.id
                              ? 'bg-[#ffcc00] text-[#1a1a1a]'
                              : 'bg-white hover:bg-[#ffcc00]'
                          }`}
                        >
                          {sport.label}
                          {activeTab === sport.id && (
                            <div className="w-3 h-3 bg-[#1a1a1a] rounded-full" />
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
              <div className="h-10 w-48 bg-[#e63b2e] border-[4px] border-[#1a1a1a] neo-shadow-sm mb-8 animate-pulse" />
              <div className="bg-white border-[4px] border-[#1a1a1a] neo-shadow overflow-hidden">
                <LiveMatchSkeleton />
                <LiveMatchSkeleton />
                <LiveMatchSkeleton />
              </div>
            </section>
            <section>
              <div className="h-10 w-48 bg-[#0055ff] border-[4px] border-[#1a1a1a] neo-shadow-sm mb-8 animate-pulse" />
              <div className="bg-white border-[4px] border-[#1a1a1a] neo-shadow overflow-hidden">
                <LiveMatchSkeleton />
                <LiveMatchSkeleton />
                <LiveMatchSkeleton />
              </div>
            </section>
          </div>
        ) : error ? (
          <div className="py-20 text-center flex flex-col items-center">
            <div className="bg-[#e63b2e] border-[4px] border-[#1a1a1a] neo-shadow px-10 py-12 max-w-lg w-full flex flex-col items-center">
              <Radio className="w-12 h-12 text-[#1a1a1a] mb-6" />
              <p className="font-headline font-black text-2xl uppercase tracking-tighter text-[#1a1a1a] mb-8 bg-white px-4 py-2 border-[4px] border-[#1a1a1a]">
                Failed to Load Schedule
              </p>
              <button
                type="button"
                onClick={refresh}
                className="bg-white text-[#1a1a1a] border-[4px] border-[#1a1a1a] px-8 py-4 font-headline text-xl font-black uppercase tracking-widest neo-shadow-sm hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : schedule.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white border-[4px] border-[#1a1a1a] neo-shadow text-center max-w-2xl mx-auto">
            <Calendar className="w-20 h-20 text-[#0055ff] mb-6" />
            <h3 className="text-4xl font-black font-headline uppercase tracking-tighter text-[#1a1a1a] mb-4">
              No Matches Found
            </h3>
            <p className="font-headline font-bold uppercase tracking-widest text-[#4a4a4a] max-w-md">
              No {activeSport?.label?.toLowerCase()} matches scheduled for the
              upcoming days.
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {/* SCHEDULE Section (Combines Live and Upcoming) */}{' '}
            {Object.keys(upcomingByDate).length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-8 bg-[#0055ff] border-[4px] border-[#1a1a1a] px-5 py-3 inline-flex neo-shadow-sm">
                  <Clock className="w-6 h-6 text-white stroke-[3px]" />
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-white font-headline">
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
                      <div
                        key={date}
                        className="bg-white border-[4px] border-[#1a1a1a] neo-shadow"
                      >
                        <div className="px-6 py-4 bg-[#f5f0e8] border-b-[4px] border-[#1a1a1a] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-6 h-6 text-[#1a1a1a] stroke-[3px]" />
                            <span className="text-xl md:text-2xl font-black uppercase tracking-widest text-[#1a1a1a] font-headline mt-1">
                              {isToday ? 'Today' : date}
                            </span>
                          </div>
                          <span className="bg-[#1a1a1a] text-[#ffcc00] px-3 py-1 text-sm font-black font-headline uppercase tracking-widest">
                            {matches.length}{' '}
                            {matches.length === 1 ? 'Match' : 'Matches'}
                          </span>
                        </div>
                        <div className="divide-y-[3px] divide-[#1a1a1a]">
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
                <div className="flex items-center gap-4 mb-8 bg-[#1a1a1a] border-[4px] border-[#1a1a1a] px-5 py-3 inline-flex neo-shadow-sm">
                  <CheckCircle2 className="w-6 h-6 text-white stroke-[3px]" />
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-white font-headline">
                    Completed
                  </h2>
                  <span className="bg-[#4a4a4a] text-white px-3 py-1 border-[3px] border-[#f5f0e8] text-sm font-black font-headline uppercase tracking-widest">
                    {endedMatches.length}{' '}
                    {endedMatches.length === 1 ? 'Match' : 'Matches'}
                  </span>
                </div>
                <div className="bg-white border-[4px] border-[#1a1a1a] neo-shadow">
                  <div className="divide-y-[3px] divide-[#1a1a1a]">
                    {endedMatches.map((match) => (
                      <LiveMatchCard key={match.id} match={match} />
                    ))}
                  </div>
                </div>
              </section>
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
        <div className="min-h-[calc(100vh-80px)] bg-[#f5f0e8] pb-32">
          {/* Header Skeleton */}
          <div className="h-48 md:h-64 bg-[#ffcc00] border-b-[4px] border-[#1a1a1a] mb-12" />

          <div className="container mx-auto px-6 md:px-10">
            <div className="space-y-16">
              <section>
                <div className="h-10 w-48 bg-[#e63b2e] border-[4px] border-[#1a1a1a] neo-shadow-sm mb-8 animate-pulse" />
                <div className="bg-white border-[4px] border-[#1a1a1a] neo-shadow overflow-hidden">
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
