use serde::{Deserialize, Serialize};

/// Config received from the frontend when starting a download.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadConfig {
    pub content_id: String,
    pub title: String,
    pub provider: String,
    pub hls_url: Option<String>,
    pub mp4_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub trailer_url: Option<String>,
    pub poster_url: Option<String>,
    pub quality: Option<String>,
    pub subtitle_tracks: Option<Vec<SubtitleTrack>>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubtitleTrack {
    pub label: String,
    pub language: String,
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub local_path: Option<String>,
}

/// Persistent download item — matches the frontend `DownloadItem` interface.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadItem {
    pub content_id: String,
    pub title: String,
    pub status: String,
    pub progress: f64,
    pub downloaded_bytes: u64,
    pub filesize: Option<u64>,
    pub speed: String,
    pub is_mp4: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub poster_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub local_playlist_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quality: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub show_data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub subtitle_tracks: Option<Vec<SubtitleTrack>>,
    pub segments_total: usize,
    pub segments_downloaded: usize,
    pub created_at: u64,
}

impl DownloadItem {
    pub fn new(config: &DownloadConfig, is_mp4: bool) -> Self {
        Self {
            content_id: config.content_id.clone(),
            title: config.title.clone(),
            status: "QUEUED".into(),
            progress: 0.0,
            downloaded_bytes: 0,
            filesize: None,
            speed: String::new(),
            is_mp4,
            poster_url: config.poster_url.clone(),
            local_playlist_path: None,
            quality: config.quality.clone(),
            error: None,
            show_data: config.metadata.clone(),
            subtitle_tracks: None,
            segments_total: 0,
            segments_downloaded: 0,
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64,
        }
    }
}

/// URL-encode a path segment for offline-media:// URLs.
pub fn urlencode(s: &str) -> String {
    let mut out = String::new();
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(b as char)
            }
            _ => out.push_str(&format!("%{:02X}", b)),
        }
    }
    out
}

/// Resolve a potentially-relative segment URL against a base playlist URL.
pub fn resolve_url(base: &str, segment: &str) -> String {
    if segment.starts_with("http") {
        return segment.to_string();
    }
    let base_dir = base.rsplit_once('/').map(|(b, _)| b).unwrap_or(base);
    format!("{}/{}", base_dir, segment)
}
