use reqwest::Client;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};

use super::hls::download_hls;
use super::mp4::download_mp4;
use super::progress::{emit_progress, save_db};
use super::state::DownloadManagerState;
use super::types::{urlencode, DownloadConfig, DownloadItem, SubtitleTrack};
use super::vault;

// --- Simple file download (posters, subtitles, trailers) ---

async fn download_file_simple(client: &Client, url: &str, dest: &PathBuf) -> Result<(), String> {
    let bytes = client
        .get(url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .bytes()
        .await
        .map_err(|e| e.to_string())?;
    if let Some(p) = dest.parent() {
        tokio::fs::create_dir_all(p)
            .await
            .map_err(|e| e.to_string())?;
    }
    tokio::fs::write(dest, &bytes)
        .await
        .map_err(|e| e.to_string())
}

// --- Download orchestrator: handles assets + dispatches to HLS or MP4 ---

async fn download_task(
    app: &AppHandle,
    client: &Client,
    config: &DownloadConfig,
    key: &[u8; 32],
    content_dir: &PathBuf,
    cancel_rx: tokio::sync::watch::Receiver<bool>,
) -> Result<(), String> {
    let cid = &config.content_id;

    // --- Download poster ---
    if let Some(poster_url) = &config.poster_url {
        if !poster_url.starts_with("offline-media://") {
            let ext = poster_url.rsplit('.').next().unwrap_or("jpg");
            let ext = if ["jpg", "jpeg", "png", "webp"].contains(&ext) {
                ext
            } else {
                "jpg"
            };
            let dest = content_dir.join(format!("poster.{}", ext));
            if !dest.exists() {
                let _ = download_file_simple(client, poster_url, &dest).await;
            }
            let state = app.state::<DownloadManagerState>();
            let mut dl = state.downloads.lock().unwrap();
            if let Some(item) = dl.get_mut(cid) {
                item.poster_url = Some(format!(
                    "offline-media://local/{}/poster.{}",
                    urlencode(cid),
                    ext
                ));
            }
        }
    }

    // --- Download subtitles ---
    if let Some(tracks) = &config.subtitle_tracks {
        let mut processed = Vec::new();
        for track in tracks.iter() {
            let ext = if track.url.contains(".srt") { "srt" } else { "vtt" };
            let name = format!(
                "subtitle_{}.{}",
                track
                    .language
                    .replace(|c: char| !c.is_alphanumeric(), "_"),
                ext
            );
            let dest = content_dir.join(&name);
            if !dest.exists() {
                let _ = download_file_simple(client, &track.url, &dest).await;
            }
            processed.push(SubtitleTrack {
                label: track.label.clone(),
                language: track.language.clone(),
                url: track.url.clone(),
                local_path: Some(format!(
                    "offline-media://local/{}/{}",
                    urlencode(cid),
                    name
                )),
            });
        }
        let state = app.state::<DownloadManagerState>();
        let mut dl = state.downloads.lock().unwrap();
        if let Some(item) = dl.get_mut(cid) {
            item.subtitle_tracks = Some(processed);
        }
    }

    // --- Provider-specific: s2 trailer ---
    if config.provider == "s2" {
        if let Some(trailer_url) = &config.trailer_url {
            let dest = content_dir.join("trailer.mp4");
            if !dest.exists() {
                let _ = download_file_simple(client, trailer_url, &dest).await;
            }
        }
    }

    // --- Dispatch to the right downloader based on content type ---
    let is_mp4 = config.mp4_url.is_some()
        || config.hls_url.as_ref().map_or(false, |u| {
            u.contains(".mp4") || u.contains("/subject/play") || u.contains("?dl=1")
        });

    if is_mp4 {
        download_mp4(app, client, config, key, content_dir, &cancel_rx).await?;
        let state = app.state::<DownloadManagerState>();
        let mut dl = state.downloads.lock().unwrap();
        if let Some(item) = dl.get_mut(cid) {
            item.local_playlist_path = Some(format!(
                "offline-media://local/{}/movie.mp4",
                urlencode(cid)
            ));
        }
    } else {
        download_hls(app, client, config, key, content_dir, &cancel_rx).await?;
        let state = app.state::<DownloadManagerState>();
        let mut dl = state.downloads.lock().unwrap();
        if let Some(item) = dl.get_mut(cid) {
            item.local_playlist_path = Some(format!(
                "offline-media://local/{}/local_playlist.m3u8",
                urlencode(cid)
            ));
        }
    }

    Ok(())
}

// =============================================================================
// Tauri commands
// =============================================================================

#[tauri::command]
pub async fn start_download(app: AppHandle, config: DownloadConfig) -> Result<(), String> {
    {
        let state = app.state::<DownloadManagerState>();
        let dl = state.downloads.lock().unwrap();
        if dl.len() >= 100 {
            return Err("Download queue full (max 100)".into());
        }
    }

    let vault = vault::vault_dir(&app)?;

    #[cfg(desktop)]
    vault::check_disk_space(&vault, 500 * 1024 * 1024)?;

    let key = vault::get_or_create_key(&app)?;
    let content_dir = vault.join(&config.content_id);
    std::fs::create_dir_all(&content_dir).map_err(|e| e.to_string())?;

    let is_mp4 = config.mp4_url.is_some()
        || config
            .hls_url
            .as_ref()
            .map_or(false, |u| u.contains(".mp4"));

    let (cancel_tx, cancel_rx) = tokio::sync::watch::channel(false);
    {
        let state = app.state::<DownloadManagerState>();
        state
            .cancel_flags
            .lock()
            .unwrap()
            .insert(config.content_id.clone(), cancel_tx);
    }

    let item = DownloadItem::new(&config, is_mp4);
    {
        let state = app.state::<DownloadManagerState>();
        let mut dl = state.downloads.lock().unwrap();
        dl.insert(config.content_id.clone(), item.clone());
        save_db(&app, &dl);
    }
    emit_progress(&app, &item);

    let app2 = app.clone();
    let cid = config.content_id.clone();

    tokio::spawn(async move {
        // Mark as DOWNLOADING
        {
            let state = app2.state::<DownloadManagerState>();
            let mut dl = state.downloads.lock().unwrap();
            if let Some(item) = dl.get_mut(&cid) {
                item.status = "DOWNLOADING".into();
            }
            emit_progress(&app2, dl.get(&cid).unwrap());
        }

        let client = Client::new();
        let result =
            download_task(&app2, &client, &config, &key, &content_dir, cancel_rx).await;

        // Update final status
        let state = app2.state::<DownloadManagerState>();
        let mut dl = state.downloads.lock().unwrap();
        if let Some(item) = dl.get_mut(&cid) {
            if item.status == "CANCELLED" {
                return;
            }
            if item.status == "PAUSED" {
                save_db(&app2, &dl);
                return;
            }
            match result {
                Ok(_) => {
                    item.status = "COMPLETED".into();
                    item.progress = 100.0;
                    item.speed = String::new();
                }
                Err(e) if e == "Cancelled" => {
                    item.status = "CANCELLED".into();
                }
                Err(e) => {
                    item.status = "FAILED".into();
                    item.error = Some(e);
                    item.speed = String::new();
                }
            }
            emit_progress(&app2, item);
            save_db(&app2, &dl);
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn cancel_download(app: AppHandle, content_id: String) -> Result<(), String> {
    let state = app.state::<DownloadManagerState>();
    if let Some(tx) = state.cancel_flags.lock().unwrap().remove(&content_id) {
        let _ = tx.send(true);
    }
    {
        let mut dl = state.downloads.lock().unwrap();
        dl.remove(&content_id);
        save_db(&app, &dl);
    }
    if let Ok(v) = vault::vault_dir(&app) {
        let p = v.join(&content_id);
        if p.exists() {
            let _ = std::fs::remove_dir_all(p);
        }
    }
    let _ = app.emit(
        "download-progress",
        serde_json::json!({"contentId": content_id, "status": "CANCELLED"}),
    );
    Ok(())
}

#[tauri::command]
pub async fn pause_download(app: AppHandle, content_id: String) -> Result<(), String> {
    let state = app.state::<DownloadManagerState>();
    if let Some(tx) = state.cancel_flags.lock().unwrap().get(&content_id) {
        let _ = tx.send(true);
    }
    let mut dl = state.downloads.lock().unwrap();
    if let Some(item) = dl.get_mut(&content_id) {
        item.status = "PAUSED".into();
        item.speed = String::new();
        emit_progress(&app, item);
    }
    save_db(&app, &dl);
    Ok(())
}

#[tauri::command]
pub async fn resume_download(app: AppHandle, content_id: String) -> Result<(), String> {
    let state = app.state::<DownloadManagerState>();
    let mut dl = state.downloads.lock().unwrap();
    if let Some(item) = dl.get_mut(&content_id) {
        item.status = "QUEUED".into();
        emit_progress(&app, item);
    }
    save_db(&app, &dl);
    Ok(())
}

#[tauri::command]
pub async fn get_downloads(app: AppHandle) -> Result<Vec<DownloadItem>, String> {
    let state = app.state::<DownloadManagerState>();
    let dl = state.downloads.lock().unwrap();
    Ok(dl.values().cloned().collect())
}
