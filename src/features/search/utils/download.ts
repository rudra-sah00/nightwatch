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
export function getOfflineIdentifier({
  contentId,
  type,
  season,
  episode,
  isDirectUrl,
}: {
  contentId: string;
  type: 'movie' | 'series';
  season?: number;
  episode?: number;
  isDirectUrl?: boolean;
}): string {
  if (isDirectUrl) {
    return type === 'series' && episode
      ? `${contentId}-ep${episode}`
      : contentId;
  }
  return `${contentId}${season ? `_S${season}E${episode}` : ''}`;
}

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
  if (directUrl && window.electronAPI) {
    window.electronAPI.startDownload({
      contentId: getOfflineIdentifier({
        contentId,
        type,
        episode,
        isDirectUrl: true,
      }),
      title:
        type === 'series' && episode
          ? `${showTitle} - S${season}E${episode}`
          : showTitle,
      m3u8Url: directUrl,
      posterUrl,
      quality,
      metadata: show,
    });

    return;
  }

  const server = contentId.includes(':') ? contentId.split(':')[0] : 's1';

  const response = await playVideo({
    type,
    title: showTitle,
    server,
    movieId: type === 'movie' ? contentId : undefined,
    seriesId: type === 'series' ? contentId : undefined,
    season,
    episode,
  });

  if (response.success && response.masterPlaylistUrl) {
    if (window.electronAPI) {
      window.electronAPI.startDownload({
        contentId: getOfflineIdentifier({
          contentId,
          type,
          season,
          episode,
          isDirectUrl: false,
        }),
        title: `${showTitle}${season ? ` S${season} E${episode}` : ''}`,
        m3u8Url: response.masterPlaylistUrl,
        posterUrl,
        subtitleTracks: response.subtitleTracks,
        quality,
        metadata: show,
      });

      return true;
    }
  } else {
    console.warn(
      '[startElectronDownload] Missing success or masterPlaylistUrl from response',
    );
  }

  return false;
}
