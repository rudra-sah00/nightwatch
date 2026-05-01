/**
 * MP4 download processor for mobile.
 * Equivalent of electron/modules/downloads/processors/mp4.js
 */

import { downloadFile } from '../network';
import { activeAbortControllers, updateItem, VAULT_DIR } from '../state';

export async function startMp4Download(
  contentId: string,
  url: string,
): Promise<void> {
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
