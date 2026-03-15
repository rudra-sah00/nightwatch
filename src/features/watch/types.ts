// Watch feature types - re-exports from player types
export * from './player/context/types';

export interface WatchProgress {
  id: string;
  contentId: string;
  contentType: 'Movie' | 'Series';
  title: string;
  posterUrl: string;
  progressSeconds: number;
  durationSeconds: number;
  progressPercent: number;
  remainingSeconds: number;
  remainingMinutes: number;
  lastWatchedAt: string;
  /** Which server this progress entry was saved for ('s1', 's2', or 's3') */
  providerId?: 's1' | 's2' | 's3';
  // Series specific
  episodeId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
}
