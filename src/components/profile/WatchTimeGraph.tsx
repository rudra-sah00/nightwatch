'use client';

/**
 * Premium Contribution Graph
 * A highly aesthetic, glowing activity heatmap - Tailwind CSS optimized
 */

import type React from 'react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { DailyActivity } from '@/services/api/user';
import { formatWatchTime, formatWatchTimeDetailed } from '@/services/api/user';

interface WatchTimeGraphProps {
  activities: DailyActivity[];
  className?: string;
}

// Level colors and glows
const LEVEL_STYLES = [
  { bg: 'bg-white/[0.03]', shadow: '' },
  { bg: 'bg-emerald-500/30', shadow: 'shadow-[0_0_5px_rgba(16,185,129,0.1)]' },
  { bg: 'bg-emerald-500/50', shadow: 'shadow-[0_0_8px_rgba(16,185,129,0.2)]' },
  { bg: 'bg-emerald-500/70', shadow: 'shadow-[0_0_12px_rgba(16,185,129,0.3)]' },
  { bg: 'bg-emerald-500', shadow: 'shadow-[0_0_16px_rgba(16,185,129,0.4)]' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function WatchTimeGraph({ activities, className = '' }: WatchTimeGraphProps) {
  // Build lookup map
  const activityMap = useMemo(() => {
    const map = new Map<string, DailyActivity>();
    for (const activity of activities) {
      map.set(activity.date, activity);
    }
    return map;
  }, [activities]);

  // Generate grid data
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const weeksData: { date: Date; activity: DailyActivity | null }[][] = [];
    const months: { month: number; weekIndex: number }[] = [];

    // Start 52 weeks ago
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);

    // Align to Sunday
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    let currentWeek: { date: Date; activity: DailyActivity | null }[] = [];
    let lastMonth = -1;

    const currentDate = new Date(startDate);

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const activity = activityMap.get(dateStr) || null;

      const month = currentDate.getMonth();
      // Add month label if it changes and we are at least 2 weeks in
      if (month !== lastMonth) {
        if (weeksData.length > 1) {
          months.push({ month, weekIndex: weeksData.length });
        }
        lastMonth = month;
      }

      currentWeek.push({
        date: new Date(currentDate),
        activity,
      });

      if (currentWeek.length === 7) {
        weeksData.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add partial last week
    if (currentWeek.length > 0) {
      weeksData.push(currentWeek);
    }

    return { weeks: weeksData, monthLabels: months };
  }, [activityMap]);

  // Tooltip state
  const [hoveredData, setHoveredData] = useState<{
    x: number;
    y: number;
    date: Date;
    activity: DailyActivity | null;
  } | null>(null);

  const handleMouseEnter = (e: React.MouseEvent, date: Date, activity: DailyActivity | null) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const container = e.currentTarget.closest('.contribution-wrapper')?.getBoundingClientRect();

    if (container) {
      setHoveredData({
        x: rect.left - container.left + rect.width / 2,
        y: rect.top - container.top,
        date,
        activity,
      });
    }
  };

  return (
    <div
      className={cn(
        'contribution-wrapper relative w-full bg-black/20 border border-white/5 rounded-2xl p-4 sm:p-6 backdrop-blur-lg',
        className
      )}
    >
      {/* Scrollable Graph Container */}
      <div className="overflow-x-auto overflow-y-hidden pb-3 custom-scrollbar">
        <div className="flex flex-col gap-2 min-w-max">
          {/* Month Labels */}
          <div className="relative h-5 mb-1">
            {monthLabels.map(({ month, weekIndex }) => (
              <span
                key={`month-${month}-${weekIndex}`}
                className="absolute text-[11px] text-zinc-500 font-medium"
                style={{ left: `${weekIndex * 16}px` }}
              >
                {MONTHS[month]}
              </span>
            ))}
          </div>

          {/* Activity Grid */}
          <div className="flex gap-1">
            {weeks.map((week) => (
              <div key={`week-${week[0].date.toISOString()}`} className="flex flex-col gap-1">
                {week.map(({ date, activity }) => {
                  const level = activity?.level ?? 0;
                  const dateStr = date.toISOString().split('T')[0];
                  const style = LEVEL_STYLES[level];

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      className={cn(
                        'w-3 h-3 rounded-[3px] border-0 p-0 cursor-pointer transition-all duration-200',
                        'hover:scale-125 hover:ring-1 hover:ring-white/50',
                        style.bg,
                        style.shadow
                      )}
                      aria-label={`${dateStr}: ${activity ? formatWatchTime(activity.watch_seconds) : 'No activity'}`}
                      onMouseEnter={(e) => handleMouseEnter(e, date, activity)}
                      onMouseLeave={() => setHoveredData(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <span className="text-[11px] text-zinc-500">Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((level) => {
            const style = LEVEL_STYLES[level];
            return (
              <div
                key={`legend-${level}`}
                className={cn('w-3 h-3 rounded-[3px]', style.bg, style.shadow)}
              />
            );
          })}
        </div>
        <span className="text-[11px] text-zinc-500">More</span>
      </div>

      {/* Tooltip */}
      {hoveredData && (
        <div
          className="absolute z-50 bg-zinc-950/98 backdrop-blur-xl border border-white/15 px-4 py-3 rounded-xl pointer-events-none min-w-[180px] whitespace-nowrap animate-in fade-in zoom-in-95 duration-200"
          style={{
            top: `${hoveredData.y - 12}px`,
            left: `${hoveredData.x}px`,
            transform: 'translate(-50%, -100%)',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(16, 185, 129, 0.15)',
          }}
        >
          <div className="text-zinc-400 text-[11px]">
            {hoveredData.date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <div className="text-white font-semibold text-[13px] mt-0.5">
            {hoveredData.activity
              ? formatWatchTimeDetailed(hoveredData.activity.watch_seconds)
              : 'No activity tracked'}
          </div>
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
            <div
              className={cn(
                'w-2 h-2 rounded-sm',
                LEVEL_STYLES[hoveredData.activity?.level ?? 0].bg
              )}
            />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
              {(hoveredData.activity?.level ?? 0) > 0
                ? `Activity Level ${hoveredData.activity?.level}`
                : 'No Activity'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
