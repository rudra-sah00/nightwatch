use std::collections::HashMap;
use tauri::{AppHandle, Emitter, Manager};

use super::state::DownloadManagerState;
use super::types::DownloadItem;

/// Emit a download progress event to the frontend.
pub fn emit_progress(app: &AppHandle, item: &DownloadItem) {
    let _ = app.emit("download-progress", item);
}

/// Persist the download database to disk as JSON.
pub fn save_db(app: &AppHandle, downloads: &HashMap<String, DownloadItem>) {
    if let Ok(base) = app.path().app_data_dir() {
        let db_path = base.join("downloads.json");
        let items: Vec<&DownloadItem> = downloads.values().collect();
        if let Ok(json) = serde_json::to_string(&items) {
            let _ = std::fs::write(db_path, json);
        }
    }
}

/// Load the download database from disk. Marks interrupted downloads as PAUSED.
pub fn load_db(app: &AppHandle) -> HashMap<String, DownloadItem> {
    let mut map = HashMap::new();
    if let Ok(base) = app.path().app_data_dir() {
        let db_path = base.join("downloads.json");
        if let Ok(data) = std::fs::read_to_string(db_path) {
            if let Ok(items) = serde_json::from_str::<Vec<DownloadItem>>(&data) {
                for mut item in items {
                    if item.status == "DOWNLOADING" {
                        item.status = "PAUSED".into();
                        item.speed = String::new();
                    }
                    map.insert(item.content_id.clone(), item);
                }
            }
        }
    }
    map
}

/// Restore downloads from disk on app startup.
pub fn init_downloads(app: &AppHandle) {
    let restored = load_db(app);
    if !restored.is_empty() {
        let state = app.state::<DownloadManagerState>();
        let mut dl = state.downloads.lock().unwrap();
        *dl = restored;
    }
}

/// Format bytes/sec into a human-readable speed string.
pub fn format_speed(bytes_per_sec: f64) -> String {
    if bytes_per_sec <= 0.0 {
        return String::new();
    }
    let units = ["B/s", "KB/s", "MB/s", "GB/s"];
    let mut val = bytes_per_sec;
    for unit in &units {
        if val < 1024.0 {
            return format!("{:.1} {}", val, unit);
        }
        val /= 1024.0;
    }
    format!("{:.1} GB/s", val)
}
