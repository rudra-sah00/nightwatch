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

const ACTIVITY_LEVEL_COLORS = [
  'bg-[#f1ece4]', // Level 0 - empty
  'bg-[#b3ccff]', // Level 1
  'bg-[#0055ff]', // Level 2
  'bg-[#ffcc00]', // Level 3
  'bg-[#e63b2e]', // Level 4
] as const;

function ActivityGraphSkeleton() {
  const skeletonIds = useMemo(
    () => Array.from({ length: 53 * 7 }).map((_, i) => `skel-id-${i}`),
    [],
  );

  return (
    <div className="w-full animate-pulse">
      <div className="grid grid-flow-col grid-rows-7 gap-1 min-w-[800px] mb-4">
        {skeletonIds.map((id) => (
          <div
            key={id}
            className="w-3 h-3 bg-[#1a1a1a]/5 border border-[#1a1a1a]/10"
          ></div>
        ))}
      </div>
      <div className="flex justify-between mt-4 text-[10px] font-bold uppercase font-headline text-[#1a1a1a]/20">
        <span>Jan</span>
        <span>Feb</span>
        <span>Mar</span>
        <span>Apr</span>
        <span>May</span>
        <span>Jun</span>
        <span>Jul</span>
        <span>Aug</span>
        <span>Sep</span>
        <span>Oct</span>
        <span>Nov</span>
        <span>Dec</span>
      </div>
    </div>
  );
}

function useActivityGraphData(activity: WatchActivity[], createdAt?: Date) {
  return useMemo(() => {
    // Strip time to ensure consistent comparisons
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const activityByDate = new Map(activity?.map((a) => [a.date, a]) ?? []);

    const dayOfWeek = today.getDay();
    const daysToSubtract = 52 * 7 + dayOfWeek;

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysToSubtract);
    startDate.setHours(0, 0, 0, 0);

    const weeksData: {
      date: Date;
      dateStr: string;
      count: number;
      level: number;
      isValid: boolean;
    }[][] = [];
    let _total = 0;

    const currentDate = new Date(startDate);
    const creationDay = createdAt ? new Date(createdAt) : null;
    if (creationDay) creationDay.setHours(0, 0, 0, 0);

    const todayMidnight = new Date(today);
    todayMidnight.setHours(0, 0, 0, 0);

    for (let w = 0; w < 53; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = toIso(currentDate);

        const isAfterCreation = creationDay ? currentDate >= creationDay : true;
        const checkDate = new Date(currentDate);
        checkDate.setHours(0, 0, 0, 0);
        const isFuture = checkDate > todayMidnight;

        let count = 0;
        let level = 0;

        if (isAfterCreation && !isFuture) {
          const dayActivity = activityByDate.get(dateStr);
          count = dayActivity?.count || 0;
          _total += count;

          if (dayActivity?.level) {
            level = dayActivity.level;
          } else if (count > 0) {
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

        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeksData.push(week);
    }

    return { weeks: weeksData };
  }, [activity, createdAt]);
}

export function ActivityGraph({
  activity,
  createdAt,
  isLoading = false,
}: ActivityGraphProps & { createdAt?: Date }) {
  const { weeks } = useActivityGraphData(activity, createdAt);

  if (isLoading) {
    return <ActivityGraphSkeleton />;
  }

  return (
    <>
      <div className="grid grid-flow-col grid-rows-7 gap-1 min-w-[800px]">
        {weeks.map((week, weekIndex) =>
          week.map((day, dayIndex) => {
            const isLeftSide = weekIndex < 10;
            const isRightSide = weekIndex > weeks.length - 10;
            const tooltipHorizontal = isLeftSide
              ? 'left-0'
              : isRightSide
                ? 'right-0'
                : 'left-1/2 -translate-x-1/2';
            const arrowHorizontal = isLeftSide
              ? 'left-1'
              : isRightSide
                ? 'right-1'
                : 'left-1/2 -translate-x-1/2';

            const isTopRow = dayIndex < 3;
            const tooltipVertical = isTopRow
              ? 'top-full mt-2'
              : 'bottom-full mb-2';
            const arrowVertical = isTopRow
              ? 'bottom-full -mb-px border-b-[#1a1a1a] border-t-transparent'
              : 'top-full -mt-px border-t-[#1a1a1a] border-b-transparent';

            return (
              <div
                key={day.dateStr}
                className={cn(
                  'w-3 h-3 border border-[#1a1a1a]/10 transition-colors relative group/cell',
                  ACTIVITY_LEVEL_COLORS[day.level],
                  day.isValid && day.level > 0
                    ? 'hover:border-[#1a1a1a] hover:z-50'
                    : '',
                  !day.isValid ? 'opacity-0' : 'cursor-pointer',
                )}
              >
                {/* Tooltip */}
                {day.isValid && (
                  <div
                    className={cn(
                      'absolute hidden group-hover/cell:block z-50 whitespace-nowrap bg-[#1a1a1a] text-white font-headline tracking-tighter text-[11px] px-2 py-1 shadow-lg pointer-events-none uppercase font-bold',
                      tooltipHorizontal,
                      tooltipVertical,
                    )}
                  >
                    <span>
                      {day.count > 0
                        ? `${Math.ceil(day.count)} min`
                        : 'No activity'}
                    </span>
                    <span className="text-white/60 ml-2">
                      {formatDate(day.date)}
                    </span>
                    <div
                      className={cn(
                        'absolute border-4 border-transparent',
                        arrowHorizontal,
                        arrowVertical,
                      )}
                    />
                  </div>
                )}
              </div>
            );
          }),
        )}
      </div>
      <div className="flex justify-between mt-4 text-[10px] font-bold uppercase font-headline text-[#1a1a1a]/40">
        <span>Jan</span>
        <span>Feb</span>
        <span>Mar</span>
        <span>Apr</span>
        <span>May</span>
        <span>Jun</span>
        <span>Jul</span>
        <span>Aug</span>
        <span>Sep</span>
        <span>Oct</span>
        <span>Nov</span>
        <span>Dec</span>
      </div>
    </>
  );
}
