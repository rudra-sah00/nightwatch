// Watch feature types - re-exports from player types
export * from './player/types';

// API types
export interface StreamResponse {
  masterPlaylistUrl: string;
  movieId: string;
  token?: string;
}

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
  // Series specific
  episodeId?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
}

export interface WatchActivity {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}
