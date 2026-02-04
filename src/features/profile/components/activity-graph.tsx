'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { WatchActivity } from '../types';

// Helper to format date
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Helper to get ISO date string YYYY-MM-DD (Local)
const toIso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface ActivityGraphProps {
  activity: WatchActivity[];
  isLoading?: boolean;
}

// Helper to generating stable skeleton IDs
const SKELETON_MONTHS = Array.from({ length: 12 }, (_, i) => ({
  id: `month-${i}`,
  offset: i * 60,
}));
const SKELETON_WEEKS = Array.from({ length: 53 }, (_, i) => ({
  id: `week-${i}`,
  days: Array.from({ length: 7 }, (_, d) => ({ id: `day-${i}-${d}` })),
}));

function ActivityGraphSkeleton() {
  return (
    <div className="w-full overflow-hidden animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-muted/50">
            <div className="w-5 h-5 bg-muted rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-6 w-32 bg-muted rounded-lg" />
            <div className="h-3 w-48 bg-muted/70 rounded" />
          </div>
        </div>
      </div>
      <div className="w-full overflow-x-auto pt-8 pb-2 scrollbar-hide">
        <div className="min-w-fit">
          <div className="flex flex-col gap-1">
            {/* Fake Months */}
            <div className="flex relative h-5 mb-1">
              {SKELETON_MONTHS.map((month) => (
                <div
                  key={month.id}
                  className="absolute h-2.5 w-8 bg-muted/50 rounded-full"
                  style={{ left: `${month.offset}px` }}
                />
              ))}
            </div>
            {/* Fake Grid */}
            <div className="flex gap-[3px]">
              {SKELETON_WEEKS.map((week) => (
                <div key={week.id} className="flex flex-col gap-[3px]">
                  {week.days.map((day) => (
                    <div
                      key={day.id}
                      className="w-[11px] h-[11px] rounded-[3px] bg-muted/30"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function useActivityGraphData(activity: WatchActivity[], createdAt?: Date) {
  return useMemo(() => {
    // Strip time to ensure consistent comparisons
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // Calculate start date: 52 weeks ago relative to today
    // We align to the nearest Sunday to start the grid cleanly
    const dayOfWeek = today.getDay();
    const daysToSubtract = 52 * 7 + dayOfWeek;

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysToSubtract);
    startDate.setHours(0, 0, 0, 0);

    const weeksData = [];
    let total = 0;

    // We create a runner date to iterate day by day
    const currentDate = new Date(startDate);

    // Generate exactly 53 weeks to cover the full leap-year/edge-case visual range
    for (let w = 0; w < 53; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = toIso(currentDate);

        // Validation Logic
        const creationDay = createdAt ? new Date(createdAt) : null;
        if (creationDay) creationDay.setHours(0, 0, 0, 0);

        const isAfterCreation = creationDay ? currentDate >= creationDay : true;

        const checkDate = new Date(currentDate);
        checkDate.setHours(0, 0, 0, 0);
        const todayMidnight = new Date(today);
        todayMidnight.setHours(0, 0, 0, 0);

        const isFuture = checkDate > todayMidnight;

        let count = 0;
        let level = 0;

        // Map Data
        if (isAfterCreation && !isFuture) {
          const dayActivity = activity?.find((a) => a.date === dateStr);
          count = dayActivity?.count || 0;
          total += count;

          if (dayActivity?.level) {
            level = dayActivity.level;
          } else if (count > 0) {
            // Fallback level calculation if backend doesn't provide it
            if (count > 120) level = 4;
            else if (count > 60) level = 3;
            else if (count > 30) level = 2;
            else level = 1;
          }
        }

        week.push({
          date: new Date(currentDate),
          dateStr,
          count,
          level,
          isValid: !isFuture,
        });

        // Advance to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeksData.push(week);
    }

    return { weeks: weeksData, totalCount: total };
  }, [activity, createdAt]);
}

export function ActivityGraph({
  activity,
  createdAt,
  isLoading = false,
}: ActivityGraphProps & { createdAt?: Date }) {
  const { weeks, totalCount } = useActivityGraphData(activity, createdAt);

  // Calculate Month Labels Positions
  const monthLabels = useMemo(() => {
    const labels: { name: string; weekIndex: number }[] = [];

    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0].date;

      if (weekIndex === 0) {
        labels.push({
          name: firstDayOfWeek.toLocaleDateString('en-US', { month: 'short' }),
          weekIndex: 0,
        });
        return;
      }

      const prevWeekFirstDay = weeks[weekIndex - 1][0].date;
      const isNewMonth =
        firstDayOfWeek.getMonth() !== prevWeekFirstDay.getMonth();

      if (isNewMonth) {
        // Ensure labels don't overlap (minimum 2 weeks gap)
        const lastLabel = labels[labels.length - 1];
        if (weekIndex - lastLabel.weekIndex >= 2) {
          labels.push({
            name: firstDayOfWeek.toLocaleDateString('en-US', {
              month: 'short',
            }),
            weekIndex,
          });
        }
      }
    });
    return labels;
  }, [weeks]);

  if (isLoading) {
    return <ActivityGraphSkeleton />;
  }

  return (
    <div className="w-full overflow-hidden">
      {/* Stats Header */}
      <div className="flex items-center gap-4 mb-6 pb-5 border-b border-white/[0.06]">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-red-500/30 to-red-600/20 rounded-2xl blur-lg opacity-60" />
          <div className="relative p-3 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20">
            <svg
              className="w-6 h-6 text-red-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-label="Video icon"
              role="img"
            >
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {totalCount < 60
                ? Math.ceil(totalCount)
                : Math.floor(totalCount / 60)}
            </span>
            <span className="text-lg text-muted-foreground font-medium">
              {totalCount < 60 ? 'minutes' : 'hours'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground/70">
            Total watch time in the last year
          </p>
        </div>
      </div>

      {/* Activity Grid */}
      <div className="w-full overflow-x-auto pt-6 pb-3 scrollbar-hide">
        <div className="min-w-fit">
          <div className="flex flex-col gap-1.5">
            {/* Months Row */}
            <div className="flex relative h-5 mb-2">
              {monthLabels.map((label) => (
                <span
                  key={`${label.name}-${label.weekIndex}`}
                  className="absolute text-[10px] text-muted-foreground/80 font-medium tracking-wide uppercase"
                  style={{
                    left: `${label.weekIndex * 14}px`, // 11px width + 3px gap = 14px
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>

            {/* Weeks Grid */}
            <div className="flex gap-[3px]">
              {weeks.map((week) => (
                <div key={week[0].dateStr} className="flex flex-col gap-[3px]">
                  {week.map((day) => {
                    // Enhanced Red Theme Colors with better gradients
                    const themeColors = [
                      'bg-white/[0.04] hover:bg-white/[0.08]', // Empty
                      'bg-gradient-to-br from-red-900/50 to-red-900/30 shadow-sm shadow-red-900/20', // L1
                      'bg-gradient-to-br from-red-700/60 to-red-800/50 shadow-sm shadow-red-800/20', // L2
                      'bg-gradient-to-br from-red-600/80 to-red-700/70 shadow-sm shadow-red-700/20', // L3
                      'bg-gradient-to-br from-red-500 to-red-600 shadow-md shadow-red-500/30', // L4
                    ];

                    return (
                      <div
                        key={day.dateStr}
                        className={cn(
                          'w-[11px] h-[11px] rounded-[3px] transition-all duration-300 relative group cursor-pointer hover:scale-125 hover:z-10',
                          themeColors[day.level],
                          !day.isValid && 'invisible opacity-0',
                        )}
                      >
                        {/* Enhanced Tooltip */}
                        {day.isValid && (
                          <div className="absolute bottom-full right-0 mb-3 hidden group-hover:block z-[9999] whitespace-nowrap bg-gradient-to-br from-popover to-popover/95 backdrop-blur-xl text-popover-foreground text-xs px-4 py-2.5 rounded-xl shadow-2xl shadow-black/40 border border-white/10 pointer-events-none animate-in fade-in zoom-in-95 duration-200 origin-bottom-right">
                            <div className="font-bold text-sm mb-0.5">
                              {Math.ceil(day.count)} min
                            </div>
                            <div className="text-muted-foreground/80 text-[10px] font-medium">
                              {formatDate(day.date)}
                            </div>
                            {/* Tooltip arrow */}
                            <div className="absolute -bottom-1 right-3 w-2 h-2 bg-popover border-r border-b border-white/10 rotate-45" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Legend */}
        <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-xs text-muted-foreground/60">
            Your watching patterns
          </span>
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground/70">
            <span className="font-medium">Less</span>
            <div className="flex gap-[3px]">
              <div className="w-[11px] h-[11px] rounded-[3px] bg-white/[0.04] border border-white/[0.06]" />
              <div className="w-[11px] h-[11px] rounded-[3px] bg-gradient-to-br from-red-900/50 to-red-900/30" />
              <div className="w-[11px] h-[11px] rounded-[3px] bg-gradient-to-br from-red-700/60 to-red-800/50" />
              <div className="w-[11px] h-[11px] rounded-[3px] bg-gradient-to-br from-red-600/80 to-red-700/70" />
              <div className="w-[11px] h-[11px] rounded-[3px] bg-gradient-to-br from-red-500 to-red-600" />
            </div>
            <span className="font-medium">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
