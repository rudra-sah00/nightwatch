import { describe, expect, it } from 'vitest';
import type { WatchActivity } from '@/features/profile/types';
import type { WatchProgress } from '@/features/watch/types';
import { ContentType } from '@/types/content';

describe('Watch Types', () => {
  it('creates valid WatchProgress for series', () => {
    const progress: WatchProgress = {
      id: 'progress-1',
      contentId: 'show-1',
      contentType: ContentType.Series,
      title: 'Breaking Bad',
      posterUrl: 'https://example.com/poster.jpg',
      progressSeconds: 1200,
      durationSeconds: 2700,
      progressPercent: 44.44,
      remainingSeconds: 1500,
      remainingMinutes: 25,
      lastWatchedAt: '2024-01-15T10:30:00Z',
      seasonNumber: 1,
      episodeNumber: 1,
      episodeId: 'ep-1',
      episodeTitle: 'Pilot',
    };

    expect(progress.contentType).toBe(ContentType.Series);
    expect(progress.seasonNumber).toBe(1);
    expect(progress.episodeNumber).toBe(1);
    expect(progress.episodeId).toBe('ep-1');
  });

  it('creates valid WatchProgress for movie', () => {
    const progress: WatchProgress = {
      id: 'progress-2',
      contentId: 'movie-1',
      contentType: ContentType.Movie,
      title: 'The Dark Knight',
      posterUrl: 'https://example.com/poster.jpg',
      progressSeconds: 3600,
      durationSeconds: 9120,
      progressPercent: 39.47,
      remainingSeconds: 5520,
      remainingMinutes: 92,
      lastWatchedAt: '2024-01-15T10:30:00Z',
    };

    expect(progress.contentType).toBe(ContentType.Movie);
    expect(progress.seasonNumber).toBeUndefined();
    expect(progress.episodeNumber).toBeUndefined();
    expect(progress.episodeId).toBeUndefined();
  });

  it('calculates progress percentage correctly', () => {
    const progress: WatchProgress = {
      id: 'progress-3',
      contentId: 'movie-1',
      contentType: ContentType.Movie,
      title: 'Test Movie',
      posterUrl: 'https://example.com/poster.jpg',
      progressSeconds: 1800,
      durationSeconds: 3600,
      progressPercent: 50,
      remainingSeconds: 1800,
      remainingMinutes: 30,
      lastWatchedAt: '2024-01-15T10:30:00Z',
    };

    const calculatedPercent =
      (progress.progressSeconds / progress.durationSeconds) * 100;
    expect(Math.round(calculatedPercent)).toBe(50);
  });

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
});
