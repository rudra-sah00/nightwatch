'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { WatchActivity } from '../types';

// Helper to format date
const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
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

// Day labels for the left side (GitHub style: Mon, Wed, Fri)
const DAY_LABELS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
const DAY_DISPLAY = ['', 'Mon', '', 'Wed', '', 'Fri', ''] as const;

// Static style constant to avoid inline object recreation (rule 5.4)
const MONTH_LABELS_STYLE = { height: '15px' } as const;

// Pre-generate skeleton keys for stable rendering
const SKELETON_DAYS = DAY_LABELS.map((d) => `skel-day-${d}`);
const SKELETON_WEEKS = Array.from({ length: 53 }, (_, w) => ({
  key: `skel-week-${w}`,
  days: Array.from({ length: 7 }, (_, d) => `skel-${w}-${d}`),
}));

function ActivityGraphSkeleton() {
  return (
    <div className="w-full animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-48 bg-white/[0.06] rounded" />
      </div>
      {/* Graph skeleton */}
      <div className="flex gap-[2px]">
        {/* Day labels skeleton */}
        <div className="flex flex-col gap-[2px] pr-2">
          {SKELETON_DAYS.map((key) => (
            <div key={key} className="h-[10px] w-6" />
          ))}
        </div>
        {/* Grid skeleton */}
        <div className="flex gap-[2px]">
          {SKELETON_WEEKS.map((week) => (
            <div key={week.key} className="flex flex-col gap-[2px]">
              {week.days.map((dayKey) => (
                <div
                  key={dayKey}
                  className="w-[10px] h-[10px] rounded-sm bg-white/[0.04]"
                />
              ))}
            </div>
          ))}
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

  // Format total time for header
  const hours = Math.floor(totalCount / 60);
  const displayTime = hours > 0 ? hours : Math.ceil(totalCount);
  const timeUnit = hours > 0 ? 'hours' : 'minutes';

  return (
    <div className="w-full">
      {/* Header - GitHub style */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            {displayTime} {timeUnit}
          </span>{' '}
          in the last year
        </p>
      </div>

      {/* Graph Container */}
      <div className="w-full overflow-x-auto pb-2">
        <div className="inline-block min-w-fit">
          {/* Month labels row */}
          <div className="flex mb-1">
            {/* Spacer for day labels column */}
            <div className="w-7 shrink-0" />
            {/* Month labels */}
            <div className="relative flex-1" style={MONTH_LABELS_STYLE}>
              {monthLabels.map((label) => (
                <span
                  key={`${label.name}-${label.weekIndex}`}
                  className="absolute text-[11px] text-muted-foreground"
                  style={{ left: `${label.weekIndex * 12}px` }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          </div>

          {/* Graph with day labels */}
          <div className="flex">
            {/* Day labels column (Sun, Mon, Tue, ...) */}
            <div className="flex flex-col gap-[2px] pr-1 shrink-0">
              {DAY_LABELS.map((dayKey, i) => (
                <div
                  key={dayKey}
                  className="h-[10px] w-6 flex items-center justify-end"
                >
                  <span className="text-[9px] text-muted-foreground leading-none">
                    {DAY_DISPLAY[i]}
                  </span>
                </div>
              ))}
            </div>

            {/* Weeks grid */}
            <div className="flex gap-[2px]">
              {weeks.map((week, weekIndex) => (
                <div key={week[0].dateStr} className="flex flex-col gap-[2px]">
                  {week.map((day) => {
                    // GitHub-inspired colors (red theme)
                    const colors = [
                      'bg-white/[0.06]', // Level 0 - empty
                      'bg-red-900/60', // Level 1
                      'bg-red-700/80', // Level 2
                      'bg-red-600', // Level 3
                      'bg-red-500', // Level 4
                    ];

                    // Position tooltip based on week position to avoid overflow
                    const isLeftSide = weekIndex < 10;
                    const isRightSide = weekIndex > weeks.length - 10;
                    const tooltipPosition = isLeftSide
                      ? 'left-0'
                      : isRightSide
                        ? 'right-0'
                        : 'left-1/2 -translate-x-1/2';
                    const arrowPosition = isLeftSide
                      ? 'left-1'
                      : isRightSide
                        ? 'right-1'
                        : 'left-1/2 -translate-x-1/2';

                    return (
                      <div
                        key={day.dateStr}
                        className={cn(
                          'w-[10px] h-[10px] rounded-sm transition-colors relative group/cell',
                          colors[day.level],
                          day.isValid &&
                            'cursor-pointer hover:ring-1 hover:ring-white/30',
                          !day.isValid && 'opacity-0',
                        )}
                      >
                        {/* Tooltip */}
                        {day.isValid && (
                          <div
                            className={cn(
                              'absolute bottom-full mb-2 hidden group-hover/cell:block z-50 whitespace-nowrap bg-zinc-900 text-white text-[11px] px-2 py-1 rounded shadow-lg pointer-events-none',
                              tooltipPosition,
                            )}
                          >
                            <span className="font-medium">
                              {day.count > 0
                                ? `${Math.ceil(day.count)} min`
                                : 'No activity'}
                            </span>
                            <span className="text-zinc-400">
                              {' '}
                              on {formatDate(day.date)}
                            </span>
                            {/* Arrow */}
                            <div
                              className={cn(
                                'absolute top-full -mt-px border-4 border-transparent border-t-zinc-900',
                                arrowPosition,
                              )}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-1.5 mt-2 text-[11px] text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-[2px]">
              <div className="w-[10px] h-[10px] rounded-sm bg-white/[0.06]" />
              <div className="w-[10px] h-[10px] rounded-sm bg-red-900/60" />
              <div className="w-[10px] h-[10px] rounded-sm bg-red-700/80" />
              <div className="w-[10px] h-[10px] rounded-sm bg-red-600" />
              <div className="w-[10px] h-[10px] rounded-sm bg-red-500" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
