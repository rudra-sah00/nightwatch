use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager};

#[cfg(desktop)]
use std::sync::Mutex;

#[cfg(desktop)]
#[derive(Default, Serialize, Deserialize, Clone)]
pub struct PipBounds {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[cfg(desktop)]
#[derive(Default)]
pub struct WindowState {
    pub pre_pip_bounds: Mutex<Option<PipBounds>>,
    pub keep_awake_id: Mutex<Option<u32>>,
}

// --- PiP: cross-platform with different implementations ---

#[cfg(desktop)]
#[tauri::command]
pub async fn set_pip(app: AppHandle, enabled: bool, opacity: f64) -> Result<(), String> {
    let win = app.get_webview_window("main").ok_or("no main window")?;
    let state = app.state::<WindowState>();

    if enabled {
        let pos = win.outer_position().map_err(|e| e.to_string())?;
        let size = win.outer_size().map_err(|e| e.to_string())?;
        *state.pre_pip_bounds.lock().unwrap() = Some(PipBounds {
            x: pos.x as f64,
            y: pos.y as f64,
            width: size.width as f64,
            height: size.height as f64,
        });

        if let Ok(Some(m)) = win.current_monitor() {
            let ms = m.size();
            let mp = m.position();
            let x = mp.x + ms.width as i32 - 480 - 20;
            let y = mp.y + ms.height as i32 - 270 - 20;
            win.set_position(tauri::PhysicalPosition::new(x, y))
                .map_err(|e| e.to_string())?;
        }
        win.set_size(tauri::PhysicalSize::new(480u32, 270u32))
            .map_err(|e| e.to_string())?;
        win.set_always_on_top(true).map_err(|e| e.to_string())?;
        app.emit("pip-opacity", opacity).map_err(|e| e.to_string())?;
    } else {
        win.set_always_on_top(false).map_err(|e| e.to_string())?;
        if let Some(bounds) = state.pre_pip_bounds.lock().unwrap().take() {
            win.set_position(tauri::PhysicalPosition::new(bounds.x as i32, bounds.y as i32))
                .map_err(|e| e.to_string())?;
            win.set_size(tauri::PhysicalSize::new(bounds.width as u32, bounds.height as u32))
                .map_err(|e| e.to_string())?;
        }
        app.emit("pip-opacity", 1.0).map_err(|e| e.to_string())?;
    }
    app.emit("pip-mode-changed", enabled).map_err(|e| e.to_string())?;
    Ok(())
}

/// Mobile PiP: emits event to frontend to trigger browser-native PiP on the video element.
/// iOS Safari and Android Chrome both support `requestPictureInPicture()` on <video>.
#[cfg(mobile)]
#[tauri::command]
pub async fn set_pip(app: AppHandle, enabled: bool, _opacity: f64) -> Result<(), String> {
    app.emit("pip-mode-changed", enabled).map_err(|e| e.to_string())
}

// --- Desktop-only commands ---

#[cfg(desktop)]
#[tauri::command]
pub async fn set_badge(app: AppHandle, count: u32) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let _ = &app;
        use std::process::Command;
        let badge = if count == 0 {
            String::new()
        } else {
            count.to_string()
        };
        Command::new("osascript")
            .args([
                "-e",
                &format!(
                    "tell application \"System Events\" to tell (first process whose frontmost is true) to set value of attribute \"AXBadgeLabel\" to \"{}\"",
                    badge
                ),
            ])
            .output()
            .ok();
    }
    #[cfg(target_os = "windows")]
    {
        if let Some(win) = app.get_webview_window("main") {
            let title = if count == 0 {
                "Watch Rudra".into()
            } else {
                format!("Watch Rudra ({})", count)
            };
            win.set_title(&title).map_err(|e| e.to_string())?;
        }
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = (app, count);
    }
    Ok(())
}

#[cfg(desktop)]
#[tauri::command]
pub async fn toggle_keep_awake(app: AppHandle, keep_awake: bool) -> Result<(), String> {
    let state = app.state::<WindowState>();

    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        if keep_awake {
            let child = Command::new("caffeinate")
                .args(["-d", "-i"])
                .spawn()
                .map_err(|e| e.to_string())?;
            *state.keep_awake_id.lock().unwrap() = Some(child.id());
        } else if let Some(pid) = state.keep_awake_id.lock().unwrap().take() {
            let _ = Command::new("kill").arg(pid.to_string()).output();
        }
    }

    #[cfg(target_os = "windows")]
    {
        extern "system" {
            fn SetThreadExecutionState(flags: u32) -> u32;
        }
        const ES_CONTINUOUS: u32 = 0x80000000;
        const ES_DISPLAY_REQUIRED: u32 = 0x00000002;
        const ES_SYSTEM_REQUIRED: u32 = 0x00000001;
        unsafe {
            if keep_awake {
                SetThreadExecutionState(ES_CONTINUOUS | ES_DISPLAY_REQUIRED | ES_SYSTEM_REQUIRED);
                *state.keep_awake_id.lock().unwrap() = Some(1);
            } else {
                SetThreadExecutionState(ES_CONTINUOUS);
                *state.keep_awake_id.lock().unwrap() = None;
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let _ = (keep_awake, state);
    }

    Ok(())
}

#[cfg(desktop)]
#[tauri::command]
pub async fn set_run_on_boot(app: AppHandle, enabled: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;
    let autostart = app.autolaunch();
    if enabled {
        autostart.enable().map_err(|e| e.to_string())?;
    } else {
        autostart.disable().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// --- Cross-platform commands ---

#[tauri::command]
pub async fn set_native_theme(app: AppHandle, theme: String) -> Result<(), String> {
    app.emit("theme-changed", &theme).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn copy_to_clipboard(app: AppHandle, text: String) -> Result<(), String> {
    use tauri_plugin_clipboard_manager::ClipboardExt;
    app.clipboard().write_text(text).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn show_notification(app: AppHandle, title: String, body: String) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_app_version(app: AppHandle) -> Result<String, String> {
    Ok(app.package_info().version.to_string())
}

/// Read a downloaded file from the offline vault and return it as base64.
/// Used on mobile where the `offline-media://` custom protocol is not available.
/// The frontend can use this with a data: URL or Blob for playback.
#[tauri::command]
pub async fn read_offline_file(app: AppHandle, path: String) -> Result<Vec<u8>, String> {
    use aes::cipher::{KeyIvInit, StreamCipher};
    type Aes256Ctr = ctr::Ctr64BE<aes::Aes256>;

    let base = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let vault = base.join("OfflineVault");

    // Prevent path traversal
    if path.contains("..") {
        return Err("Invalid path".into());
    }

    let file_path = vault.join(&path);
    if !file_path.starts_with(&vault) || !file_path.exists() {
        return Err("File not found".into());
    }

    let mut data = std::fs::read(&file_path).map_err(|e| e.to_string())?;

    // Decrypt .ts and .mp4 files
    let ext = file_path.extension().and_then(|e| e.to_str()).unwrap_or("");
    if matches!(ext, "ts" | "mp4") {
        let key_path = base.join("vault-key.bin");
        if let Ok(key_data) = std::fs::read(&key_path) {
            if key_data.len() >= 32 {
                let mut key = [0u8; 32];
                key.copy_from_slice(&key_data[..32]);
                let iv = [0u8; 16];
                let mut cipher = Aes256Ctr::new(&key.into(), &iv.into());
                cipher.apply_keystream(&mut data);
            }
        }
    }

    Ok(data)
}
