/**
 * Mobile Download Manager — Capacitor equivalent of Electron's download-manager.
 * Downloads HLS segments or MP4 files to the device filesystem.
 * Stores metadata in Capacitor Preferences for persistence.
 */
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Preferences } from '@capacitor/preferences';
import type { DownloadItem } from '@/lib/electron-bridge';

const DOWNLOADS_KEY = 'nightwatch_downloads';
const VAULT_DIR = 'OfflineVault';

type ProgressCallback = (item: DownloadItem) => void;

let progressListeners: ProgressCallback[] = [];
const activeAbortControllers = new Map<string, AbortController>();

// --- Persistence ---

async function loadDownloads(): Promise<DownloadItem[]> {
  const { value } = await Preferences.get({ key: DOWNLOADS_KEY });
  return value ? JSON.parse(value) : [];
}

async function saveDownloads(items: DownloadItem[]): Promise<void> {
  await Preferences.set({
    key: DOWNLOADS_KEY,
    value: JSON.stringify(items),
  });
}

async function updateItem(
  contentId: string,
  update: Partial<DownloadItem>,
): Promise<DownloadItem | null> {
  const items = await loadDownloads();
  const idx = items.findIndex((i) => i.contentId === contentId);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...update };
  await saveDownloads(items);
  for (const cb of progressListeners) cb(items[idx]);
  return items[idx];
}

function notifyProgress(item: DownloadItem) {
  for (const cb of progressListeners) cb(item);
}

// --- HLS Parsing ---

async function fetchM3u8(url: string): Promise<string> {
  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error(`Failed to fetch m3u8: ${res.status}`);
  return res.text();
}

function resolveUrl(base: string, relative: string): string {
  if (relative.startsWith('http')) return relative;
  const baseUrl = new URL(base);
  return new URL(relative, baseUrl).href;
}

function parseSegments(
  m3u8Content: string,
  baseUrl: string,
): { segments: string[]; isVariant: boolean } {
  const lines = m3u8Content.split('\n').map((l) => l.trim());
  const segments: string[] = [];
  let isVariant = false;

  for (const line of lines) {
    if (line.startsWith('#EXT-X-STREAM-INF')) {
      isVariant = true;
    } else if (!line.startsWith('#') && line.length > 0) {
      segments.push(resolveUrl(baseUrl, line));
    }
  }
  return { segments, isVariant };
}

// --- Download Logic ---

async function downloadFile(
  url: string,
  path: string,
  signal: AbortSignal,
): Promise<number> {
  const res = await fetch(url, { signal, credentials: 'omit' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const reader = new FileReader();
  const base64 = await new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Data,
    recursive: true,
  });
  return blob.size;
}

async function downloadHls(contentId: string, m3u8Url: string): Promise<void> {
  const controller = new AbortController();
  activeAbortControllers.set(contentId, controller);

  try {
    // Fetch master playlist
    const masterContent = await fetchM3u8(m3u8Url);
    const { segments: masterSegments, isVariant } = parseSegments(
      masterContent,
      m3u8Url,
    );

    let mediaUrl = m3u8Url;
    let mediaContent = masterContent;

    // If variant playlist, pick the first (highest) quality
    if (isVariant && masterSegments.length > 0) {
      mediaUrl = masterSegments[masterSegments.length - 1]; // Last = usually highest
      mediaContent = await fetchM3u8(mediaUrl);
    }

    const { segments } = parseSegments(mediaContent, mediaUrl);
    if (segments.length === 0) throw new Error('No segments found');

    // Save the media playlist locally
    await Filesystem.writeFile({
      path: `${VAULT_DIR}/${contentId}/playlist.m3u8`,
      data: btoa(mediaContent),
      directory: Directory.Data,
      recursive: true,
    });

    let downloaded = 0;
    let totalBytes = 0;
    const startTime = Date.now();

    for (let i = 0; i < segments.length; i++) {
      if (controller.signal.aborted) return;

      // Check if paused
      const items = await loadDownloads();
      const current = items.find((it) => it.contentId === contentId);
      if (
        !current ||
        current.status === 'PAUSED' ||
        current.status === 'CANCELLED'
      )
        return;

      const segUrl = segments[i];
      const ext = segUrl.includes('.ts')
        ? '.ts'
        : segUrl.includes('.mp4')
          ? '.mp4'
          : '.ts';
      const segPath = `${VAULT_DIR}/${contentId}/seg_${i}${ext}`;

      const bytes = await downloadFile(segUrl, segPath, controller.signal);
      totalBytes += bytes;
      downloaded++;

      const progress = (downloaded / segments.length) * 100;
      const elapsed = (Date.now() - startTime) / 1000;
      const speed =
        elapsed > 0
          ? `${(totalBytes / 1024 / 1024 / elapsed).toFixed(1)} MB/s`
          : '';

      await updateItem(contentId, {
        progress,
        downloadedBytes: totalBytes,
        speed,
        status: 'DOWNLOADING',
      });
    }

    // Build local playlist with local segment paths
    const localPlaylist = buildLocalPlaylist(mediaContent, segments.length);
    await Filesystem.writeFile({
      path: `${VAULT_DIR}/${contentId}/local.m3u8`,
      data: btoa(localPlaylist),
      directory: Directory.Data,
      recursive: true,
    });

    await updateItem(contentId, {
      progress: 100,
      status: 'COMPLETED',
      speed: '',
      localPlaylistPath: `${VAULT_DIR}/${contentId}/local.m3u8`,
    });
  } catch (err) {
    if (controller.signal.aborted) return;
    await updateItem(contentId, {
      status: 'FAILED',
      error: err instanceof Error ? err.message : 'Download failed',
      speed: '',
    });
  } finally {
    activeAbortControllers.delete(contentId);
  }
}

