use reqwest::Client;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

use super::cipher::encrypt_chunk;
use super::progress::{emit_progress, format_speed, save_db};
use super::state::DownloadManagerState;
use super::types::{resolve_url, DownloadConfig};

/// Download an HLS stream: parse m3u8, pick quality, download segments with encryption.
/// Supports resume (skips already-downloaded segments) and cancellation.
pub async fn download_hls(
    app: &AppHandle,
    client: &Client,
    config: &DownloadConfig,
    key: &[u8; 32],
    content_dir: &PathBuf,
    cancel_rx: &tokio::sync::watch::Receiver<bool>,
) -> Result<(), String> {
    let hls_url = config.hls_url.as_ref().ok_or("No HLS URL")?;
    let m3u8_text = client
        .get(hls_url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    let (media_url, media_text) = resolve_media_playlist(client, hls_url, &m3u8_text, config).await?;

    let (segments, lines) = parse_segments(&media_url, &media_text);
    let total = segments.iter().filter(|s| !s.2).count();

    // Update total segment count
    {
        let state = app.state::<DownloadManagerState>();
        let mut dl = state.downloads.lock().unwrap();
        if let Some(item) = dl.get_mut(&config.content_id) {
            item.segments_total = total;
        }
    }

    // Resume: find already-downloaded segments
    let (already_done, done_set) = find_completed_segments(&segments, content_dir);
    update_resume_progress(app, &config.content_id, done_set.len(), already_done, total);

    // Rewrite m3u8 to reference local filenames
    let rewritten_lines = rewrite_playlist(&segments, &lines);

    // Download all segments concurrently (5 parallel)
    download_segments(
        app, client, &segments, &done_set, content_dir, key, total, already_done, cancel_rx, &config.content_id,
    )
    .await?;

    // Write final local playlist
    tokio::fs::write(
        content_dir.join("local_playlist.m3u8"),
        rewritten_lines.join("\n"),
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}

// --- Internal helpers ---

/// If the m3u8 is a master playlist, pick the right quality variant and fetch it.
async fn resolve_media_playlist(
    client: &Client,
    hls_url: &str,
    m3u8_text: &str,
    config: &DownloadConfig,
) -> Result<(String, String), String> {
    if !m3u8_text.contains("#EXT-X-STREAM-INF") {
        return Ok((hls_url.to_string(), m3u8_text.to_string()));
    }

    let quality = config.quality.as_deref().unwrap_or("high");
    let mut playlists: Vec<(u64, String)> = Vec::new();
    let mut bw: u64 = 0;

    for line in m3u8_text.lines() {
        if line.starts_with("#EXT-X-STREAM-INF") {
            if let Some(m) = line.split("BANDWIDTH=").nth(1) {
                bw = m
                    .split(|c: char| !c.is_ascii_digit())
                    .next()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(0);
            }
        } else if !line.starts_with('#') && !line.trim().is_empty() {
            playlists.push((bw, resolve_url(hls_url, line.trim())));
        }
    }
    playlists.sort_by(|a, b| b.0.cmp(&a.0));

    let media_url = match quality {
        "low" => playlists.last().map(|p| p.1.clone()),
        "medium" => playlists.get(playlists.len() / 2).map(|p| p.1.clone()),
        _ => playlists.first().map(|p| p.1.clone()),
    }
    .unwrap_or_else(|| hls_url.to_string());

    let media_text = client
        .get(&media_url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())?;

    Ok((media_url, media_text))
}

/// Parse segments and encryption keys from a media playlist.
/// Returns (line_idx, url, is_key) tuples and the raw lines.
fn parse_segments<'a>(
    media_url: &str,
    media_text: &'a str,
) -> (Vec<(usize, String, bool)>, Vec<&'a str>) {
    let lines: Vec<&str> = media_text.lines().collect();
    let mut segments = Vec::new();

    for (i, line) in lines.iter().enumerate() {
        if line.starts_with("#EXT-X-KEY") {
            if let Some(uri) = line.split("URI=\"").nth(1).and_then(|s| s.split('"').next()) {
                segments.push((i, resolve_url(media_url, uri), true));
            }
        } else if !line.starts_with('#') && !line.trim().is_empty() {
            segments.push((i, resolve_url(media_url, line.trim()), false));
        }
    }

    (segments, lines)
}

/// Check which segments already exist on disk for resume support.
fn find_completed_segments(
    segments: &[(usize, String, bool)],
    content_dir: &PathBuf,
) -> (u64, Vec<String>) {
    let mut already_done = 0u64;
    let mut done_set = Vec::new();

    for (_, _, is_key) in segments {
        if *is_key {
            continue;
        }
        let name = format!("segment_{:05}.ts", done_set.len());
        let path = content_dir.join(&name);
        if path.exists() && std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0) > 0 {
            already_done += std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
            done_set.push(name);
        } else {
            break;
        }
    }

    (already_done, done_set)
}

fn update_resume_progress(app: &AppHandle, cid: &str, done: usize, bytes: u64, total: usize) {
    let state = app.state::<DownloadManagerState>();
    let mut dl = state.downloads.lock().unwrap();
    if let Some(item) = dl.get_mut(cid) {
        item.segments_downloaded = done;
        item.downloaded_bytes = bytes;
        item.progress = if total > 0 {
            (done as f64 / total as f64) * 100.0
        } else {
            0.0
        };
        emit_progress(app, item);
    }
}

