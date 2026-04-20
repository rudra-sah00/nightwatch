use reqwest::Client;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use tokio::io::AsyncWriteExt;

use super::cipher::encrypt_chunk;
use super::progress::{emit_progress, format_speed, save_db};
use super::state::DownloadManagerState;
use super::types::DownloadConfig;

/// Download a direct MP4 file with resume support, encryption, and progress tracking.
/// Used by s2 provider and any URL that points directly to an .mp4 file.
pub async fn download_mp4(
    app: &AppHandle,
    client: &Client,
    config: &DownloadConfig,
    key: &[u8; 32],
    content_dir: &PathBuf,
    cancel_rx: &tokio::sync::watch::Receiver<bool>,
) -> Result<(), String> {
    let url = config
        .mp4_url
        .as_ref()
        .or(config.hls_url.as_ref())
        .ok_or("No URL")?;
    let dest = content_dir.join("movie.mp4");

    // Resume: check existing file size
    let start_offset = if dest.exists() {
        std::fs::metadata(&dest).map(|m| m.len()).unwrap_or(0)
    } else {
        0
    };

    let mut req = client.get(url);
    if start_offset > 0 {
        req = req.header("Range", format!("bytes={}-", start_offset));
    }

    let resp = req.send().await.map_err(|e| e.to_string())?;

    let total_size = if let Some(cr) = resp.headers().get("content-range") {
        cr.to_str()
            .ok()
            .and_then(|s| s.rsplit('/').next()?.parse::<u64>().ok())
    } else {
        resp.content_length().map(|l| l + start_offset)
    };

    // Update initial state
    {
        let state = app.state::<DownloadManagerState>();
        let mut dl = state.downloads.lock().unwrap();
        if let Some(item) = dl.get_mut(&config.content_id) {
            item.filesize = total_size;
            item.downloaded_bytes = start_offset;
            if let Some(ts) = total_size {
                if ts > 0 {
                    item.progress = (start_offset as f64 / ts as f64) * 100.0;
                }
            }
        }
    }

    let mut file = tokio::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&dest)
        .await
        .map_err(|e| e.to_string())?;

    let mut downloaded = start_offset;
    let mut last_tick = std::time::Instant::now();
    let mut bytes_since_tick: u64 = 0;

    use futures_util::StreamExt;
    let mut stream = resp.bytes_stream();

    while let Some(chunk_result) = stream.next().await {
        if *cancel_rx.borrow() {
            return Err("Cancelled".into());
        }

        let chunk = chunk_result.map_err(|e| e.to_string())?;
        let mut data = chunk.to_vec();
        encrypt_chunk(key, downloaded, &mut data);
        file.write_all(&data).await.map_err(|e| e.to_string())?;

        downloaded += data.len() as u64;
        bytes_since_tick += data.len() as u64;

        let elapsed = last_tick.elapsed().as_millis();
        if elapsed > 1000 {
            let speed = format_speed(bytes_since_tick as f64 / (elapsed as f64 / 1000.0));
            bytes_since_tick = 0;
            last_tick = std::time::Instant::now();

            let progress = total_size
                .map(|t| {
                    if t > 0 {
                        (downloaded as f64 / t as f64) * 100.0
                    } else {
                        50.0
                    }
                })
                .unwrap_or(50.0);

            let state = app.state::<DownloadManagerState>();
            let mut dl = state.downloads.lock().unwrap();
            if let Some(item) = dl.get_mut(&config.content_id) {
                item.downloaded_bytes = downloaded;
                item.progress = progress.min(99.0);
                item.speed = speed;
                emit_progress(app, item);
            }
            save_db(app, &dl);
        }
    }

    file.flush().await.map_err(|e| e.to_string())?;
    Ok(())
}
