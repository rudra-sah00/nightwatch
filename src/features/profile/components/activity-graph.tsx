'use client';

import React, { useMemo } from 'react';
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
}

export function ActivityGraph({ activity, createdAt }: ActivityGraphProps & { createdAt?: Date }) {
  // Generate dataset
  const { weeks, totalCount } = useMemo(() => {
    // Strip time to ensure consistent comparisons
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today to include today in calculations

    // Calculate start date: 52 weeks ago relative to today
    // We want 53 columns to be safe and cover the full year view
    const daysToSubtract = 52 * 7 + today.getDay();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysToSubtract);
    startDate.setHours(0, 0, 0, 0); // Start at midnight

    // Ensure start date is aligned to Sunday
    if (startDate.getDay() !== 0) {
      startDate.setDate(startDate.getDate() - startDate.getDay());
    }

    const weeksData = [];
    const currentDate = new Date(startDate);
    let total = 0;

    // Generate exactly 53 weeks
    for (let w = 0; w < 53; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = toIso(currentDate);
        // Check if this date is valid (after createdAt)
        const isAfterCreation = createdAt ? currentDate >= createdAt : true;

        // Compare dates without time for future check
        const checkDate = new Date(currentDate);
        checkDate.setHours(0, 0, 0, 0);
        const todayMidnight = new Date(today);
        todayMidnight.setHours(0, 0, 0, 0);

        const isFuture = checkDate > todayMidnight;

        let count = 0;
        let level = 0;

        if (isAfterCreation && !isFuture) {
          const dayActivity = activity?.find((a) => a.date === dateStr);
          count = dayActivity?.count || 0;
          total += count;

          if (dayActivity?.level) level = dayActivity.level;
          else if (count > 0) {
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
          isValid: !isFuture, // Show all non-future dates
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeksData.push(week);
    }

    return { weeks: weeksData, totalCount: total };
  }, [activity, createdAt]);

  // Improve month labels logic
  const monthLabels = useMemo(() => {
    const labels: { name: string; weekIndex: number }[] = [];

    weeks.forEach((week, weekIndex) => {
      const firstDayOfWeek = week[0].date;

      // Logic: Is this the first week of a new month?
      // Check if the month of this week's first day is different from previous week's first day month
      // Note: This matches visually if the column represents the start of the month approximately

      if (weekIndex === 0) {
        labels.push({
          name: firstDayOfWeek.toLocaleDateString('en-US', { month: 'short' }),
          weekIndex: 0,
        });
      } else {
        const prevWeekFirstDay = weeks[weekIndex - 1][0].date;
        if (firstDayOfWeek.getMonth() !== prevWeekFirstDay.getMonth()) {
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
      }
    });
    return labels;
  }, [weeks]);

  return (
    <div className="w-full overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-medium text-foreground">
            {totalCount < 60 ? (
              <span>{Math.ceil(totalCount)} minutes</span>
            ) : (
              <span>{Math.floor(totalCount / 60)} hours</span>
            )}
            <span className="text-muted-foreground font-normal"> watched in the last year</span>
          </h3>
        </div>
      </div>

      <div className="w-full overflow-x-auto pt-8 pb-2 scrollbar-hide">
        <div className="min-w-fit">
          <div className="flex flex-col gap-1">
            {/* Months Row */}
            <div className="flex relative h-5 mb-1">
              {monthLabels.map((label, i) => (
                <span
                  key={`${label.name}-${i}`}
                  className="absolute text-[10px] text-muted-foreground font-medium"
                  style={{
                    left: `${label.weekIndex * (10 + 2)}px`, // 10px width + 2px gap
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>

            {/* Weeks Grid */}
            <div className="flex gap-[2px]">
              {weeks.map((week) => (
                <div key={week[0].dateStr} className="flex flex-col gap-[2px]">
                  {week.map((day) => {
                    // Red Theme Colors (Heatmap style)
                    const themeColors = [
                      'bg-zinc-800/50', // Empty
                      'bg-red-900/40', // L1
                      'bg-red-800/60', // L2
                      'bg-red-600/80', // L3
                      'bg-red-500', // L4
                    ];

                    return (
                      <div
                        key={day.dateStr}
                        className={cn(
                          'w-[10px] h-[10px] rounded-[2px] transition-all duration-300 relative group',
                          themeColors[day.level],
                          !day.isValid && 'invisible opacity-0',
                        )}
                      >
                        {/* Enhanced Tooltip */}
                        {day.isValid && (
                          <div className="absolute bottom-full right-0 mb-3 hidden group-hover:block z-[9999] whitespace-nowrap bg-zinc-900/90 backdrop-blur-md text-zinc-100 text-xs px-3 py-2 rounded-lg shadow-xl border border-white/10 pointer-events-none animate-in fade-in zoom-in-95 duration-200 origin-bottom-right">
                            <div className="font-semibold">{Math.ceil(day.count)} minutes</div>
                            <div className="text-zinc-400 text-[10px]">{formatDate(day.date)}</div>
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

        {/* Legend */}
        <div className="mt-4 flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-[2px]">
            <div className="w-[10px] h-[10px] rounded-[2px] bg-zinc-800/50" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-red-900/40" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-red-800/60" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-red-600/80" />
            <div className="w-[10px] h-[10px] rounded-[2px] bg-red-500" />
          </div>
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
