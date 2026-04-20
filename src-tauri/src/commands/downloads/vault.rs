use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Get (or create) the vault directory for offline downloads.
pub fn vault_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let vault = base.join("OfflineVault");
    std::fs::create_dir_all(&vault).map_err(|e| e.to_string())?;
    Ok(vault)
}

/// Get or create the 256-bit AES encryption key stored in the app data dir.
pub fn get_or_create_key(app: &AppHandle) -> Result<[u8; 32], String> {
    let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let path = base.join("vault-key.bin");
    if path.exists() {
        let data = std::fs::read(&path).map_err(|e| e.to_string())?;
        if data.len() >= 32 {
            let mut key = [0u8; 32];
            key.copy_from_slice(&data[..32]);
            return Ok(key);
        }
    }
    let mut key = [0u8; 32];
    use rand::RngCore;
    rand::thread_rng().fill_bytes(&mut key);
    std::fs::create_dir_all(&base).map_err(|e| e.to_string())?;
    std::fs::write(&path, &key).map_err(|e| e.to_string())?;
    Ok(key)
}

/// Check available disk space. Desktop only (uses `fs2`).
#[cfg(desktop)]
pub fn check_disk_space(vault: &PathBuf, min_bytes: u64) -> Result<(), String> {
    if let Ok(available) = fs2::available_space(vault) {
        if available < min_bytes {
            return Err(format!(
                "Not enough disk space. {}MB free, need {}MB.",
                available / 1024 / 1024,
                min_bytes / 1024 / 1024
            ));
        }
    }
    Ok(())
}
