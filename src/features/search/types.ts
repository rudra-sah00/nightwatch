// Search history
export interface SearchHistory {
  id: string;
  query: string;
  createdAt: string;
}

// Content type enum matching backend
export enum ContentType {
  Movie = 'Movie',
  Series = 'Series',
}

// Search result from API
export interface SearchResult {
  id: string;
  title: string;
  contentType: ContentType;
  poster: string;
  year?: number;
}

// Episode info
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

// Season info
export interface Season {
  seasonNumber: number;
  seasonId: string;
  episodeCount: number;
}

// Show details (movie or series)
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
  trailers?: {
    key: string;
    url?: string;
    name?: string;
    site?: string;
    type?: string;
  }[];
}

// Play response from backend
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

// Sprite sheet for video preview
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
