// Watch feature types - re-exports from player types

export * from '@/types/content';
export * from './player/context/types';

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
