/**
 * Mobile Download Manager — main entry point.
 * Equivalent of electron/modules/download-manager.js
 *
 * Routes downloads to the correct server provider (s1/s2)
 * and exposes a unified API for the React hooks.
 */
import { Directory, Filesystem } from '@capacitor/filesystem';
import type { DownloadItem } from '@/lib/electron-bridge';
import { startHlsDownload } from './processors/hls';
import { startMp4Download } from './processors/mp4';
import { downloadS1 } from './providers/s1';
import { downloadS2 } from './providers/s2';
import {
  activeAbortControllers,
  loadDownloads,
  notifyProgress,
  onProgress,
  saveDownloads,
  updateItem,
  VAULT_DIR,
} from './state';

async function startDownloadTask(
  contentId: string,
  m3u8Url: string,
): Promise<void> {
  const prefix = contentId.split(':')[0];

  if (prefix === 's2') return downloadS1(contentId, m3u8Url);
  if (prefix === 's2') return downloadS2(contentId, m3u8Url);

  // Fallback: detect by URL
  const isMp4 = m3u8Url.includes('.mp4') || !m3u8Url.includes('.m3u8');
  if (isMp4) return startMp4Download(contentId, m3u8Url);
  return startHlsDownload(contentId, m3u8Url);
}

export const mobileDownloadManager = {
  getDownloads: loadDownloads,

  async startDownload(args: {
    contentId: string;
    title: string;
    m3u8Url: string;
    posterUrl?: string;
    quality?: string;
    metadata?: unknown;
  }): Promise<void> {
    const items = await loadDownloads();
    const existing = items.find((i) => i.contentId === args.contentId);
    if (existing?.status === 'DOWNLOADING') return;

    const item: DownloadItem = {
      contentId: args.contentId,
      title: args.title,
      posterUrl: args.posterUrl,
      quality: args.quality,
      status: 'QUEUED',
      progress: 0,
      downloadedBytes: 0,
      showData: args.metadata,
      createdAt: Date.now(),
    };

    if (existing) {
      const idx = items.indexOf(existing);
      items[idx] = { ...existing, ...item };
    } else {
      items.push(item);
    }
    await saveDownloads(items);
    notifyProgress(item);

    await updateItem(args.contentId, { status: 'DOWNLOADING' });
    startDownloadTask(args.contentId, args.m3u8Url);
  },

  async cancelDownload(contentId: string): Promise<void> {
    activeAbortControllers.get(contentId)?.abort();
    const items = await loadDownloads();
    await saveDownloads(items.filter((i) => i.contentId !== contentId));
    try {
      await Filesystem.rmdir({
        path: `${VAULT_DIR}/${contentId}`,
        directory: Directory.Data,
        recursive: true,
      });
    } catch {
      /* folder may not exist */
    }
    notifyProgress({
      contentId,
      title: '',
      status: 'CANCELLED',
      progress: 0,
      downloadedBytes: 0,
      createdAt: 0,
    });
  },

  async pauseDownload(contentId: string): Promise<void> {
    activeAbortControllers.get(contentId)?.abort();
    await updateItem(contentId, { status: 'PAUSED', speed: '' });
  },

  async resumeDownload(contentId: string): Promise<void> {
    const items = await loadDownloads();
    const item = items.find((i) => i.contentId === contentId);
    if (!item) return;
    await updateItem(contentId, { status: 'DOWNLOADING' });
    // Re-start — HLS will re-download all segments (future: skip existing)
    if (item.isMp4 && item.localPlaylistPath) {
      startMp4Download(contentId, item.localPlaylistPath);
    }
  },

  onProgress,
};
