use aes::cipher::{KeyIvInit, StreamCipher};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

type Aes256Ctr = ctr::Ctr64BE<aes::Aes256>;

#[allow(dead_code)]
pub struct OfflineMediaState {
    /// On mobile, the local HTTP server port. On desktop, None (uses custom protocol).
    pub server_port: Mutex<Option<u16>>,
}

impl Default for OfflineMediaState {
    fn default() -> Self {
        Self {
            server_port: Mutex::new(None),
        }
    }
}

fn vault_base(app: &tauri::App) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("OfflineVault")
}

fn read_vault_key(app: &tauri::App) -> [u8; 32] {
    let path = app
        .path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("vault-key.bin");
    if let Ok(data) = std::fs::read(&path) {
        if data.len() >= 32 {
            let mut key = [0u8; 32];
            key.copy_from_slice(&data[..32]);
            return key;
        }
    }
    [0u8; 32]
}

fn decrypt_range(key: &[u8; 32], offset: u64, data: &mut [u8]) {
    let mut iv = [0u8; 16];
    let block_num = offset / 16;
    iv[8..16].copy_from_slice(&block_num.to_be_bytes());
    let mut cipher = Aes256Ctr::new(key.into(), &iv.into());
    let skip = (offset % 16) as usize;
    if skip > 0 {
        let mut discard = vec![0u8; skip];
        cipher.apply_keystream(&mut discard);
    }
    cipher.apply_keystream(data);
}

fn mime_for_ext(ext: &str) -> &'static str {
    match ext {
        "mp4" => "video/mp4",
        "m3u8" => "application/x-mpegURL",
        "ts" => "video/MP2T",
        "vtt" => "text/vtt",
        "srt" => "text/plain",
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "bin" => "application/octet-stream",
        _ => "application/octet-stream",
    }
}

fn needs_decryption(ext: &str) -> bool {
    matches!(ext, "ts" | "mp4")
}

/// Serve a file from the vault with optional range support and decryption.
/// Shared logic used by both the desktop protocol handler and the mobile HTTP server.
fn serve_vault_file(
    vault: &PathBuf,
    key: &[u8; 32],
    path_str: &str,
    range_header: &str,
) -> http::Response<Vec<u8>> {
    if path_str.contains("..") {
        return http::Response::builder()
            .status(400)
            .header("Access-Control-Allow-Origin", "*")
            .body(Vec::new())
            .unwrap();
    }

    let file_path = vault.join(path_str);
    if !file_path.starts_with(vault) || !file_path.exists() {
        return http::Response::builder()
            .status(404)
            .header("Access-Control-Allow-Origin", "*")
            .body(Vec::new())
            .unwrap();
    }

    let ext = file_path.extension().and_then(|e| e.to_str()).unwrap_or("");
    let mime = mime_for_ext(ext);
    let file_size = std::fs::metadata(&file_path).map(|m| m.len()).unwrap_or(0);

    let (start, end) = if range_header.starts_with("bytes=") {
        let range = &range_header[6..];
        let parts: Vec<&str> = range.split('-').collect();
        let s: u64 = parts.first().and_then(|v| v.parse().ok()).unwrap_or(0);
        let e: u64 = parts
            .get(1)
            .and_then(|v| if v.is_empty() { None } else { v.parse().ok() })
            .unwrap_or(file_size.saturating_sub(1));
        (s, e)
    } else {
        (0, file_size.saturating_sub(1))
    };

    let len = (end - start + 1) as usize;
    let mut data = vec![0u8; len];

    {
        use std::io::{Read, Seek, SeekFrom};
        if let Ok(mut file) = std::fs::File::open(&file_path) {
            let _ = file.seek(SeekFrom::Start(start));
            let _ = file.read_exact(&mut data);
        }
    }

    if needs_decryption(ext) {
        decrypt_range(key, start, &mut data);
    }

    let is_range = range_header.starts_with("bytes=");
    let status = if is_range { 206 } else { 200 };

    let mut builder = http::Response::builder()
        .status(status)
        .header("Content-Type", mime)
        .header("Content-Length", len.to_string())
        .header("Accept-Ranges", "bytes")
        .header("Access-Control-Allow-Origin", "*");

    if is_range {
        builder = builder.header(
            "Content-Range",
            format!("bytes {}-{}/{}", start, end, file_size),
        );
    }

    builder.body(data).unwrap()
}

// =============================================================================
// Desktop: custom protocol handler (offline-media://)
// =============================================================================

