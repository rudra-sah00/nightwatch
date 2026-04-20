mod cipher;
mod commands;
mod hls;
mod mp4;
mod progress;
pub mod state;
pub mod types;
mod vault;

// Re-export what main.rs needs
pub use commands::{cancel_download, get_downloads, pause_download, resume_download, start_download};
pub use progress::init_downloads;
pub use state::DownloadManagerState;
