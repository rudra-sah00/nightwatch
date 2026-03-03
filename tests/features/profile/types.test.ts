import { describe, expect, it } from 'vitest';
import type { WatchActivity } from '@/features/profile/types';

describe('Profile Types', () => {
  it('creates valid WatchActivity', () => {
    const activity: WatchActivity = {
      date: '2024-01-15',
      count: 5,
      level: 3,
    };

    expect(activity.date).toBe('2024-01-15');
    expect(activity.count).toBe(5);
    expect(activity.level).toBe(3);
  });

  it('WatchActivity level is within range', () => {
    const validLevels: WatchActivity['level'][] = [0, 1, 2, 3, 4];

    validLevels.forEach((level) => {
      const activity: WatchActivity = {
        date: '2024-01-15',
        count: level * 2,
        level,
      };

      expect(activity.level).toBeGreaterThanOrEqual(0);
      expect(activity.level).toBeLessThanOrEqual(4);
    });
  });

  it('validates activity levels', () => {
    const activities: WatchActivity[] = [
      { date: '2024-01-01', count: 0, level: 0 }, // No activity
      { date: '2024-01-02', count: 1, level: 1 }, // Low
      { date: '2024-01-03', count: 3, level: 2 }, // Medium
      { date: '2024-01-04', count: 5, level: 3 }, // High
      { date: '2024-01-05', count: 10, level: 4 }, // Very high
    ];

    activities.forEach((activity) => {
      expect(activity.level).toBeGreaterThanOrEqual(0);
      expect(activity.level).toBeLessThanOrEqual(4);
    });
  });
});
