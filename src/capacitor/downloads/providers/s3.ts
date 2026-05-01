/**
 * S3 (Server 3) download provider for mobile.
 * Equivalent of electron/modules/downloads/providers/s3.js
 */
import { startHlsDownload } from '../processors/hls';

export async function downloadS3(
  contentId: string,
  m3u8Url: string,
): Promise<void> {
  return startHlsDownload(contentId, m3u8Url);
}
