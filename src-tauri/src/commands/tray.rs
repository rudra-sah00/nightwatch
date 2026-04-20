use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    App, Emitter, Manager,
};

pub fn setup_tray(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    let show = MenuItem::with_id(app, "show", "Show Interface", true, None::<&str>)?;
    let play_pause = MenuItem::with_id(app, "play_pause", "Play/Pause Video", true, None::<&str>)?;
    let toggle_mic =
        MenuItem::with_id(app, "toggle_mic", "Toggle Microphone", true, None::<&str>)?;
    let about = MenuItem::with_id(app, "about", "About", true, None::<&str>)?;
    let updates =
        MenuItem::with_id(app, "check_updates", "Check for Updates", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(
        app,
        &[
            &show,
            &sep1,
            &play_pause,
            &toggle_mic,
            &sep2,
            &about,
            &updates,
            &quit,
        ],
    )?;

    TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Watch Rudra")
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "show" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "play_pause" => {
                let _ = app.emit("tray-play-pause", ());
            }
            "toggle_mic" => {
                let _ = app.emit("tray-toggle-mic", ());
            }
            "about" => {
                let _ = app.emit("tray-about", ());
            }
            "check_updates" => {
                let _ = app.emit("tray-check-updates", ());
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::Click { .. } = event {
                let app = tray.app_handle();
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}
