/**
 * S1 (Server 1) download provider for mobile.
 * Equivalent of electron/modules/downloads/providers/s1.js
 */
import { startHlsDownload } from '../processors/hls';

export async function downloadS1(
  contentId: string,
  m3u8Url: string,
): Promise<void> {
  return startHlsDownload(contentId, m3u8Url);
}
