// Media Service
// Handles all media-related API calls (search, video data, episodes, etc.)

import type {
  CompleteVideoData,
  ContentType,
  SeriesEpisodesResponse,
  ShowDetailsResponse,
  VideoMetadata,
  VideoPlaylistResponse,
} from '@/types/content';
import { type ApiResponse, apiRequest } from './client';

// ============ Search Types ============

export interface SearchResult {
  id: string;
  title: string;
  type: ContentType;
  poster: string;
  year?: number;
}

export interface SearchResponse {
  results: SearchResult[];
}

// ============ Search Functions ============

/**
 * Search for movies and TV shows
 */
export async function search(
  query: string,
  options: RequestInit = {}
): Promise<ApiResponse<SearchResponse>> {
  return apiRequest<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}`, options);
}

/**
 * Search IMDB for additional metadata
 */
export async function searchImdb(
  query: string,
  options: RequestInit = {}
): Promise<ApiResponse<VideoMetadata | null>> {
  return apiRequest<VideoMetadata | null>(
    `/api/video/search/imdb?q=${encodeURIComponent(query)}`,
    options
  );
}

// ============ Video Data Functions ============

/**
 * Get complete video data for playback (movie) with proxied URLs
 */
export async function getVideoData(
  movieId: string,
  options: RequestInit = {}
): Promise<ApiResponse<{ video: CompleteVideoData }>> {
  return apiRequest<{ video: CompleteVideoData }>(`/api/video/${movieId}/proxied`, options);
}

/**
 * Get video playlist
 */
export async function getVideoPlaylist(
  movieId: string,
  options: RequestInit = {}
): Promise<ApiResponse<VideoPlaylistResponse>> {
  return apiRequest<VideoPlaylistResponse>(`/api/video/${movieId}/playlist`, options);
}

/**
 * Get episode stream data for a specific episode with proxied URLs
 */
export async function getEpisodeData(
  seriesId: string,
  episodeId: string,
  options: RequestInit = {}
): Promise<ApiResponse<{ video: CompleteVideoData }>> {
  return apiRequest<{ video: CompleteVideoData }>(
    `/api/series/${seriesId}/episode/${episodeId}/proxied`,
    options
  );
}

/**
 * Get show details (metadata, seasons, episodes list)
 */
export async function getShowDetails(
  showId: string,
  options: RequestInit = {}
): Promise<ApiResponse<ShowDetailsResponse>> {
  return apiRequest<ShowDetailsResponse>(`/api/video/show/${showId}`, options);
}

/**
 * Get episodes for a specific season (Legacy/Hit-and-trial)
 */
export async function getSeriesEpisodes(
  seriesId: string,
  startEpisode?: string,
  options: RequestInit = {}
): Promise<ApiResponse<SeriesEpisodesResponse>> {
  const params = startEpisode ? `?start_episode=${startEpisode}` : '';
  return apiRequest<SeriesEpisodesResponse>(`/api/series/${seriesId}/episodes${params}`, options);
}

// ============ Asset Utilities ============

/**
 * Get poster URL for a show/movie (CDN)
 */
export function getPosterUrl(id: string, hd: boolean = false): string {
  return hd ? `https://imgcdn.kim/poster/h/${id}.jpg` : `https://imgcdn.kim/poster/341/${id}.jpg`;
}

/**
 * Get thumbnail URL for an episode (CDN)
 */
export function getThumbnailUrl(episodeId: string): string {
  return `https://imgcdn.kim/epimg/150/${episodeId}.jpg`;
}

// Alias for backward compatibility
export const getEpisodeThumbnailUrl = getThumbnailUrl;

/**
 * Get sprite sheet URL for timeline preview (CDN)
 */
export function getSpriteSheetUrl(movieId: string): string {
  return `https://back02.nfmirrorcdn.top/files/${movieId}/t001.jpg`;
}
