'use client';

import { Calendar, Loader2, Radio, Server } from 'lucide-react';
import { Suspense } from 'react';
import { Navbar } from '@/components/layout/navbar';
import { LiveMatchCard } from '@/features/livestream/components/LiveMatchCard';
import { useLivestreams } from '@/features/livestream/hooks/use-livestreams';
import { useServer } from '@/providers/server-provider';
import { useLiveContent } from './use-live-content';

const SPORTS = [
  { id: 'basketball', label: 'Basketball', emoji: '🏀' },
  { id: 'football', label: 'Football', emoji: '⚽' },
  { id: 'cricket', label: 'Cricket', emoji: '🏏' },
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
      {activeServer !== 's1' && (
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-red-950/10 via-transparent to-transparent pointer-events-none" />
          <div className="container mx-auto px-4 pt-8 pb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <Radio className="w-5 h-5 text-red-500" />
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    Live Sports
                  </h1>
                </div>
                <p className="text-sm text-zinc-500">
                  Watch live matches and upcoming schedules
                </p>
              </div>
            </div>

            {/* Sport Selector Pills */}
            <div className="flex gap-2">
              {SPORTS.map((sport) => (
                <button
                  type="button"
                  key={sport.id}
                  onClick={() => handleTabChange(sport.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
                    activeTab === sport.id
                      ? 'bg-white text-black shadow-lg shadow-white/10'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 border border-zinc-800/80'
                  }`}
                >
                  <span className="text-base">{sport.emoji}</span>
                  <span>{sport.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4">
        {activeServer === 's1' ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
              <Server className="w-7 h-7 text-zinc-700" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-300 mb-1">
              Server 2 Required
            </h3>
            <p className="text-sm text-zinc-600 max-w-xs">
              Select Server 2 to watch live streaming.
            </p>
          </div>
        ) : isLoading || isPending ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
              <p className="text-sm text-zinc-600">
                Loading {activeSport?.label || 'matches'}...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <div className="inline-flex flex-col items-center bg-red-950/20 border border-red-900/30 rounded-2xl px-8 py-6">
              <p className="text-red-400 text-sm mb-3">
                Failed to load schedule
              </p>
              <button
                type="button"
                onClick={refresh}
                className="text-xs text-red-400/80 hover:text-red-300 underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        ) : schedule.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
              <Calendar className="w-7 h-7 text-zinc-700" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-300 mb-1">
              No Matches Found
            </h3>
            <p className="text-sm text-zinc-600 max-w-xs">
              No {activeSport?.label?.toLowerCase()} matches scheduled for the
              upcoming days.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* LIVE NOW Section */}
            {liveMatches.length > 0 && (
              <section>
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-red-400">
                    Live Now
                  </h2>
                  <span className="text-xs text-zinc-600 ml-1">
                    ({liveMatches.length})
                  </span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4">
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
                <div className="flex items-center gap-2.5 mb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                    Upcoming
                  </h2>
                </div>
                <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/30 overflow-hidden divide-y divide-zinc-800/40">
                  {Object.entries(upcomingByDate).map(([date, matches]) => {
                    const isToday =
                      new Date().toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      }) === date;
                    return (
                      <div key={date}>
                        <div className="px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800/30">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                            {isToday ? '📅 Today' : date}
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
                <div className="flex items-center gap-2.5 mb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">
                    Completed
                  </h2>
                  <span className="text-xs text-zinc-700">
                    ({endedMatches.length})
                  </span>
                </div>
                <div className="rounded-2xl border border-zinc-800/40 bg-zinc-900/20 overflow-hidden">
                  <div className="divide-y divide-zinc-800/20">
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
    <>
      <Navbar />
      <Suspense
        fallback={
          <div className="min-h-screen pb-32">
            <div className="container mx-auto px-4 pt-8">
              <div className="flex items-center gap-2.5 mb-6">
                <Radio className="w-5 h-5 text-red-500" />
                <h1 className="text-2xl font-bold tracking-tight">
                  Live Sports
                </h1>
              </div>
              <div className="flex gap-2 mb-10">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-9 w-28 rounded-full bg-zinc-900 animate-pulse"
                  />
                ))}
              </div>
              <div className="flex items-center justify-center py-32">
                <Loader2 className="w-6 h-6 text-zinc-600 animate-spin" />
              </div>
            </div>
          </div>
        }
      >
        <LiveContent />
      </Suspense>
    </>
  );
}
