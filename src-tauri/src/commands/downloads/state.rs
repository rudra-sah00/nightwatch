use std::collections::HashMap;
use std::sync::Mutex;

use super::types::DownloadItem;

/// Shared state for the download manager, managed by Tauri.
pub struct DownloadManagerState {
    pub downloads: Mutex<HashMap<String, DownloadItem>>,
    pub cancel_flags: Mutex<HashMap<String, tokio::sync::watch::Sender<bool>>>,
}

impl Default for DownloadManagerState {
    fn default() -> Self {
        Self {
            downloads: Mutex::new(HashMap::new()),
            cancel_flags: Mutex::new(HashMap::new()),
        }
    }
}