async function downloadMp4(contentId: string, url: string): Promise<void> {
  const controller = new AbortController();
  activeAbortControllers.set(contentId, controller);

  try {
    const filePath = `${VAULT_DIR}/${contentId}/video.mp4`;
    const bytes = await downloadFile(url, filePath, controller.signal);

    await updateItem(contentId, {
      progress: 100,
      downloadedBytes: bytes,
      status: 'COMPLETED',
      speed: '',
      isMp4: true,
      localPlaylistPath: filePath,
    });
  } catch (err) {
    if (controller.signal.aborted) return;
    await updateItem(contentId, {
      status: 'FAILED',
      error: err instanceof Error ? err.message : 'Download failed',
      speed: '',
    });
  } finally {
    activeAbortControllers.delete(contentId);
  }
}

function buildLocalPlaylist(
  originalContent: string,
  segmentCount: number,
): string {
  const lines = originalContent.split('\n');
  const result: string[] = [];
  let segIdx = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('#') && trimmed.length > 0) {
      const ext = trimmed.includes('.ts') ? '.ts' : '.mp4';
      result.push(`seg_${segIdx}${ext}`);
      segIdx++;
    } else {
      result.push(trimmed);
    }
  }
  return result.join('\n');
}

// --- Public API ---

export const mobileDownloadManager = {
  async getDownloads(): Promise<DownloadItem[]> {
    return loadDownloads();
  },

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
    if (existing && existing.status === 'DOWNLOADING') return;

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

    const isMp4 =
      args.m3u8Url.includes('.mp4') || !args.m3u8Url.includes('.m3u8');

    if (isMp4) {
      downloadMp4(args.contentId, args.m3u8Url);
    } else {
      downloadHls(args.contentId, args.m3u8Url);
    }
  },

  async cancelDownload(contentId: string): Promise<void> {
    activeAbortControllers.get(contentId)?.abort();
    const items = await loadDownloads();
    const filtered = items.filter((i) => i.contentId !== contentId);
    await saveDownloads(filtered);
    try {
      await Filesystem.rmdir({
        path: `${VAULT_DIR}/${contentId}`,
        directory: Directory.Data,
        recursive: true,
      });
    } catch {
      // Folder may not exist
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
    // Re-start the download (it will skip already downloaded segments in future improvement)
    await updateItem(contentId, { status: 'DOWNLOADING' });
    const isMp4 = item.isMp4;
    if (isMp4) {
      downloadMp4(contentId, item.localPlaylistPath || '');
    }
    // HLS resume not yet supported — would need segment tracking
  },

  onProgress(cb: ProgressCallback): () => void {
    progressListeners.push(cb);
    return () => {
      progressListeners = progressListeners.filter((l) => l !== cb);
    };
  },
};
