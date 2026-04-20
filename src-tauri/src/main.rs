#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use commands::{
    downloads::{
        cancel_download, get_downloads, pause_download, resume_download, start_download,
        DownloadManagerState,
    },
    live_bridge::{start_live_bridge, stop_live_bridge, LiveBridgeState},
    offline_media::{get_offline_media_base, OfflineMediaState},
    window::{copy_to_clipboard, get_app_version, read_offline_file, set_native_theme, set_pip, show_notification},
};
use tauri::{Emitter, Manager};

#[cfg(desktop)]
use commands::{
    discord::{destroy_discord, init_discord, set_discord_activity, DiscordState},
    window::{set_badge, set_run_on_boot, toggle_keep_awake, WindowState},
};

#[cfg(desktop)]
use tauri::WindowEvent;

fn main() {
    let mut builder = tauri::Builder::default();

    // --- Desktop-only: menu bar ---
    #[cfg(desktop)]
    {
        builder = builder.menu(|_app| tauri::menu::Menu::new(_app));
    }

    // --- Cross-platform plugins ---
    builder = builder
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_shell::init());

    // --- Desktop-only plugins ---
    #[cfg(desktop)]
    {
        builder = builder
            .plugin(tauri_plugin_global_shortcut::Builder::new().build())
            .plugin(tauri_plugin_updater::Builder::new().build())
            .plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                None,
            ));
    }

    // --- Desktop-only state ---
    #[cfg(desktop)]
    {
        builder = builder
            .manage(WindowState::default())
            .manage(DiscordState::default());
    }

    // --- Cross-platform state ---
    builder = builder
        .manage(DownloadManagerState::default())
        .manage(LiveBridgeState::default())
        .manage(OfflineMediaState::default());

    // --- Command handlers ---
    #[cfg(desktop)]
    let builder = builder.invoke_handler(tauri::generate_handler![
        set_pip,
        set_native_theme,
        copy_to_clipboard,
        show_notification,
        get_app_version,
        read_offline_file,
        get_offline_media_base,
        start_download,
        cancel_download,
        pause_download,
        resume_download,
        get_downloads,
        start_live_bridge,
        stop_live_bridge,
        // Desktop-only commands
        set_badge,
        toggle_keep_awake,
        set_run_on_boot,
        init_discord,
        set_discord_activity,
        destroy_discord,
    ]);

    #[cfg(mobile)]
    let builder = builder.invoke_handler(tauri::generate_handler![
        set_pip,
        set_native_theme,
        copy_to_clipboard,
        show_notification,
        get_app_version,
        read_offline_file,
        get_offline_media_base,
        start_download,
        cancel_download,
        pause_download,
        resume_download,
        get_downloads,
        start_live_bridge,
        stop_live_bridge,
    ]);

    builder
        .setup(|app| {
            // --- Cross-platform: restore downloads ---
            commands::downloads::init_downloads(&app.handle());

            // --- Desktop: custom protocol for offline media ---
            #[cfg(desktop)]
            commands::offline_media::register_offline_media_protocol(app)?;

            // --- Mobile: local HTTP server for offline media ---
            #[cfg(mobile)]
            commands::offline_media::start_offline_media_server(app)?;

            // --- Desktop-only setup ---
            #[cfg(desktop)]
            {
                // System tray
                commands::tray::setup_tray(app)?;

                // Discord RPC (silent background init)
                let app_handle = app.handle().clone();
                std::thread::spawn(move || {
                    let state = app_handle.state::<DiscordState>();
                    let mut guard = state.conn.lock().unwrap();
                    if let Ok(mut ipc) = commands::discord::DiscordIpc::connect() {
                        let _ = ipc.handshake();
                        *guard = Some(ipc);
                    }
                });

                // Global shortcuts: media keys + PTT
                setup_global_shortcuts(app);

                // Window setup
                if let Some(window) = app.get_webview_window("main") {
                    let win_show = window.clone();
                    let win_inject = window.clone();
                    let win_fs = window.clone();
                    let app_fs = app.handle().clone();

                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(300));
                        let _ = win_show.show();
                    });

                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_secs(2));
                        let _ = win_inject.eval(INJECT_SCRIPT);
                    });

                    window.on_window_event(move |event| match event {
                        WindowEvent::Resized(_) => {
                            if let Ok(fs) = win_fs.is_fullscreen() {
                                let _ = app_fs.emit("window-fullscreen-changed", fs);
                            }
                        }
                        WindowEvent::Focused(focused) => {
                            if *focused {
                                let _ = app_fs.emit("window-focus", ());
                            } else {
                                let _ = app_fs.emit("window-blur", ());
                            }
                        }
                        _ => {}
                    });
                }
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error building tauri app")
        .run(|_app_handle, _event| {
            #[cfg(desktop)]
            {
                if let tauri::RunEvent::Exit = _event {
                    // Cleanup Discord
                    {
                        let state = _app_handle.state::<DiscordState>();
                        let mut conn = state.conn.lock().unwrap();
                        if let Some(mut ipc) = conn.take() {
                            let _ = ipc.close();
                        }
                    }
                    // Cleanup power save blocker
                    {
                        let ws = _app_handle.state::<WindowState>();
                        let mut guard = ws.keep_awake_id.lock().unwrap();
                        #[cfg(target_os = "macos")]
                        {
                            if let Some(pid) = guard.take() {
                                let _ = std::process::Command::new("kill")
                                    .arg(pid.to_string())
                                    .output();
                            }
                        }
                        #[cfg(target_os = "windows")]
                        {
                            extern "system" {
                                fn SetThreadExecutionState(flags: u32) -> u32;
                            }
                            unsafe {
                                SetThreadExecutionState(0x80000000);
                            }
                            *guard = None;
                        }
                    }
                }
            }
        });
}

