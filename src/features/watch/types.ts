// Watch feature types - re-exports from player types

export * from '@/types/content';
export * from './player/context/types';

/** Parameters required to initiate VOD or livestream playback. */
export interface PlayParams {
  type: 'movie' | 'series' | 'livestream';
  title: string;
  season?: number;
  episode?: number;
  duration?: number;
  server?: string;
  movieId?: string;
  seriesId?: string;
}
