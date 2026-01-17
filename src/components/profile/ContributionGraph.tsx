'use client';

/**
 * Premium Contribution Graph
 * A highly aesthetic, glowing activity heatmap
 */

import type React from 'react';
import { useMemo, useState } from 'react';
import type { DailyActivity } from '@/services/api/user';
import { formatWatchTime } from '@/services/api/user';

interface ContributionGraphProps {
  activities: DailyActivity[];
  className?: string;
}

// Premium Color Palette (Dark Mode Glows)
// Level 0: Near black/invisible
// Level 1-4: Progressively brighter neon green/emerald
const THEME = {
  background: 'transparent',
  levelColors: [
    'rgba(255, 255, 255, 0.03)', // Level 0 (Empty)
    'rgba(16, 185, 129, 0.3)', // Level 1
    'rgba(16, 185, 129, 0.5)', // Level 2
    'rgba(16, 185, 129, 0.7)', // Level 3
    '#10b981', // Level 4 (Max)
  ],
  glows: [
    'none',
    '0 0 5px rgba(16, 185, 129, 0.1)',
    '0 0 8px rgba(16, 185, 129, 0.2)',
    '0 0 12px rgba(16, 185, 129, 0.3)',
    '0 0 16px rgba(16, 185, 129, 0.4)',
  ],
  text: '#71717a', // Zinc-500
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ContributionGraph({ activities, className = '' }: ContributionGraphProps) {
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
      // Add month label if it changes and we are at least 2 weeks in (to avoid label at very edge)
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
    setHoveredData({
      x: rect.left + rect.width / 2,
      y: rect.top,
      date,
      activity,
    });
  };

  return (
    <div className={`contribution-wrapper ${className}`}>
      <div className="graph-scroll-container">
        <div className="graph-content">
          {/* Month Labels */}
          <div className="months-row">
            {monthLabels.map(({ month, weekIndex }) => (
              <span
                key={`month-${month}-${weekIndex}`}
                className="month-label"
                style={{ left: `${weekIndex * 16}px` }}
              >
                {MONTHS[month]}
              </span>
            ))}
          </div>

          {/* Activity Grid */}
          <div className="grid">
            {weeks.map((week) => (
              <div key={`week-${week[0].date.toISOString()}`} className="week-col">
                {week.map(({ date, activity }) => {
                  const level = activity?.level ?? 0;
                  const dateStr = date.toISOString().split('T')[0];

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      className="day-cell"
                      aria-label={`${dateStr}: ${activity ? formatWatchTime(activity.watch_seconds) : 'No activity'}`}
                      style={{
                        backgroundColor: THEME.levelColors[level],
                        boxShadow: THEME.glows[level],
                      }}
                      onMouseEnter={(e) => handleMouseEnter(e, date, activity)}
                      onMouseLeave={() => setHoveredData(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          // Allow keyboard activation if we had click logic
                        }
                      }}
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
        <span className="legend-text">Less</span>
        <div className="legend-scale">
          {[0, 1, 2, 3, 4].map((level) => (
            <div
              key={`legend-${level}`}
              className="day-cell legend-item"
              style={{
                backgroundColor: THEME.levelColors[level],
                boxShadow: THEME.glows[level],
              }}
            />
          ))}
        </div>
        <span className="legend-text">More</span>
      </div>

      {/* Fixed Tooltip Overlay */}
      {hoveredData && (
        <div
          className="fixed-tooltip"
          style={{
            top: hoveredData.y - 8,
            left: hoveredData.x,
          }}
        >
          <div className="tooltip-date">
            {hoveredData.date.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </div>
          <div className="tooltip-time">
            {hoveredData.activity
              ? formatWatchTime(hoveredData.activity.watch_seconds)
              : 'No activity'}
          </div>
          {(hoveredData.activity?.level ?? 0) > 0 && (
            <div className="tooltip-level">Level {hoveredData.activity?.level}</div>
          )}
        </div>
      )}

      <style jsx>{`
        .contribution-wrapper {
          width: 100%;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 24px;
          backdrop-filter: blur(10px);
        }

        .graph-scroll-container {
          overflow-x: auto;
          overflow-y: hidden;
          padding-bottom: 12px;
          /* Custom Scrollbar */
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
        }

        .graph-scroll-container::-webkit-scrollbar {
          height: 6px;
        }
        .graph-scroll-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .graph-scroll-container::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
        }

        .graph-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: max-content;
        }

        .months-row {
          position: relative;
          height: 20px;
          margin-bottom: 4px;
        }

        .month-label {
          position: absolute;
          font-size: 11px;
          color: ${THEME.text};
          font-weight: 500;
        }

        .grid {
          display: flex;
          gap: 4px;
        }

        .week-col {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .day-cell {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          transition: all 0.2s;
          cursor: pointer;
          border: none;
          padding: 0;
          appearance: none;
        }

        .day-cell:hover {
          transform: scale(1.2);
          border: 1px solid rgba(255,255,255,0.5);
        }

        /* Fixed Tooltip Styling */
        .fixed-tooltip {
          position: fixed;
          background: #09090b;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 8px 12px;
          border-radius: 8px;
          pointer-events: none;
          z-index: 9999;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          gap: 2px;
          transform: translate(-50%, -100%);
          min-width: 150px;
          pointer-events: none;
        }

        .tooltip-date {
          color: #a1a1aa;
          font-size: 11px;
        }
        
        .tooltip-time {
          color: #ffffff;
          font-weight: 600;
          font-size: 13px;
        }

        .tooltip-level {
          font-size: 10px;
          color: #10b981;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-top: 2px;
        }

        /* Legend Styling */
        .legend {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 16px;
        }

        .legend-scale {
          display: flex;
          gap: 4px;
        }

        .legend-text {
          font-size: 11px;
          color: ${THEME.text};
        }

        .legend-item {
          cursor: default;
        }
        .legend-item:hover {
          transform: none;
          border: none;
        }
      `}</style>
    </div>
  );
}
