import { playVideo } from '@/features/watch/api';
import {
  checkIsDesktop,
  checkIsMobile,
  desktopBridge,
} from '@/lib/electron-bridge';
import { apiFetch } from '@/lib/fetch';

import type { ShowDetails } from '@/types/content';

/** A single download quality option with its label and direct URL. */
export interface DownloadQuality {
  quality: string;
  url: string;
}

/** Preferred quality sort order from highest to lowest resolution. */
export const QUALITY_ORDER = ['1080p', '720p', '480p', '360p'];

/**
 * Sorts download qualities according to {@link QUALITY_ORDER} (highest
 * resolution first). Unknown qualities are appended alphabetically.
 *
 * @param qualities - Unsorted quality options.
 * @returns A new sorted array.
 */
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

/**
 * Builds a deterministic offline-storage key for a downloadable item.
 *
 * For Server 2 direct URLs the key is `{contentId}-ep{episode}` (series)
 * or just `contentId` (movie). For HLS-based downloads it appends
 * `_S{season}E{episode}` when applicable.
 *
 * @param params - Content identifiers and type metadata.
 * @returns A unique string identifier for offline storage.
 */
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

/**
 * Fetches available download quality links from the backend API.
 *
 * @param id - The content identifier.
 * @param type - Whether the content is a `movie` or `series`.
 * @param season - Season number (series only).
 * @param episode - Episode number (series only).
 * @returns An array of {@link DownloadQuality} options, or an empty array on failure.
 */
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

/**
 * Initiates a content download on the current platform.
 *
 * On Electron (desktop) it delegates to the desktop bridge; on Capacitor
 * (mobile) it lazy-loads the mobile download manager. For non-direct URLs
 * it first resolves the HLS master playlist via `playVideo`, then hands
 * the URL to the appropriate native downloader.
 *
 * @param params - Download metadata including content ID, title, quality,
 *                 and optional direct URL.
 * @returns `true` if a non-direct download was successfully started via
 *          HLS resolution, `false` if the playlist was unavailable, or
 *          `undefined` for direct-URL paths (fire-and-forget).
 */
export async function startDesktopDownload({
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
  if (directUrl && checkIsDesktop()) {
    desktopBridge.startDownload({
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

  if (directUrl && checkIsMobile()) {
    const { mobileDownloadManager } = await import('@/capacitor/downloads');
    await mobileDownloadManager.startDownload({
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

  const server = contentId.includes(':') ? contentId.split(':')[0] : 's2';

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
    if (checkIsDesktop()) {
      desktopBridge.startDownload({
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

    if (checkIsMobile()) {
      const { mobileDownloadManager } = await import('@/capacitor/downloads');
      await mobileDownloadManager.startDownload({
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
        quality,
        metadata: show,
      });
      return true;
    }
  }

  return false;
}
