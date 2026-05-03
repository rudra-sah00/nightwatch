'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { WatchActivity } from '../types';

// Helper to get ISO date string YYYY-MM-DD (Local)
const toIso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Props for the {@link ActivityGraph} component. */
interface ActivityGraphProps {
  /** Array of daily watch activity records. */
  activity: WatchActivity[];
  /** Whether the activity data is still loading. */
  isLoading?: boolean;
}

const ACTIVITY_LEVEL_COLORS = [
  'bg-secondary', // Level 0 - empty
  'bg-neo-blue/40', // Level 1
  'bg-neo-blue', // Level 2
  'bg-neo-yellow', // Level 3
  'bg-neo-red', // Level 4
] as const;

const MONTH_KEYS = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const;

function getMonthLabelsFromWeeks(
  weeks: { date: Date }[][],
  t: (key: string) => string,
) {
  const labels: { key: string; label: string }[] = [];
  let lastMonth = -1;
  for (const week of weeks) {
    const month = week[0].date.getMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      labels.push({
        key: `${month}-${week[0].date.getFullYear()}`,
        label: t(`activity.months.${MONTH_KEYS[month]}`),
      });
    }
  }
  return labels;
}

function getMonthLabelsForSkeleton(t: (key: string) => string) {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const start = new Date(today);
  start.setDate(today.getDate() - (52 * 7 + dayOfWeek));
  const labels: { key: string; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < 53; w++) {
    const d = new Date(start);
    d.setDate(start.getDate() + w * 7);
    const month = d.getMonth();
    if (month !== lastMonth) {
      lastMonth = month;
      labels.push({
        key: `${month}-${d.getFullYear()}`,
        label: t(`activity.months.${MONTH_KEYS[month]}`),
      });
    }
  }
  return labels;
}

/** Placeholder skeleton rendered while activity data is loading. */
function ActivityGraphSkeleton() {
  const t = useTranslations('profile');
  const skeletonIds = useMemo(
    () => Array.from({ length: 53 * 7 }).map((_, i) => `skel-id-${i}`),
    [],
  );
  const monthLabels = useMemo(() => getMonthLabelsForSkeleton(t), [t]);

  return (
    <div className="w-full animate-pulse">
      <div className="grid grid-flow-col grid-rows-7 gap-1 min-w-[800px] mb-4">
        {skeletonIds.map((id) => (
          <div
            key={id}
            className="w-3 h-3 bg-primary/5 border border-border/10"
          ></div>
        ))}
      </div>
      <div className="flex justify-between mt-4 text-[10px] font-bold uppercase font-headline text-foreground/20 min-w-[800px]">
        {monthLabels.map((m) => (
          <span key={m.key}>{m.label}</span>
        ))}
      </div>
    </div>
  );
}

/**
 * Computes the 53-week grid data for the activity heatmap.
 *
 * Maps raw activity records onto a calendar grid spanning the last 52 weeks
 * plus the current partial week, assigning intensity levels (0–4) based on
 * watch minutes per day.
 *
 * @param activity - Array of daily watch activity records.
 * @param createdAt - Optional account creation date to grey out pre-creation days.
 * @returns Object containing the `weeks` 2D array for rendering.
 */
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

/**
 * GitHub-style activity heatmap showing daily watch activity over the past year.
 *
 * Renders a 53×7 grid of colored cells with hover tooltips displaying watch
 * minutes and date. Shows a skeleton placeholder while loading.
 *
 * @param props - Activity data, optional account creation date, and loading flag.
 */
export function ActivityGraph({
  activity,
  createdAt,
  isLoading = false,
}: ActivityGraphProps & { createdAt?: Date }) {
  const t = useTranslations('profile');
  const locale = useLocale();
  const { weeks } = useActivityGraphData(activity, createdAt);
  const monthLabels = useMemo(
    () => getMonthLabelsFromWeeks(weeks, t),
    [weeks, t],
  );

  const formatDate = (date: Date) =>
    date.toLocaleDateString(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  if (isLoading) {
    return <ActivityGraphSkeleton />;
  }

  return (
    <>
      <div
        className="grid grid-flow-col grid-rows-7 gap-1 min-w-[800px]"
        role="img"
        aria-label={t('activity.heatmapAriaLabel')}
      >
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
              ? 'bottom-full -mb-px border-b-primary border-t-transparent'
              : 'top-full -mt-px border-t-primary border-b-transparent';

            return (
              <div
                key={day.dateStr}
                className={cn(
                  'w-3 h-3 border border-border/10 transition-colors relative group/cell',
                  ACTIVITY_LEVEL_COLORS[day.level],
                  day.isValid && day.level > 0
                    ? 'hover:border-border hover:z-50'
                    : '',
                  !day.isValid ? 'opacity-0' : 'cursor-pointer',
                )}
              >
                {/* Tooltip */}
                {day.isValid && (
                  <div
                    className={cn(
                      'absolute hidden group-hover/cell:block z-50 whitespace-nowrap bg-primary text-primary-foreground font-headline tracking-tighter text-[11px] px-2 py-1 shadow-lg pointer-events-none uppercase font-bold',
                      tooltipHorizontal,
                      tooltipVertical,
                    )}
                  >
                    <span>
                      {day.count > 0
                        ? t('activity.minSuffix', {
                            count: Math.ceil(day.count),
                          })
                        : t('activity.noActivity')}
                    </span>
                    <span className="text-primary-foreground/60 ml-2">
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
      <div className="flex justify-between mt-4 text-[10px] font-bold uppercase font-headline text-foreground/40 min-w-[800px]">
        {monthLabels.map((m) => (
          <span key={m.key}>{m.label}</span>
        ))}
      </div>
    </>
  );
}
