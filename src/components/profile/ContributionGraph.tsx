'use client';

/**
 * GitHub-style contribution graph for watch activity
 */

import { useMemo } from 'react';
import type { DailyActivity } from '@/services/api/user';
import { formatWatchTime } from '@/services/api/user';

interface ContributionGraphProps {
  activities: DailyActivity[];
  className?: string;
}

// Colors for different activity levels (GitHub-like palette)
const LEVEL_COLORS = [
  'var(--contribution-level-0, #1a1a2e)', // No activity
  'var(--contribution-level-1, #0e4429)', // Low
  'var(--contribution-level-2, #006d32)', // Medium-low
  'var(--contribution-level-3, #26a641)', // Medium-high
  'var(--contribution-level-4, #39d353)', // High
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ContributionGraph({ activities, className = '' }: ContributionGraphProps) {
  // Build a map of date -> activity for quick lookup
  const activityMap = useMemo(() => {
    const map = new Map<string, DailyActivity>();
    for (const activity of activities) {
      map.set(activity.date, activity);
    }
    return map;
  }, [activities]);

  // Generate the grid data (52 weeks x 7 days)
  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const weeksData: { date: Date; activity: DailyActivity | null }[][] = [];
    const months: { month: number; weekIndex: number }[] = [];

    // Start from 52 weeks ago
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);

    // Adjust to start on Sunday
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    let currentWeek: { date: Date; activity: DailyActivity | null }[] = [];
    let lastMonth = -1;

    const currentDate = new Date(startDate);

    while (currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const activity = activityMap.get(dateStr) || null;

      // Track month changes for labels
      const month = currentDate.getMonth();
      if (month !== lastMonth) {
        months.push({ month, weekIndex: weeksData.length });
        lastMonth = month;
      }

      currentWeek.push({
        date: new Date(currentDate),
        activity,
      });

      // If we've filled a week (7 days), start a new one
      if (currentWeek.length === 7) {
        weeksData.push(currentWeek);
        currentWeek = [];
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add remaining days
    if (currentWeek.length > 0) {
      weeksData.push(currentWeek);
    }

    return { weeks: weeksData, monthLabels: months };
  }, [activityMap]);

  const formatTooltip = (date: Date, activity: DailyActivity | null) => {
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (activity && activity.watch_seconds > 0) {
      return `${formatWatchTime(activity.watch_seconds)} watched on ${dateStr}`;
    }
    return `No activity on ${dateStr}`;
  };

  return (
    <div className={`contribution-graph ${className}`}>
      <div className="graph-container">
        {/* Day labels */}
        <div className="day-labels">
          <div className="day-label" />
          <div className="day-label">Mon</div>
          <div className="day-label" />
          <div className="day-label">Wed</div>
          <div className="day-label" />
          <div className="day-label">Fri</div>
          <div className="day-label" />
        </div>

        <div className="graph-body">
          {/* Month labels */}
          <div className="month-labels">
            {monthLabels.map(({ month, weekIndex }) => (
              <span
                key={`${month}-${weekIndex}`}
                className="month-label"
                style={{ gridColumn: weekIndex + 1 }}
              >
                {MONTHS[month]}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="grid">
            {weeks.map((week, weekIndex) => (
              <div key={`week-${weekIndex}`} className="week">
                {week.map(({ date, activity }) => {
                  const level = activity?.level ?? 0;
                  const dateStr = date.toISOString().split('T')[0];
                  return (
                    <div
                      key={dateStr}
                      className="day"
                      style={{ backgroundColor: LEVEL_COLORS[level] }}
                      title={formatTooltip(date, activity)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="legend">
        <span className="legend-label">Less</span>
        {LEVEL_COLORS.map((color, i) => (
          <div
            key={`legend-${color}`}
            className="legend-item"
            style={{ backgroundColor: color }}
            title={getLevelDescription(i)}
          />
        ))}
        <span className="legend-label">More</span>
      </div>

      <style jsx>{`
        .contribution-graph {
          width: 100%;
          overflow-x: auto;
        }
        
        .graph-container {
          display: flex;
          gap: 4px;
          min-width: fit-content;
        }
        
        .day-labels {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 10px;
          color: var(--text-secondary, #8b949e);
          padding-top: 20px;
        }
        
        .day-label {
          height: 13px;
          line-height: 13px;
        }
        
        .graph-body {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .month-labels {
          display: grid;
          grid-template-columns: repeat(53, 13px);
          gap: 3px;
          font-size: 10px;
          color: var(--text-secondary, #8b949e);
          height: 16px;
        }
        
        .month-label {
          white-space: nowrap;
        }
        
        .grid {
          display: flex;
          gap: 3px;
        }
        
        .week {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        
        .day {
          width: 13px;
          height: 13px;
          border-radius: 2px;
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        
        .day:hover {
          transform: scale(1.3);
          outline: 1px solid rgba(255, 255, 255, 0.3);
        }
        
        .legend {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 12px;
          font-size: 11px;
          color: var(--text-secondary, #8b949e);
        }
        
        .legend-label {
          margin: 0 4px;
        }
        
        .legend-item {
          width: 13px;
          height: 13px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

function getLevelDescription(level: number): string {
  switch (level) {
    case 0:
      return 'No activity';
    case 1:
      return '1-30 minutes';
    case 2:
      return '31-60 minutes';
    case 3:
      return '1-2 hours';
    case 4:
      return '2+ hours';
    default:
      return '';
  }
}
