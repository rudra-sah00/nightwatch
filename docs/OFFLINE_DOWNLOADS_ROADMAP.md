# Offline Downloads & Download Manager Roadmap

This document outlines the architecture for the current Electron-based Native Download Manager, as well as future enhancements mapped out for development.

## Current Architecture

Currently, the Desktop App handles offline downloads via a custom Node.js backend (`electron/modules/download-manager.js`).
1. **Bypassing Web Restrictions**: Uses an OS custom protocol (`offline-media://`) to serve saved `.m3u8` and `.ts` files naturally to the browser video player without triggering Cross-Origin (CORS) or Mixed-Content blockers.
2. **HLS Parsing**: Downloads the Master Playlist, extracts the highest quality Media Playlist, and modifies the inner `.ts` paths relative to the user's hidden local `OfflineVault`.
3. **Databaseless State**: Uses a simple JSON object stringified to the user's `AppData/OfflineVault/downloads.json` to ensure metadata (progress, poster URL) persists across app restarts without bloating the machine with an SQLite instance.

---

## Future Enhancements & Action Plan

### 1. Download Speed Throttling (Bandwidth Limiting)
Users on metered connections or shared networks may want to limit the maximum bandwidth the app consumes.
- **How to implement:** Node's native `http`/`https` modules do not have a "max bandwidth" config natively. We will need to pipe the `res` read stream through a custom Node.js `Transform` stream.
- **Mechanism:** The `Transform` stream counts chunk bytes passing through. If the bytes transferred in the last second exceed the limit (e.g., `2 MB/s`), it calls `await delay(...)` before passing the chunk to the `fs.createWriteStream`.
- **UI Integration:** Add a setting in the Settings page -> `Max Download Speed: [ Unlimited | 5 MB/s | 2 MB/s ]` mapped to `window.electronAPI.storeSet('max_download_speed')`.

### 2. Live Speed Metrics & ETA
Display exactly how fast the current download is processing and the estimated time remaining.
- **How to implement:** In the download loop, store `let lastBytes = 0` and `let lastTime = Date.now()`.
- **Mechanism:** Every 1 second, calculate `(currentBytes - lastBytes) / (currentTime - lastTime)`. Convert this to `MB/s`. Use the remaining total file size to calculate `ETA = remainingBytes / bytesPerSecond`. emit this in the `download-progress` IPC payload.

### 3. Parallel Segment Downloading (Concurrency limit)
Currently, `.ts` segments download sequentially (one at a time) to ensure extreme stability. 
- **How to implement:** Change the `for (const segment of segments)` loop to a pool of concurrent workers.
- **Mechanism:** Use a concurrency queue (like `p-limit` or splitting the array into chunks of 5). Map 5 `.ts` segment downloads concurrently using `Promise.all()`. This dramatically speeds up HLS downloads on high-bandwidth networks.

### 4. True Pause & Resume
If the app closes or the network drops halfway through a large movie.
- **How to implement:** Before downloading a segment, check if `fs.existsSync(segmentPath)` and if its size matches expected headers.
- **Mechanism:** The download manager already tracks `segmentsDownloaded / segmentsTotal`. We just need to load the database on startup, detect `status: 'DOWNLOADING'`, mark it as `PAUSED`, and let the user click "Resume", which skips already downloaded `.ts` indexes and starts at the missing ones.

### 5. Background / System Tray Downloading
If the user closes the main window, the download shouldn't stop.
- **How to implement:** Intercept the Electron `window.on('close')` event.
- **Mechanism:** If `downloads.some(d => d.status === 'DOWNLOADING')`, hide the window to the system tray instead of destroying the Electron process. Show a native OS notification when the download fully completes, then fully close.

### 6. DRM & Encrypted HLS Streams
Some future premium sources might use `#EXT-X-KEY` AES-128 encryption.
- **How to implement:** The parser must look for `#EXT-X-KEY:METHOD=AES-128,URI="key.bin"` in the `.m3u8` file.
- **Mechanism:** Download the AES key file securely into the vault, rewrite the URI to `offline-media://.../key.bin`, and let the frontend video player (HLS.js / Video.js) natively decrypt the local `.ts` segments during offline playback.

### 7. Storage Management UI
- Show a progress bar parsing `os.freemem()` vs `offlineVaultSize` so users know when their hard drive is getting full.
- "Delete All Watched" button.
