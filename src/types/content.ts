/**
 * Core content types shared across the application (Search, Watch, Watchlist, Home).
 */

export enum ContentType {
  Movie = 'Movie',
  Series = 'Series',
}

export interface Episode {
  episodeId: string;
  seriesId: string;
  episodeNumber: number;
  seasonNumber?: number;
  title?: string;
  thumbnailUrl: string;
  duration?: number;
  description?: string;
}

export interface Season {
  seasonNumber: number;
  seasonId: string;
  episodeCount: number;
}

export interface ShowDetails {
  id: string;
  title: string;
  year?: string;
  description?: string;
  cast?: string;
  genre?: string;
  runtime?: string;
  rating?: string;
  matchScore?: string;
  quality?: string;
  contentType: ContentType;
  seasons: Season[];
  episodes: Episode[];
  defaultLanguage?: string;
  posterUrl: string;
  posterHdUrl: string;
  dubs?: {
    lanName: string;
    lanCode?: string;
    detailPath: string;
    subjectId: string;
    contentType: ContentType;
  }[];
  trailers?: {
    key: string;
    url?: string;
    name?: string;
    site?: string;
    type?: string;
    thumbnail?: string;
  }[];
}

export interface PlayResponse {
  success: boolean;
  type: 'movie' | 'series';
  title: string;
  season?: number;
  episode?: number;
  movieId: string;
  masterPlaylistUrl: string;
  streamUrls?: string[];
  spriteVtt?: string;
  subtitleTracks?: { label: string; language: string; url: string }[];
  captionSrt?: string;
  qualities?: { quality: string; url: string }[];
  spriteSheets?: SpriteSheet[];
  /** Language dubs for server 2 — each entry is a separate MP4 URL */
  audioTracks?: { language: string; label: string; streamUrl: string }[];
  /** Provider-sourced content duration in seconds (S2 MP4 CDN omits Content-Length so video.duration is Infinity) */
  durationSeconds?: number;
}

export interface SpriteSheet {
  movieId: string;
  imageUrl: string;
  vttUrl?: string;
  width: number;
  height: number;
  columns: number;
  rows: number;
  interval: number;
}

export interface ContentProgress {
  progressSeconds: number;
  progressPercent: number;
  seasonNumber?: number;
  episodeNumber?: number;
  episodeTitle?: string;
  progressId?: string;
}

export interface WatchProgress extends ContentProgress {
  id: string;
  contentId: string;
  contentType: ContentType;
  title: string;
  posterUrl: string;
  durationSeconds: number;
  remainingSeconds: number;
  remainingMinutes: number;
  lastWatchedAt: string;
  /** Which server this progress entry was saved for ('s1', 's2', or 's3') */
  providerId?: 's1' | 's2' | 's3';
  episodeId?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  contentType: ContentType;
  poster: string;
  year?: number;
}

export interface PlayMovieParams {
  type: 'movie';
  title: string;
  movieId?: string;
  duration?: number; // Duration in seconds for smart caching
  server?: string;
}

export interface PlaySeriesParams {
  type: 'series';
  title: string;
  seriesId?: string;
  season: number;
  episode: number;
  duration?: number; // Duration in seconds for smart caching
  server?: string;
}

export type PlayParams = PlayMovieParams | PlaySeriesParams;

export interface WatchlistItem {
  id: string;
  contentId: string;
  title: string;
  posterUrl: string;
  contentType: ContentType;
  addedAt: string;
}
