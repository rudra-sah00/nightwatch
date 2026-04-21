const fs = require('node:fs');
const path = require('node:path');
const { startMp4Download } = require('../processors/mp4');
const { startHlsDownload } = require('../processors/hls');
const { getDatabase, syncDbState, VAULT_PATH, getStore } = require('../state');
const { downloadFile } = require('../network');

async function downloadS2(eventSender, args) {
  const { contentId, m3u8Url } = args;
  const showData = args.showData || args.metadata;

  // Process trailers and thumbnails specifically for S2 before starting main item
  if (
    showData &&
    Array.isArray(showData.trailers) &&
    showData.trailers.length > 0
  ) {
    const db = getDatabase();
    let item = db.items.find((i) => i.contentId === contentId);

    // We create item if it doesn't exist so we can save state immediately
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
      // ALWAYS use the fresh showData from the frontend to ensure we have real https URLs
      // in case the user deleted the physical files but kept the DB intact
      item.showData = showData;
    }

    const contentFolder = path.join(VAULT_PATH, contentId);
    if (!fs.existsSync(contentFolder))
      fs.mkdirSync(contentFolder, { recursive: true });

    try {
      const trailer = item.showData.trailers[0];
      if (trailer.url && !trailer.url.startsWith('offline-media://')) {
        let trailerUrlObj;
        try {
          trailerUrlObj = new URL(trailer.url);
        } catch (_e) {}
        const trailerExt = trailerUrlObj
          ? path.extname(trailerUrlObj.pathname) || '.mp4'
          : '.mp4';
        const trailerName = `trailer${trailerExt}`;
        const trailerDest = path.join(contentFolder, trailerName);

        if (
          !fs.existsSync(trailerDest) ||
          fs.statSync(trailerDest).size === 0
        ) {
          await downloadFile(
            trailer.url,
            trailerDest,
            null,
            item,
            getStore(),
          ).catch((e) => {
            console.error('[downloadS2] Trailer download failed:', e);
          });
        }
        if (fs.existsSync(trailerDest) && fs.statSync(trailerDest).size > 0) {
          trailer.url = `offline-media://local/${encodeURIComponent(contentId)}/${encodeURIComponent(trailerName)}`;
          syncDbState(item);
        }

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
              getStore(),
            ).catch((e) =>
              console.error('[downloadS2] Thumbnail download failed:', e),
            );
          }
          if (fs.existsSync(thumbDest)) {
            trailer.thumbnail = `offline-media://local/${encodeURIComponent(contentId)}/${encodeURIComponent(thumbName)}`;
            if (!args.posterUrl) {
              args.posterUrl = trailer.thumbnail;
              item.posterUrl = trailer.thumbnail;
            }
            syncDbState(item);
          }
        }
      }
    } catch (err) {
      console.error('[downloadS2] Error processing trailer:', err.message);
    }

    // Update args to have the newly modified showData with offline URLs
    args.metadata = item.showData;
    args.showData = item.showData;
  }

  // Then start the main download
  const isMp4 =
    m3u8Url.includes('.mp4') ||
    m3u8Url.includes('/subject/play') ||
    m3u8Url.includes('?dl=1');

  if (isMp4) {
    return startMp4Download(eventSender, { ...args, url: m3u8Url });
  } else {
    return startHlsDownload(eventSender, args);
  }
}

module.exports = { downloadS2 };
