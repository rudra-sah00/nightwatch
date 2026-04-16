import { playVideo } from '@/features/watch/api';
import { apiFetch } from '@/lib/fetch';

import type { ShowDetails } from '@/types/content';

export interface DownloadQuality {
  quality: string;
  url: string;
}

export const QUALITY_ORDER = ['1080p', '720p', '480p', '360p'];

export function sortQualities(qualities: DownloadQuality[]): DownloadQuality[] {
  return [...qualities].sort((a, b) => {
    const ai = QUALITY_ORDER.indexOf(a.quality);
    const bi = QUALITY_ORDER.indexOf(b.quality);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.quality.localeCompare(b.quality);
  });
}

// Server 2 direct mp4 fallback
export async function fetchDownloadLinks(
  id: string,
  type: 'movie' | 'series',
  season?: number,
  episode?: number,
): Promise<DownloadQuality[]> {
  const params = new URLSearchParams({ id, type });
  if (season != null) params.set('season', String(season));
  if (episode != null) params.set('episode', String(episode));

  const res = await apiFetch<{
    success: boolean;
    qualities: DownloadQuality[];
  }>(`/api/video/download-links?${params.toString()}`);

  return res.success && res.qualities ? res.qualities : [];
}

export async function startElectronDownload({
  contentId,
  showTitle,
  posterUrl,
  type,
  season,
  episode,
  directUrl,
  quality = 'high',
  show,
}: {
  contentId: string;
  showTitle: string;
  posterUrl?: string;
  type: 'movie' | 'series';
  season?: number;
  episode?: number;
  directUrl?: string;
  quality?: 'low' | 'medium' | 'high';
  show?: ShowDetails;
}) {
  console.log('[startElectronDownload] INITIAL CALL', {
    contentId,
    showTitle,
    type,
    season,
    episode,
    directUrl,
    quality,
  });
  if (directUrl && window.electronAPI) {
    console.log(
      '[startElectronDownload] Has directUrl, calling startDownload IPC',
    );
    window.electronAPI.startDownload({
      contentId:
        type === 'series' && episode ? `${contentId}-ep${episode}` : contentId,
      title:
        type === 'series' && episode
          ? `${showTitle} - S${season}E${episode}`
          : showTitle,
      m3u8Url: directUrl,
      posterUrl,
      quality,
      metadata: show,
    });
    console.log('[startElectronDownload] Return from directUrl call');
    return;
  }

  const server = contentId.includes(':') ? contentId.split(':')[0] : 's1';
  console.log('[startElectronDownload] No directUrl. Calling playVideo API', {
    server,
    contentId,
  });
  const response = await playVideo({
    type,
    title: showTitle,
    server,
    movieId: type === 'movie' ? contentId : undefined,
    seriesId: type === 'series' ? contentId : undefined,
    season,
    episode,
  });
  console.log('[startElectronDownload] playVideo response:', response);

  if (response.success && response.masterPlaylistUrl) {
    console.log(
      '[startElectronDownload] Success. Valid masterPlaylistUrl. Preparing IPC window.electronAPI',
    );
    if (window.electronAPI) {
      console.log(
        '[startElectronDownload] Calling IPC startDownload from masterPlaylistUrl',
      );
      window.electronAPI.startDownload({
        contentId: `${contentId}${season ? `_S${season}E${episode}` : ''}`,
        title: `${showTitle}${season ? ` S${season} E${episode}` : ''}`,
        m3u8Url: response.masterPlaylistUrl,
        posterUrl,
        subtitleTracks: response.subtitleTracks,
        quality,
        metadata: show,
      });
      console.log(
        '[startElectronDownload] Returning true from masterPlaylistUrl',
      );
      return true;
    }
  } else {
    console.warn(
      '[startElectronDownload] Missing success or masterPlaylistUrl from response',
    );
  }

  console.log('[startElectronDownload] Returning false');
  return false;
}
