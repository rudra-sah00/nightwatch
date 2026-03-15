'use client';

import {
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Radio,
  Server,
} from 'lucide-react';
import { Suspense } from 'react';
import { LiveMatchCard } from '@/features/livestream/components/LiveMatchCard';
import { useLivestreams } from '@/features/livestream/hooks/use-livestreams';
import { useServer } from '@/providers/server-provider';
import { useLiveContent } from './use-live-content';

const SPORTS = [
  { id: 'basketball', label: 'Basketball' },
  { id: 'football', label: 'Football' },
  { id: 'cricket', label: 'Cricket' },
] as const;

function LiveContent() {
  const { activeTab, isPending, handleTabChange } = useLiveContent();
  const { activeServer } = useServer();

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
    <div className="min-h-screen pb-32">
      {/* Hero Header */}
      {activeServer === 's2' && (
        <div className="relative overflow-hidden">
          <div className="container mx-auto px-4 pt-10 pb-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Radio className="w-5 h-5 text-zinc-400" />
                  <h1 className="text-3xl font-bold tracking-tight text-white">
                    Live Sports
                  </h1>
                </div>
                <p className="text-sm text-zinc-500 pl-8">
                  Watch live matches and upcoming schedules
                </p>
              </div>
            </div>

            {/* Sport Selector Tabs */}
            <div className="flex gap-1.5 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800/50 w-fit backdrop-blur-sm">
              {SPORTS.map((sport) => (
                <button
                  type="button"
                  key={sport.id}
                  onClick={() => handleTabChange(sport.id)}
                  className={`relative px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    activeTab === sport.id
                      ? 'bg-white text-black shadow-lg shadow-white/5'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  }`}
                >
                  {sport.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subtle divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-800/60 to-transparent" />
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 mt-2">
        {activeServer !== 's2' ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-zinc-700/10 rounded-2xl blur-xl" />
              <div className="relative w-16 h-16 rounded-2xl bg-zinc-900/80 flex items-center justify-center mb-5 border border-zinc-800/80 backdrop-blur-sm">
                <Server className="w-7 h-7 text-zinc-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-zinc-300 mb-1.5">
              Server 2 Required
            </h3>
            <p className="text-sm text-zinc-600 max-w-xs leading-relaxed">
              Select Server 2 to watch live streaming.
            </p>
          </div>
        ) : isLoading || isPending ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-zinc-500/10 rounded-full blur-lg" />
                <Loader2 className="relative w-7 h-7 text-zinc-500 animate-spin" />
              </div>
              <p className="text-sm text-zinc-500">
                Loading {activeSport?.label || 'matches'}...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="py-20 text-center">
            <div className="inline-flex flex-col items-center bg-zinc-900/60 border border-zinc-800/50 rounded-2xl px-10 py-8 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-xl bg-zinc-800/80 flex items-center justify-center mb-4 border border-zinc-700/40">
                <Radio className="w-4 h-4 text-zinc-500" />
              </div>
              <p className="text-zinc-400 text-sm font-medium mb-4">
                Failed to load schedule
              </p>
              <button
                type="button"
                onClick={refresh}
                className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        ) : schedule.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="relative">
              <div className="absolute inset-0 bg-zinc-700/10 rounded-2xl blur-xl" />
              <div className="relative w-16 h-16 rounded-2xl bg-zinc-900/80 flex items-center justify-center mb-5 border border-zinc-800/80">
                <Calendar className="w-7 h-7 text-zinc-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-zinc-300 mb-1.5">
              No Matches Found
            </h3>
            <p className="text-sm text-zinc-600 max-w-xs leading-relaxed">
              No {activeSport?.label?.toLowerCase()} matches scheduled for the
              upcoming days.
            </p>
          </div>
        ) : (
          <div className="space-y-12 pt-4">
            {/* LIVE NOW Section */}
            {liveMatches.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-live-strong" />
                  </span>
                  <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-live">
                    Live Now
                  </h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-live-strong/20 to-transparent" />
                  <span className="text-[11px] text-zinc-600 tabular-nums font-medium">
                    {liveMatches.length}{' '}
                    {liveMatches.length === 1 ? 'match' : 'matches'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <div className="flex items-center gap-3 mb-5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-400">
                    Upcoming
                  </h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-zinc-800/60 to-transparent" />
                </div>
                <div className="space-y-3">
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
                        className="rounded-xl border border-zinc-800/50 bg-zinc-900/20 overflow-hidden"
                      >
                        <div className="px-5 py-3 bg-zinc-900/50 border-b border-zinc-800/30 flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-zinc-600" />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                            {isToday ? 'Today' : date}
                          </span>
                          <span className="text-[10px] text-zinc-700 ml-auto tabular-nums">
                            {matches.length}{' '}
                            {matches.length === 1 ? 'match' : 'matches'}
                          </span>
                        </div>
                        <div className="divide-y divide-zinc-800/20">
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
                <div className="flex items-center gap-3 mb-5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-600" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-600">
                    Completed
                  </h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-zinc-800/40 to-transparent" />
                  <span className="text-[11px] text-zinc-700 tabular-nums font-medium">
                    {endedMatches.length}{' '}
                    {endedMatches.length === 1 ? 'match' : 'matches'}
                  </span>
                </div>
                <div className="rounded-xl border border-zinc-800/30 bg-zinc-900/15 overflow-hidden">
                  <div className="divide-y divide-zinc-800/15">
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
        <div className="min-h-screen pb-32">
          <div className="container mx-auto px-4 pt-10">
            <div className="flex items-center gap-3 mb-8">
              <Radio className="w-5 h-5 text-zinc-400" />
              <h1 className="text-3xl font-bold tracking-tight">Live Sports</h1>
            </div>
            <div className="flex gap-1.5 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800/50 w-fit mb-10">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-9 w-24 rounded-lg bg-zinc-800/60 animate-pulse"
                />
              ))}
            </div>
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-7 h-7 text-zinc-500 animate-spin" />
            </div>
          </div>
        </div>
      }
    >
      <LiveContent />
    </Suspense>
  );
}
