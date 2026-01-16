// Media Service
// Handles all media-related API calls (search, video data, episodes, etc.)

import { apiRequest, ApiResponse } from './client';
import type {
    CompleteVideoData,
    ShowDetails,
    Episode,
    VideoMetadata,
    ContentType,
    SeriesEpisodesResponse,
    VideoPlaylistResponse,
    ShowDetailsResponse
} from '@/types/content';

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
export async function search(query: string): Promise<ApiResponse<SearchResponse>> {
    return apiRequest<SearchResponse>(
        `/api/search?q=${encodeURIComponent(query)}`
    );
}

/**
 * Search IMDB for additional metadata
 */
export async function searchImdb(
    query: string
): Promise<ApiResponse<VideoMetadata | null>> {
    return apiRequest<VideoMetadata | null>(
        `/api/video/search/imdb?q=${encodeURIComponent(query)}`
    );
}

// ============ Video Data Functions ============

/**
 * Get complete video data for playback (movie) with proxied URLs
 */
export async function getVideoData(
    movieId: string
): Promise<ApiResponse<{ video: CompleteVideoData }>> {
    return apiRequest<{ video: CompleteVideoData }>(`/api/video/${movieId}/proxied`);
}

/**
 * Get video playlist
 */
export async function getVideoPlaylist(movieId: string): Promise<ApiResponse<VideoPlaylistResponse>> {
    return apiRequest<VideoPlaylistResponse>(`/api/video/${movieId}/playlist`);
}

/**
 * Get episode stream data for a specific episode with proxied URLs
 */
export async function getEpisodeData(
    seriesId: string,
    episodeId: string
): Promise<ApiResponse<{ video: CompleteVideoData }>> {
    return apiRequest<{ video: CompleteVideoData }>(
        `/api/series/${seriesId}/episode/${episodeId}/proxied`
    );
}

/**
 * Get show details (metadata, seasons, episodes list)
 */
export async function getShowDetails(
    showId: string
): Promise<ApiResponse<ShowDetailsResponse>> {
    return apiRequest<ShowDetailsResponse>(`/api/video/show/${showId}`);
}

/**
 * Get episodes for a specific season (Legacy/Hit-and-trial)
 */
export async function getSeriesEpisodes(
    seriesId: string,
    startEpisode?: string
): Promise<ApiResponse<SeriesEpisodesResponse>> {
    const params = startEpisode ? `?start_episode=${startEpisode}` : '';
    return apiRequest<SeriesEpisodesResponse>(
        `/api/series/${seriesId}/episodes${params}`
    );
}

// ============ Asset Utilities ============

/**
 * Get poster URL for a show/movie (CDN)
 */
export function getPosterUrl(id: string, hd: boolean = false): string {
    return hd
        ? `https://imgcdn.kim/poster/h/${id}.jpg`
        : `https://imgcdn.kim/poster/341/${id}.jpg`;
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