// --- Desktop-only: Global shortcuts ---

#[cfg(desktop)]
fn setup_global_shortcuts(app: &tauri::App) {
    use tauri_plugin_global_shortcut::GlobalShortcutExt;

    let handle = app.handle().clone();

    let media_keys = [
        "MediaPlayPause",
        "MediaNextTrack",
        "MediaPreviousTrack",
        "MediaStop",
    ];
    for key_str in media_keys {
        let h = handle.clone();
        let cmd = key_str.to_string();
        let _ = app
            .global_shortcut()
            .on_shortcut(key_str, move |_app, _shortcut, _event| {
                let _ = h.emit("media-command", &cmd);
            });
    }

    let h = handle.clone();
    let _ = app
        .global_shortcut()
        .on_shortcut("CmdOrCtrl+Shift+M", move |_app, _shortcut, _event| {
            let _ = h.emit("media-command", "toggle-ptt");
        });
}

// --- Desktop-only: Injected JavaScript ---

#[cfg(desktop)]
const INJECT_SCRIPT: &str = r#"
(function() {
    if (window.__tauri_injected) return;
    window.__tauri_injected = true;

    const drag = document.createElement('div');
    drag.id = '__tauri_drag';
    drag.style.cssText = 'position:fixed;top:0;left:0;right:0;height:40px;z-index:99999;-webkit-app-region:drag;';
    drag.addEventListener('mousedown', async (e) => {
        if (e.target.closest('a,button,input,select,textarea,[data-no-drag]')) return;
        if (e.buttons === 1) {
            try {
                const ii = window.__TAURI_INTERNALS__ || window.__TAURI__;
                if (ii && ii.invoke) await ii.invoke('plugin:window|start_dragging');
            } catch(err) {}
        }
    });
    document.body.prepend(drag);

    const attachNavDrag = () => {
        const nav = document.querySelector('nav');
        if (!nav || nav.__dragAttached) return;
        nav.__dragAttached = true;
        nav.addEventListener('mousedown', async (e) => {
            if (e.target.closest('a,button,input,select,textarea,[data-no-drag]')) return;
            if (e.buttons === 1) {
                try {
                    const ii = window.__TAURI_INTERNALS__ || window.__TAURI__;
                    if (ii && ii.invoke) await ii.invoke('plugin:window|start_dragging');
                } catch(err) {}
            }
        });
    };
    attachNavDrag();
    new MutationObserver(() => attachNavDrag()).observe(document.body, { childList: true, subtree: true });

    const origPush = history.pushState;
    const origReplace = history.replaceState;
    history.pushState = function() { origPush.apply(this, arguments); attachNavDrag(); };
    history.replaceState = function() { origReplace.apply(this, arguments); attachNavDrag(); };
})();
"#;
