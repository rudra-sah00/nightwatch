// Media API Module - Search and Video Sources

import { apiRequest } from './client';

export interface SearchResult {
    id: string;
    title: string;
    type: string;
    poster: string;
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

export async function search(query: string) {
    return apiRequest<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(query)}`);
}

export async function getVideoSources(id: string, title: string) {
    return apiRequest<VideoSourcesResponse>('/api/video-sources', {
        method: 'POST',
        body: JSON.stringify({ id, title }),
    });
}

export async function getPlaylist(id: string, title: string, h: string) {
    return apiRequest<PlaylistResponse>(`/api/playlist?id=${id}&title=${encodeURIComponent(title)}&h=${encodeURIComponent(h)}`);
}
