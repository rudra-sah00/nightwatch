/**
 * HLS download processor for mobile.
 * Equivalent of electron/modules/downloads/processors/hls.js
 */
import { Directory, Filesystem } from '@capacitor/filesystem';
import { downloadFile } from '../network';
import {
  activeAbortControllers,
  loadDownloads,
  updateItem,
  VAULT_DIR,
} from '../state';

function resolveUrl(base: string, relative: string): string {
  if (relative.startsWith('http')) return relative;
  return new URL(relative, base).href;
}

function parseM3u8(
  content: string,
  baseUrl: string,
): { segments: string[]; isVariant: boolean } {
  const lines = content.split('\n').map((l) => l.trim());
  const segments: string[] = [];
  let isVariant = false;

  for (const line of lines) {
    if (line.startsWith('#EXT-X-STREAM-INF')) isVariant = true;
    else if (!line.startsWith('#') && line.length > 0) {
      segments.push(resolveUrl(baseUrl, line));
    }
  }
  return { segments, isVariant };
}

function buildLocalPlaylist(original: string, segCount: number): string {
  const lines = original.split('\n');
  const result: string[] = [];
  let idx = 0;
  for (const line of lines) {
    const t = line.trim();
    if (!t.startsWith('#') && t.length > 0) {
      const ext = t.includes('.ts') ? '.ts' : '.mp4';
      result.push(`seg_${idx}${ext}`);
      idx++;
    } else {
      result.push(t);
    }
  }
  return result.join('\n');
}

export async function startHlsDownload(
  contentId: string,
  m3u8Url: string,
): Promise<void> {
  const controller = new AbortController();
  activeAbortControllers.set(contentId, controller);

  try {
    const masterRes = await fetch(m3u8Url, { credentials: 'omit' });
    if (!masterRes.ok)
      throw new Error(`Failed to fetch m3u8: ${masterRes.status}`);
    const masterContent = await masterRes.text();
    const { segments: masterSegs, isVariant } = parseM3u8(
      masterContent,
      m3u8Url,
    );

    let mediaUrl = m3u8Url;
    let mediaContent = masterContent;

    if (isVariant && masterSegs.length > 0) {
      // Pick last variant (usually highest quality)
      mediaUrl = masterSegs[masterSegs.length - 1];
      const mediaRes = await fetch(mediaUrl, { credentials: 'omit' });
      mediaContent = await mediaRes.text();
    }

    const { segments } = parseM3u8(mediaContent, mediaUrl);
    if (segments.length === 0) throw new Error('No segments found');

    // Save original playlist
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

      const items = await loadDownloads();
      const current = items.find((it) => it.contentId === contentId);
      if (
        !current ||
        current.status === 'PAUSED' ||
        current.status === 'CANCELLED'
      )
        return;

      const ext = segments[i].includes('.ts') ? '.ts' : '.mp4';
      const segPath = `${VAULT_DIR}/${contentId}/seg_${i}${ext}`;
      const bytes = await downloadFile(segments[i], segPath, controller.signal);

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

    // Build local playlist with relative segment paths
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
