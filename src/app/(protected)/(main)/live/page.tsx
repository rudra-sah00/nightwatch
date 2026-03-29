'use client';

import { Calendar, CheckCircle2, Clock, Radio } from 'lucide-react';
import { Suspense } from 'react';
import { LiveMatchSkeleton } from '@/components/ui/skeletons';
import { LiveMatchCard } from '@/features/livestream/components/LiveMatchCard';
import { useLivestreams } from '@/features/livestream/hooks/use-livestreams';
import { useLiveContent } from './use-live-content';

const SPORTS = [
  { id: 'basketball', label: 'Basketball' },
  { id: 'football', label: 'Football' },
  { id: 'cricket', label: 'Cricket' },
] as const;

function LiveContent() {
  const { activeTab, isPending, handleTabChange } = useLiveContent();

  const { schedule, isLoading, error, refresh } = useLivestreams(activeTab);

  // Separate live, upcoming, and ended matches
  const liveMatches = schedule.filter((m) => m.status === 'MatchIng');
  const upcomingMatches = schedule.filter((m) => m.status === 'MatchNotStart');
  const endedMatches = schedule.filter((m) => m.status === 'MatchEnded');

  // Group upcoming by date
  const upcomingByDate = upcomingMatches.reduce(
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
    {} as Record<string, typeof upcomingMatches>,
  );

  const activeSport = SPORTS.find((s) => s.id === activeTab);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f5f0e8] pb-32">
      {/* Hero Header */}
      <div className="border-b-[4px] border-[#1a1a1a] mb-12 bg-[#ffcc00] relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute -top-10 -right-10 w-64 h-64 border-[4px] border-[#1a1a1a] rounded-full opacity-20" />
        <div className="absolute top-10 left-1/4 w-24 h-24 bg-[#e63b2e] border-[4px] border-[#1a1a1a] opacity-30 rotate-12" />

        <div className="container mx-auto px-6 py-12 md:px-10 relative z-10">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
            <div>
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter text-[#1a1a1a] font-headline uppercase leading-none mb-4">
                LIVE
                <br />
                <span className="bg-white px-4 inline-block border-[4px] border-[#1a1a1a] neo-shadow-sm -rotate-1 ml-2 mt-2">
                  STYLE
                </span>
              </h1>
              <p className="font-headline font-bold uppercase tracking-widest text-[#1a1a1a] bg-white inline-block px-4 py-2 border-[3px] border-[#1a1a1a]">
                Form Follows Action
              </p>
            </div>

            {/* Sport Selector Tabs */}
            <div className="flex flex-wrap gap-3 bg-white border-[4px] border-[#1a1a1a] p-3 neo-shadow-sm h-fit">
              {SPORTS.map((sport) => (
                <button
                  type="button"
                  key={sport.id}
                  onClick={() => handleTabChange(sport.id)}
                  className={`px-6 py-3 font-headline font-black text-sm md:text-base uppercase tracking-widest transition-all duration-200 border-[3px] border-[#1a1a1a] ${
                    activeTab === sport.id
                      ? 'bg-[#1a1a1a] text-[#ffcc00] translate-x-[2px] translate-y-[2px] shadow-none'
                      : 'bg-white text-[#1a1a1a] neo-shadow-hover hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
                  }`}
                >
                  {sport.label}
                </button>
              ))}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                <LiveMatchSkeleton variant="featured" />
                <LiveMatchSkeleton variant="featured" />
                <LiveMatchSkeleton variant="featured" />
              </div>
            </section>
            <section>
              <div className="h-10 w-48 bg-[#0055ff] border-[4px] border-[#1a1a1a] neo-shadow-sm mb-8 animate-pulse" />
              <div className="bg-white border-[4px] border-[#1a1a1a] neo-shadow overflow-hidden">
                <LiveMatchSkeleton variant="compact" />
                <LiveMatchSkeleton variant="compact" />
                <LiveMatchSkeleton variant="compact" />
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
            {/* LIVE NOW Section */}
            {liveMatches.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-8 bg-[#e63b2e] border-[4px] border-[#1a1a1a] px-5 py-3 inline-flex bg-opacity-100 neo-shadow-sm">
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full bg-white opacity-75" />
                    <span className="relative inline-flex h-4 w-4 bg-[#f5f0e8] border-[3px] border-[#1a1a1a]" />
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-white font-headline">
                    Live Now
                  </h2>
                  <span className="bg-white text-[#1a1a1a] px-2 py-0.5 border-[3px] border-[#1a1a1a] text-lg font-black font-headline">
                    {liveMatches.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                  {liveMatches.map((match) => (
                    <LiveMatchCard
                      key={match.id}
                      match={match}
                      variant="featured"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* UPCOMING Section */}
            {Object.keys(upcomingByDate).length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-8 bg-[#0055ff] border-[4px] border-[#1a1a1a] px-5 py-3 inline-flex neo-shadow-sm">
                  <Clock className="w-6 h-6 text-white stroke-[3px]" />
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-white font-headline">
                    Upcoming
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
                            <LiveMatchCard
                              key={match.id}
                              match={match}
                              variant="compact"
                            />
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
                      <LiveMatchCard
                        key={match.id}
                        match={match}
                        variant="compact"
                      />
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  <LiveMatchSkeleton variant="featured" />
                  <LiveMatchSkeleton variant="featured" />
                  <LiveMatchSkeleton variant="featured" />
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
