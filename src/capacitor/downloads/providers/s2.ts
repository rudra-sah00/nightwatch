/**
 * Direct MP4 download provider for mobile.
 * Handles content served as direct MP4 URLs.
 */

import { startHlsDownload } from '../processors/hls';
import { startMp4Download } from '../processors/mp4';

export async function downloadS2(
  contentId: string,
  url: string,
): Promise<void> {
  const isMp4 = url.includes('.mp4') || !url.includes('.m3u8');
  if (isMp4) {
    return startMp4Download(contentId, url);
  }
  return startHlsDownload(contentId, url);
}
