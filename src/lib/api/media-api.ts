/**
 * Media API Service
 * Handles all API calls to the streaming service
 */

const API_ENDPOINTS = {
  SEARCH: '/api/search',
  PLAY: '/api/play',
  PLAYLIST: '/api/playlist',
  SUBTITLES: 'https://subscdn.top/subs',
  THUMBNAILS: 'https://back02.nfmirrorcdn.top/imgscdn',
} as const;

export interface SearchResult {
  id: string;
  title: string;
  year?: number;
  type?: 'movie' | 'series';
  poster?: string;
  description?: string;
}

export interface VideoSource {
  quality: string;
  url: string;
  default?: boolean;
}

export interface Subtitle {
  language: string;
  url: string;
}

export interface Thumbnail {
  url: string;
  language?: string;
}

export interface PlaylistResponse {
  title: string;
  poster?: string;
  sources: VideoSource[];
  subtitles?: Subtitle[];
  thumbnails?: Thumbnail | null;
}

export interface PlayTokenResponse {
  h: string; // hash token (format: "in=...")
}

/**
 * Search for movies/series
 */
export async function searchContent(query: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(`${API_ENDPOINTS.SEARCH}?q=${encodeURIComponent(query)}`);

    if (!response.ok) {
      throw new Error(`Search failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

/**
 * Get play token for a video
 */
export async function getPlayToken(videoId: string): Promise<string | null> {
  try {
    const response = await fetch(API_ENDPOINTS.PLAY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: videoId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get play token: ${response.statusText}`);
    }

    const data: PlayTokenResponse = await response.json();
    return data.h || null;
  } catch (error) {
    console.error('Play token error:', error);
    return null;
  }
}

/**
 * Get playlist/video sources for a video
 */
export async function getPlaylist(videoId: string, hash: string, title: string = ''): Promise<PlaylistResponse | null> {
  try {
    const response = await fetch(
      `${API_ENDPOINTS.PLAYLIST}?id=${encodeURIComponent(videoId)}&h=${encodeURIComponent(hash)}&title=${encodeURIComponent(title)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get playlist: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Playlist error:', error);
    return null;
  }
}

/**
 * Complete flow to get video sources
 * Uses our server-side API to handle the entire flow with fresh tokens
 */
export async function getVideoSources(videoId: string, title: string = ''): Promise<PlaylistResponse | null> {
  console.log('[getVideoSources] Starting for videoId:', videoId, 'title:', title);
  
  try {
    // Use our combined API endpoint that handles both play+playlist in one call
    // This minimizes token expiry issues by keeping the requests close together
    const response = await fetch('/api/video-sources', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: videoId, title }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get video sources: ${response.statusText}`);
    }

    const playlist: PlaylistResponse = await response.json();
    console.log('[getVideoSources] ✓ Received playlist:', playlist);
    
    // Check if sources are valid
    if (playlist && playlist.sources && playlist.sources.length > 0) {
      const firstSource = playlist.sources[0].url;
      if (firstSource.includes('in=unknown::ni')) {
        console.warn('[getVideoSources] ⚠️  Received expired token, retrying...');
        
        // Retry once
        const retryResponse = await fetch('/api/video-sources', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: videoId, title }),
        });

        if (retryResponse.ok) {
          const retryPlaylist = await retryResponse.json();
          console.log('[getVideoSources] ✓ Retry successful');
          return retryPlaylist;
        }
      }
    }
    
    return playlist;
  } catch (error) {
    console.error('[getVideoSources] Error:', error);
    return null;
  }
}