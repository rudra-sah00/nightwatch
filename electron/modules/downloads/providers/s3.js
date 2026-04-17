const fs = require('node:fs');
const path = require('node:path');
const { startHlsDownload } = require('../processors/hls');
const { getDatabase, syncDbState, VAULT_PATH, store } = require('../state');
const { downloadFile } = require('../network');

async function downloadS3(eventSender, args) {
  const { contentId, m3u8Url, showData } = args;

  // Process ONLY thumbnails for S3
  if (
    showData &&
    Array.isArray(showData.trailers) &&
    showData.trailers.length > 0
  ) {
    const db = getDatabase();
    let item = db.items.find((i) => i.contentId === contentId);

    if (!item) {
      item = {
        contentId,
        title: args.title,
        m3u8Url,
        status: 'DOWNLOADING',
        progress: 0,
        downloadedBytes: 0,
        segmentsTotal: 1,
        segmentsDownloaded: 0,
        showData: showData,
      };
      db.items.push(item);
    } else {
      if (!item.showData) item.showData = showData;
    }

    const contentFolder = path.join(VAULT_PATH, contentId);
    if (!fs.existsSync(contentFolder))
      fs.mkdirSync(contentFolder, { recursive: true });

    try {
      const trailer = item.showData.trailers[0];

      // S3 has no video trailer, remove url so UI doesn't try to play it
      trailer.url = '';

      if (
        trailer.thumbnail &&
        !trailer.thumbnail.startsWith('offline-media://')
      ) {
        let thumbUrlObj;
        try {
          thumbUrlObj = new URL(trailer.thumbnail);
        } catch (_e) {}
        const thumbExt = thumbUrlObj
          ? path.extname(thumbUrlObj.pathname) || '.jpg'
          : '.jpg';
        const thumbName = `trailer_thumb${thumbExt}`;
        const thumbDest = path.join(contentFolder, thumbName);

        if (!fs.existsSync(thumbDest)) {
          await downloadFile(
            trailer.thumbnail,
            thumbDest,
            null,
            item,
            store,
          ).catch((e) =>
            console.error('[downloadS3] Thumbnail download failed:', e),
          );
        }
        if (fs.existsSync(thumbDest)) {
          trailer.thumbnail = `offline-media://local/${encodeURIComponent(contentId)}/${encodeURIComponent(thumbName)}`;
          if (!args.posterUrl || !item.posterUrl) {
            args.posterUrl = trailer.thumbnail;
            item.posterUrl = trailer.thumbnail;
          }
          syncDbState(item);
        }
      }
    } catch (err) {
      console.error('[downloadS3] Error processing thumbnail:', err.message);
    }

    args.showData = item.showData;
  }

  return startHlsDownload(eventSender, args);
}

module.exports = { downloadS3 };
