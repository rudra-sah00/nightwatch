/**
 * S2 (Server 2) download provider for mobile.
 * S2 serves direct MP4 URLs.
 * Equivalent of electron/modules/downloads/providers/s2.js
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