#[cfg(desktop)]
pub fn register_offline_media_protocol(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let vault = vault_base(app);
    let key = read_vault_key(app);

    app.handle().plugin(
        tauri::plugin::Builder::<tauri::Wry, ()>::new("offline-media-protocol")
            .register_uri_scheme_protocol("offline-media", move |_ctx, request| {
                let uri = request.uri().to_string();
                let path_str = uri
                    .strip_prefix("offline-media://localhost/")
                    .or_else(|| uri.strip_prefix("offline-media://local/"))
                    .or_else(|| uri.strip_prefix("offline-media:///"))
                    .or_else(|| uri.strip_prefix("offline-media://"))
                    .unwrap_or("");

                let range = request
                    .headers()
                    .get("range")
                    .and_then(|v| v.to_str().ok())
                    .unwrap_or("");

                serve_vault_file(&vault, &key, path_str, range)
            })
            .build(),
    )?;

    Ok(())
}

// =============================================================================
// Mobile: local HTTP server serving vault files
// =============================================================================

#[cfg(mobile)]
pub fn start_offline_media_server(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let vault = vault_base(app);
    let key = read_vault_key(app);
    let state = app.state::<OfflineMediaState>();

    let rt = tokio::runtime::Handle::current();
    let (port_tx, port_rx) = std::sync::mpsc::channel();

    std::thread::spawn(move || {
        rt.block_on(async move {
            let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
                .await
                .expect("failed to bind offline media server");
            let port = listener.local_addr().unwrap().port();
            let _ = port_tx.send(port);

            loop {
                if let Ok((stream, _)) = listener.accept().await {
                    let vault = vault.clone();
                    let key = key;
                    tokio::spawn(async move {
                        handle_media_request(stream, &vault, &key).await;
                    });
                }
            }
        });
    });

    let port = port_rx.recv().map_err(|e| e.to_string())?;
    *state.server_port.lock().unwrap() = Some(port);
    log::info!("Offline media server started on port {}", port);

    Ok(())
}

#[cfg(mobile)]
async fn handle_media_request(
    mut stream: tokio::net::TcpStream,
    vault: &PathBuf,
    key: &[u8; 32],
) {
    use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

    let mut reader = BufReader::new(&mut stream);

    // Read request line
    let mut request_line = String::new();
    if reader.read_line(&mut request_line).await.is_err() {
        return;
    }

    // Read headers
    let mut range_header = String::new();
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line).await.is_err() || line == "\r\n" || line.is_empty() {
            break;
        }
        let lower = line.to_lowercase();
        if lower.starts_with("range:") {
            range_header = line[6..].trim().to_string();
        }
    }

    let parts: Vec<&str> = request_line.split_whitespace().collect();
    if parts.len() < 2 {
        return;
    }

    // Handle CORS preflight
    if parts[0] == "OPTIONS" {
        let resp = "HTTP/1.1 204 No Content\r\n\
            Access-Control-Allow-Origin: *\r\n\
            Access-Control-Allow-Methods: GET, OPTIONS\r\n\
            Access-Control-Allow-Headers: Range\r\n\
            Access-Control-Max-Age: 86400\r\n\r\n";
        let _ = stream.write_all(resp.as_bytes()).await;
        return;
    }

    // URL-decode the path and strip leading /
    let raw_path = parts[1];
    let path_str = urldecode(raw_path.strip_prefix('/').unwrap_or(raw_path));

    let response = serve_vault_file(vault, key, &path_str, &range_header);

    let status = response.status().as_u16();
    let mut header_str = format!("HTTP/1.1 {} OK\r\n", status);
    for (name, value) in response.headers() {
        if let Ok(v) = value.to_str() {
            header_str.push_str(&format!("{}: {}\r\n", name, v));
        }
    }
    header_str.push_str("\r\n");

    let _ = stream.write_all(header_str.as_bytes()).await;
    let _ = stream.write_all(response.body()).await;
}

#[cfg(mobile)]
fn urldecode(s: &str) -> String {
    let mut out = Vec::new();
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(val) = u8::from_str_radix(
                std::str::from_utf8(&bytes[i + 1..i + 3]).unwrap_or("00"),
                16,
            ) {
                out.push(val);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

// =============================================================================
// Tauri command: get the offline media base URL (for frontend URL rewriting)
// =============================================================================

/// Returns the base URL for offline media.
/// - Desktop: "offline-media://local" (custom protocol)
/// - Mobile: "http://127.0.0.1:{port}" (local HTTP server)
#[tauri::command]
pub async fn get_offline_media_base(app: tauri::AppHandle) -> Result<String, String> {
    #[cfg(desktop)]
    {
        let _ = app;
        Ok("offline-media://local".into())
    }

    #[cfg(mobile)]
    {
        let state = app.state::<OfflineMediaState>();
        let port = state.server_port.lock().unwrap();
        match *port {
            Some(p) => Ok(format!("http://127.0.0.1:{}", p)),
            None => Err("Offline media server not running".into()),
        }
    }
}