/// Rewrite the m3u8 playlist to reference local filenames.
fn rewrite_playlist(segments: &[(usize, String, bool)], lines: &[&str]) -> Vec<String> {
    let mut rewritten: Vec<String> = lines.iter().map(|l| l.to_string()).collect();
    let mut seg_idx = 0usize;

    for (line_idx, _, is_key) in segments {
        if *is_key {
            let key_name = format!("key_{}.bin", line_idx);
            if let Some(l) = rewritten.get_mut(*line_idx) {
                if let Some(start) = l.find("URI=\"") {
                    if let Some(end) = l[start + 5..].find('"') {
                        *l = format!("{}URI=\"{}\"{}", &l[..start], key_name, &l[start + 5 + end + 1..]);
                    }
                }
            }
        } else {
            rewritten[*line_idx] = format!("segment_{:05}.ts", seg_idx);
            seg_idx += 1;
        }
    }

    rewritten
}

/// Download all segments concurrently with a semaphore limit of 5.
async fn download_segments(
    app: &AppHandle,
    client: &Client,
    segments: &[(usize, String, bool)],
    done_set: &[String],
    content_dir: &PathBuf,
    key: &[u8; 32],
    total: usize,
    already_done: u64,
    cancel_rx: &tokio::sync::watch::Receiver<bool>,
    cid: &str,
) -> Result<(), String> {
    let sem = std::sync::Arc::new(tokio::sync::Semaphore::new(5));
    let completed =
        std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(done_set.len()));
    let bytes_total =
        std::sync::Arc::new(std::sync::atomic::AtomicU64::new(already_done));
    let last_tick = std::sync::Arc::new(Mutex::new(std::time::Instant::now()));
    let bytes_since_tick = std::sync::Arc::new(std::sync::atomic::AtomicU64::new(0));

    let mut handles = Vec::new();
    let mut seg_counter = 0usize;

    for (line_idx, url, is_key) in segments {
        if *cancel_rx.borrow() {
            return Err("Cancelled".into());
        }

        let local_name = if *is_key {
            format!("key_{}.bin", line_idx)
        } else {
            let name = format!("segment_{:05}.ts", seg_counter);
            seg_counter += 1;
            if done_set.contains(&name) {
                continue;
            }
            name
        };

        let permit = sem.clone().acquire_owned().await.map_err(|e| e.to_string())?;
        let client = client.clone();
        let dest = content_dir.join(&local_name);
        let url = url.clone();
        let key_bytes = *key;
        let is_key = *is_key;
        let completed = completed.clone();
        let bytes_total = bytes_total.clone();
        let bytes_since_tick = bytes_since_tick.clone();
        let last_tick = last_tick.clone();
        let app = app.clone();
        let cid = cid.to_string();
        let cancel_rx = cancel_rx.clone();

        handles.push(tokio::spawn(async move {
            let _permit = permit;
            if *cancel_rx.borrow() {
                return Err::<(), String>("Cancelled".into());
            }

            let bytes = client
                .get(&url)
                .send()
                .await
                .map_err(|e| e.to_string())?
                .bytes()
                .await
                .map_err(|e| e.to_string())?;
            let mut data = bytes.to_vec();
            let chunk_len = data.len() as u64;

            if !is_key && local_name.ends_with(".ts") {
                encrypt_chunk(&key_bytes, 0, &mut data);
            }
            tokio::fs::write(&dest, &data)
                .await
                .map_err(|e| e.to_string())?;

            if !is_key {
                let done =
                    completed.fetch_add(1, std::sync::atomic::Ordering::Relaxed) + 1;
                let total_bytes = bytes_total
                    .fetch_add(chunk_len, std::sync::atomic::Ordering::Relaxed)
                    + chunk_len;
                bytes_since_tick
                    .fetch_add(chunk_len, std::sync::atomic::Ordering::Relaxed);

                let mut tick = last_tick.lock().unwrap();
                let elapsed = tick.elapsed().as_millis();
                let speed = if elapsed > 1000 {
                    let bst =
                        bytes_since_tick.swap(0, std::sync::atomic::Ordering::Relaxed);
                    *tick = std::time::Instant::now();
                    format_speed(bst as f64 / (elapsed as f64 / 1000.0))
                } else {
                    String::new()
                };
                drop(tick);

                let progress = (done as f64 / total as f64) * 100.0;
                let state = app.state::<DownloadManagerState>();
                let mut dl = state.downloads.lock().unwrap();
                if let Some(item) = dl.get_mut(&cid) {
                    item.segments_downloaded = done;
                    item.downloaded_bytes = total_bytes;
                    item.progress = progress;
                    if !speed.is_empty() {
                        item.speed = speed;
                    }
                    emit_progress(&app, item);
                }
                save_db(&app, &dl);
            }
            Ok(())
        }));
    }

    for h in handles {
        h.await.map_err(|e| e.to_string())??;
    }

    Ok(())
}
