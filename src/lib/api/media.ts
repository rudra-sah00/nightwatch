// Media API Module - Search, Video, and Series

import { apiRequest } from './client';
import type {
    ContentType,
    CompleteVideoData,
    SeriesEpisodesResponse,
    VideoPlaylistResponse,
    VideoMetadata,
    ShowDetailsResponse
} from '@/types/content';

export interface SearchResult {
    id: string;
    title: string;
    type: ContentType;
    poster: string;
    year?: number;
}

export interface VideoSource {
    name: string;
    url: string;
    quality?: string;
}

export interface VideoSourcesResponse {
    sources: VideoSource[];
}

export interface PlaylistResponse {
    playlist: string;
    subtitles?: { language: string; url: string }[];
}

// Search for content (movies and series)
export async function search(query: string) {
    return apiRequest<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(query)}`);
}

// Get complete video data for a movie (with proxied URLs for playback)
// Uses /proxied endpoint which rewrites CDN URLs to go through our backend
export async function getVideoData(movieId: string) {
    return apiRequest<{ video: CompleteVideoData }>(`/api/video/${movieId}/proxied`);
}

// Get video playlist
export async function getVideoPlaylist(movieId: string) {
    return apiRequest<VideoPlaylistResponse>(`/api/video/${movieId}/playlist`);
}

// Search IMDB for metadata
export async function searchImdb(query: string) {
    return apiRequest<VideoMetadata | null>(`/api/video/search/imdb?q=${encodeURIComponent(query)}`);
}

// Get complete show details (title, description, cast, genres, seasons, episodes)
// Uses post.php which provides all season/episode data upfront - no hit-and-trial discovery
export async function getShowDetails(showId: string) {
    return apiRequest<ShowDetailsResponse>(`/api/video/show/${showId}`);
}

// Get series episodes (legacy - uses hit-and-trial discovery)
// Prefer getShowDetails() which returns seasons and episodes upfront
export async function getSeriesEpisodes(seriesId: string, startEpisode?: string) {
    const params = startEpisode ? `?start_episode=${startEpisode}` : '';
    return apiRequest<SeriesEpisodesResponse>(`/api/series/${seriesId}/episodes${params}`);
}

// Get episode stream data (with proxied URLs for playback)
export async function getEpisodeData(seriesId: string, episodeId: string) {
    return apiRequest<{ video: CompleteVideoData }>(`/api/series/${seriesId}/episode/${episodeId}/proxied`);
}

// Generate poster URL from movie/series ID
export function getPosterUrl(id: string, hd: boolean = false): string {
    return hd
        ? `https://imgcdn.kim/poster/h/${id}.jpg`
        : `https://imgcdn.kim/poster/341/${id}.jpg`;
}

// Generate episode thumbnail URL
export function getEpisodeThumbnailUrl(episodeId: string): string {
    return `https://imgcdn.kim/epimg/150/${episodeId}.jpg`;
}

// Generate sprite sheet URL for timeline preview
export function getSpriteSheetUrl(movieId: string): string {
    return `https://back02.nfmirrorcdn.top/files/${movieId}/t001.jpg`;
}

// Legacy functions for backward compatibility
export async function getVideoSources(id: string, title: string) {
    return apiRequest<VideoSourcesResponse>('/api/video-sources', {
        method: 'POST',
        body: JSON.stringify({ id, title }),
    });
}

export async function getPlaylist(id: string, title: string, h: string) {
    return apiRequest<PlaylistResponse>(`/api/playlist?id=${id}&title=${encodeURIComponent(title)}&h=${encodeURIComponent(h)}`);
}
