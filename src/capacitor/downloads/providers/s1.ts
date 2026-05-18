/**
 * HLS download provider for mobile.
 */
import { startHlsDownload } from '../processors/hls';

export async function downloadS1(
  contentId: string,
  m3u8Url: string,
): Promise<void> {
  return startHlsDownload(contentId, m3u8Url);
}
