use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

pub struct LiveBridgeState {
    pub shutdown_tx: Mutex<Option<tokio::sync::oneshot::Sender<()>>>,
    pub stream_url: Arc<Mutex<String>>,
    pub stream_cookies: Arc<Mutex<String>>,
    pub hls_port: Arc<Mutex<u16>>,
    pub proxy_token: Arc<Mutex<String>>,
    pub resolved: Arc<Mutex<bool>>,
}

impl Default for LiveBridgeState {
    fn default() -> Self {
        Self {
            shutdown_tx: Mutex::new(None),
            stream_url: Arc::new(Mutex::new(String::new())),
            stream_cookies: Arc::new(Mutex::new(String::new())),
            hls_port: Arc::new(Mutex::new(0)),
            proxy_token: Arc::new(Mutex::new(String::new())),
            resolved: Arc::new(Mutex::new(false)),
        }
    }
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct BridgeResolved {
    hls_url: String,
    channel_id: String,
}

const RACER_PATHS: &[&str] = &["/stream/", "/cast/", "/watch/", "/casting/", "/player/", "/plus/"];
const UA: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const REFERER: &str = "https://funsday.cfd/";

/// Sniffer proxy: transparent HTTP CONNECT proxy that inspects URLs for mono.css
async fn run_sniffer_proxy(
    listener: tokio::net::TcpListener,
    resolved: Arc<Mutex<bool>>,
    stream_url: Arc<Mutex<String>>,
    stream_cookies: Arc<Mutex<String>>,
    app: AppHandle,
    hls_port: u16,
    token: String,
    mut shutdown_rx: tokio::sync::oneshot::Receiver<()>,
) {
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .unwrap_or_default();

    loop {
        tokio::select! {
            _ = &mut shutdown_rx => { log::info!("[Sniffer] Shutdown"); break; }
            accepted = listener.accept() => {
                if let Ok((stream, _)) = accepted {
                    let client = client.clone();
                    let resolved = resolved.clone();
                    let stream_url = stream_url.clone();
                    let stream_cookies = stream_cookies.clone();
                    let app = app.clone();
                    let token = token.clone();
                    tokio::spawn(async move {
                        handle_sniffer_request(stream, &client, &resolved, &stream_url, &stream_cookies, &app, hls_port, &token).await;
                    });
                }
            }
        }
    }
}

async fn handle_sniffer_request(
    mut stream: tokio::net::TcpStream,
    client: &reqwest::Client,
    resolved: &Arc<Mutex<bool>>,
    stream_url_state: &Arc<Mutex<String>>,
    stream_cookies_state: &Arc<Mutex<String>>,
    app: &AppHandle,
    hls_port: u16,
    token: &str,
) {
    use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

    let mut reader = BufReader::new(&mut stream);
    let mut request_line = String::new();
    if reader.read_line(&mut request_line).await.is_err() { return; }

    let parts: Vec<&str> = request_line.split_whitespace().collect();
    if parts.len() < 3 { return; }
    let method = parts[0];
    let url_str = parts[1];

    // Read headers
    let mut headers: Vec<(String, String)> = Vec::new();
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line).await.is_err() || line == "\r\n" || line.is_empty() { break; }
        if let Some((k, v)) = line.trim().split_once(':') {
            headers.push((k.trim().to_lowercase(), v.trim().to_string()));
        }
    }

    // CONNECT method (HTTPS tunneling)
    if method == "CONNECT" {
        // For HTTPS, we just tunnel — we can't inspect the content, but we CAN see the hostname
        let _ = stream.write_all(b"HTTP/1.1 200 Connection Established\r\n\r\n").await;
        if let Ok(target) = tokio::net::TcpStream::connect(url_str).await {
            let (mut client_read, mut client_write) = tokio::io::split(stream);
            let (mut server_read, mut server_write) = tokio::io::split(target);
            tokio::select! {
                _ = tokio::io::copy(&mut client_read, &mut server_write) => {}
                _ = tokio::io::copy(&mut server_read, &mut client_write) => {}
            }
        }
        return;
    }

    // HTTP GET/POST — we can inspect the full URL
    // Check if this URL contains mono.css or .m3u8
    if !*resolved.lock().unwrap() && (url_str.contains("mono.css") || (url_str.contains(".m3u8") && !url_str.contains("localhost"))) {
        log::info!("[Sniffer] CAPTURED stream URL: {}", &url_str[..url_str.len().min(120)]);
        *resolved.lock().unwrap() = true;
        *stream_url_state.lock().unwrap() = url_str.to_string();

        // Extract cookies from request headers
        let cookie_val = headers.iter()
            .find(|(k, _)| k == "cookie")
            .map(|(_, v)| v.clone())
            .unwrap_or_default();
        *stream_cookies_state.lock().unwrap() = cookie_val;

        // Emit resolved event to frontend
        let proxy_url = format!("http://127.0.0.1:{}/playlist.m3u8?token={}&t={}", hls_port, token, now_ms());
        let _ = app.emit("live-bridge-resolved", BridgeResolved {
            hls_url: proxy_url,
            channel_id: String::new(),
        });
    }

    // Forward the request to the actual server
    let resp = match client.get(url_str).header("User-Agent", UA).send().await {
        Ok(r) => r,
        Err(_) => {
            let _ = stream.write_all(b"HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n").await;
            return;
        }
    };

    let status = resp.status();
    let ct = resp.headers().get("content-type").and_then(|v| v.to_str().ok()).unwrap_or("application/octet-stream").to_string();
    let bytes = resp.bytes().await.unwrap_or_default();

    let resp_line = format!(
        "HTTP/1.1 {} {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\n\r\n",
        status.as_u16(), status.canonical_reason().unwrap_or("OK"), ct, bytes.len()
    );
    let _ = stream.write_all(resp_line.as_bytes()).await;
    let _ = stream.write_all(&bytes).await;
}

fn now_ms() -> u64 {
    std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64
}

fn extract_stream_id(url: &str) -> String {
    if let Some(caps) = regex::Regex::new(r"stream-(\d+)").ok().and_then(|re| re.captures(url)) {
        return caps[1].to_string();
    }
    if let Some(caps) = regex::Regex::new(r"(\d+)").ok().and_then(|re| re.captures(url)) {
        return caps[1].to_string();
    }
    url.to_string()
}

#[tauri::command]
pub async fn start_live_bridge(app: AppHandle, url: String, channel_id: String) -> Result<String, String> {
    log::info!("[LiveBridge] Starting for channel={} url={}", channel_id, url);
    stop_live_bridge_inner(&app);

    let stream_id = extract_stream_id(&url);
    log::info!("[LiveBridge] Stream ID: {}", stream_id);

    let token: String = {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        (0..16).map(|_| format!("{:02x}", rng.gen::<u8>())).collect()
    };

    // Reset state
    {
        let state = app.state::<LiveBridgeState>();
        *state.stream_url.lock().unwrap() = String::new();
        *state.stream_cookies.lock().unwrap() = String::new();
        *state.proxy_token.lock().unwrap() = token.clone();
        *state.resolved.lock().unwrap() = false;
    }

    // Start HLS proxy (Port 2 — serves rewritten playlists to the frontend player)
    let hls_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.map_err(|e| e.to_string())?;
    let hls_port = hls_listener.local_addr().map_err(|e| e.to_string())?.port();
    log::info!("[LiveBridge] HLS proxy on port {}", hls_port);
    {
        let state = app.state::<LiveBridgeState>();
        *state.hls_port.lock().unwrap() = hls_port;
    }

    // Start sniffer proxy (Port 1 — intercepts racer webview traffic)
    let sniffer_listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.map_err(|e| e.to_string())?;
    let sniffer_port = sniffer_listener.local_addr().map_err(|e| e.to_string())?.port();
    log::info!("[LiveBridge] Sniffer proxy on port {}", sniffer_port);

    let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel::<()>();
    let (_hls_shutdown_tx, hls_shutdown_rx) = tokio::sync::oneshot::channel::<()>();
    {
        let state = app.state::<LiveBridgeState>();
        *state.shutdown_tx.lock().unwrap() = Some(shutdown_tx);
    }

    // Spawn sniffer proxy
    let resolved = app.state::<LiveBridgeState>().resolved.clone();
    let stream_url_arc = app.state::<LiveBridgeState>().stream_url.clone();
    let cookies_arc = app.state::<LiveBridgeState>().stream_cookies.clone();
    let app_sniffer = app.clone();
    let token_sniffer = token.clone();
    tokio::spawn(async move {
        run_sniffer_proxy(sniffer_listener, resolved, stream_url_arc, cookies_arc, app_sniffer, hls_port, token_sniffer, shutdown_rx).await;
    });

    // Spawn HLS proxy
    let app_hls = app.clone();
    let token_hls = token.clone();
    tokio::spawn(async move {
        run_hls_proxy(hls_listener, app_hls, token_hls, hls_shutdown_rx).await;
    });

    // Store hls_shutdown_tx so we can stop it later (piggyback on the main shutdown)
    // We'll just let it live — it'll die when the app exits or next start_live_bridge

    // Spawn racer windows with proxy_url pointing to sniffer
    let is_dev = cfg!(debug_assertions);
    let sniffer_url = format!("http://127.0.0.1:{}", sniffer_port);

    for (i, path) in RACER_PATHS.iter().enumerate() {
        let stream_id = stream_id.clone();
        let racer_url = format!("https://dlstreams.top{}stream-{}.php", path, stream_id);
        let label = format!("racer-{}-{}", i, stream_id);
        let app_clone = app.clone();
        let sniffer_url = sniffer_url.clone();

        let delay = std::time::Duration::from_millis(i as u64 * 250);
        tokio::spawn(async move {
            tokio::time::sleep(delay).await;

            {
                let state = app_clone.state::<LiveBridgeState>();
                if *state.resolved.lock().unwrap() { return; }
            }

            log::info!("[LiveBridge] [Racer {}] {} -> proxy {}", i, racer_url, sniffer_url);

            let win = WebviewWindowBuilder::new(
                &app_clone, &label,
                WebviewUrl::External(racer_url.parse().unwrap()),
            )
            .title(format!("[Racer {}] {} — {}", i, path, stream_id))
            .inner_size(640.0, 360.0)
            .position((i as f64 % 3.0) * 650.0, (i as f64 / 3.0).floor() * 380.0)
            .visible(is_dev)
            .always_on_top(is_dev)
            .skip_taskbar(!is_dev)
            .proxy_url(sniffer_url.parse().unwrap())
            .build();

            match win {
                Ok(w) => {
                    let app_poll = app_clone.clone();
                    let label_poll = label.clone();
                    tokio::spawn(async move {
                        for tick in 0..120 {
                            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                            let done = *app_poll.state::<LiveBridgeState>().resolved.lock().unwrap();
                            if done {
                                let _ = w.eval("document.querySelectorAll('video,audio').forEach(m=>{m.pause();m.removeAttribute('src');m.load()})");
                                if !is_dev { let _ = w.close(); }
                                return;
                            }
                            if tick > 0 && tick % 20 == 0 {
                                log::debug!("[LiveBridge] [{}] Still searching... ({}s)", label_poll, tick / 2);
                            }
                        }
                        log::warn!("[LiveBridge] [{}] Timed out", label_poll);
                        let _ = w.close();
                    });
                }
                Err(e) => log::error!("[LiveBridge] [Racer {}] Window failed: {}", i, e),
            }
        });
    }

    Ok(String::new())
}

/// HLS proxy: serves rewritten playlists and proxied segments to the frontend player
async fn run_hls_proxy(
    listener: tokio::net::TcpListener,
    app: AppHandle,
    token: String,
    mut shutdown_rx: tokio::sync::oneshot::Receiver<()>,
) {
    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .timeout(std::time::Duration::from_secs(15))
        .build().unwrap_or_default();

    loop {
        tokio::select! {
            _ = &mut shutdown_rx => { log::info!("[HLS] Shutdown"); break; }
            accepted = listener.accept() => {
                if let Ok((stream, _)) = accepted {
                    let client = client.clone();
                    let app = app.clone();
                    let token = token.clone();
                    tokio::spawn(async move {
                        handle_hls_request(stream, &client, &app, &token).await;
                    });
                }
            }
        }
    }
}

async fn handle_hls_request(
    mut stream: tokio::net::TcpStream,
    client: &reqwest::Client,
    app: &AppHandle,
    token: &str,
) {
    use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

    let mut reader = BufReader::new(&mut stream);
    let mut request_line = String::new();
    if reader.read_line(&mut request_line).await.is_err() { return; }
    loop { let mut l = String::new(); if reader.read_line(&mut l).await.is_err() || l == "\r\n" || l.is_empty() { break; } }

    let parts: Vec<&str> = request_line.split_whitespace().collect();
    if parts.len() < 2 { return; }
    let method = parts[0];
    let path = parts[1];

    if method == "OPTIONS" {
        let _ = stream.write_all(b"HTTP/1.1 204 No Content\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: GET, OPTIONS\r\nAccess-Control-Allow-Headers: *\r\nContent-Length: 0\r\n\r\n").await;
        return;
    }

    if !path.contains(&format!("token={}", token)) {
        let _ = stream.write_all(b"HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n").await;
        return;
    }

    let state = app.state::<LiveBridgeState>();
    let stream_url = state.stream_url.lock().unwrap().clone();
    let cookies = state.stream_cookies.lock().unwrap().clone();
    let port = *state.hls_port.lock().unwrap();

    if path.starts_with("/playlist.m3u8") {
        if stream_url.is_empty() {
            let _ = stream.write_all(b"HTTP/1.1 503 Service Unavailable\r\nAccess-Control-Allow-Origin: *\r\nRetry-After: 2\r\nContent-Length: 15\r\n\r\nInitializing...").await;
            return;
        }
        serve_hls_playlist(&mut stream, client, &stream_url, &cookies, port, token).await;
    } else if path.starts_with("/proxy") {
        if let Some(url) = extract_query_param(path, "url") {
            proxy_hls_segment(&mut stream, client, &url, &cookies).await;
        }
    }
}

async fn serve_hls_playlist(stream: &mut tokio::net::TcpStream, client: &reqwest::Client, upstream: &str, cookies: &str, port: u16, token: &str) {
    use tokio::io::AsyncWriteExt;
    let resp = match client.get(upstream).header("Referer", REFERER).header("Cookie", cookies).header("User-Agent", UA).send().await {
        Ok(r) => r, Err(e) => { log::error!("[HLS] Playlist fetch failed: {}", e); return; }
    };
    let final_url = resp.url().to_string();
    let body = match resp.text().await { Ok(b) => b, Err(_) => return };

    let origin = extract_origin(&final_url);
    let _base = final_url.rsplit_once('/').map(|(b, _)| b).unwrap_or(&final_url);

    // Rewrite using same regex patterns as Electron
    let mut text = body.clone();
    // Full URLs
    text = regex::Regex::new(r#"(https?://[^\s"',]+)"#).unwrap()
        .replace_all(&text, |caps: &regex::Captures| {
            format!("http://127.0.0.1:{}/proxy?token={}&url={}", port, token, urlenc(&caps[1]))
        }).to_string();
    // URI="/path"
    let origin2 = origin.clone();
    let port2 = port;
    let token2 = token.to_string();
    text = regex::Regex::new(r#"URI="(/[^"]+)""#).unwrap()
        .replace_all(&text, |caps: &regex::Captures| {
            format!(r#"URI="http://127.0.0.1:{}/proxy?token={}&url={}""#, port2, token2, urlenc(&format!("{}{}", origin2, &caps[1])))
        }).to_string();
    // Bare /path lines
    let origin3 = origin.clone();
    let port3 = port;
    let token3 = token.to_string();
    text = regex::Regex::new(r"(?m)^(/[^\s]+)$").unwrap()
        .replace_all(&text, |caps: &regex::Captures| {
            format!("http://127.0.0.1:{}/proxy?token={}&url={}", port3, token3, urlenc(&format!("{}{}", origin3, &caps[1])))
        }).to_string();

    let hdr = format!("HTTP/1.1 200 OK\r\nContent-Type: application/vnd.apple.mpegurl\r\nAccess-Control-Allow-Origin: *\r\nCache-Control: no-cache\r\nContent-Length: {}\r\n\r\n", text.len());
    let _ = stream.write_all(hdr.as_bytes()).await;
    let _ = stream.write_all(text.as_bytes()).await;
}

async fn proxy_hls_segment(stream: &mut tokio::net::TcpStream, client: &reqwest::Client, url: &str, cookies: &str) {
    use tokio::io::AsyncWriteExt;
    let is_key = url.to_lowercase().contains("/key/");
    let resp = match client.get(url).header("Referer", REFERER).header("Cookie", cookies).header("User-Agent", UA).send().await {
        Ok(r) => r, Err(e) => { log::error!("[HLS] Segment failed: {}", e); return; }
    };
    let status = resp.status();
    let ct = if is_key { "application/octet-stream" } else if url.contains(".m3u8") { "application/vnd.apple.mpegurl" } else { "video/MP2T" };
    let bytes = resp.bytes().await.unwrap_or_default();
    let hdr = format!("HTTP/1.1 {} {}\r\nContent-Type: {}\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\n\r\n", status.as_u16(), status.canonical_reason().unwrap_or("OK"), ct, bytes.len());
    let _ = stream.write_all(hdr.as_bytes()).await;
    let _ = stream.write_all(&bytes).await;
}

fn extract_origin(url: &str) -> String {
    url.split("://").nth(1).and_then(|s| s.split('/').next())
        .map(|h| if url.starts_with("https") { format!("https://{}", h) } else { format!("http://{}", h) })
        .unwrap_or_default()
}

fn extract_query_param(path: &str, key: &str) -> Option<String> {
    let query = path.split_once('?')?.1;
    for pair in query.split('&') {
        if let Some((k, v)) = pair.split_once('=') {
            if k == key { return Some(urldec(v)); }
        }
    }
    None
}

fn urlenc(s: &str) -> String {
    let mut o = String::new();
    for b in s.bytes() {
        match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => o.push(b as char),
            _ => o.push_str(&format!("%{:02X}", b)),
        }
    }
    o
}

fn urldec(s: &str) -> String {
    let mut out = Vec::new();
    let b = s.as_bytes();
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Ok(v) = u8::from_str_radix(std::str::from_utf8(&b[i+1..i+3]).unwrap_or("00"), 16) {
                out.push(v); i += 3; continue;
            }
        }
        out.push(b[i]); i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

fn close_racer_windows(app: &AppHandle) {
    for i in 0..RACER_PATHS.len() {
        for sid in 0..1000 {
            let label = format!("racer-{}-{}", i, sid);
            if let Some(win) = app.get_webview_window(&label) { let _ = win.close(); }
        }
    }
}

fn stop_live_bridge_inner(app: &AppHandle) {
    let state = app.state::<LiveBridgeState>();
    if let Some(tx) = state.shutdown_tx.lock().unwrap().take() { let _ = tx.send(()); }
    *state.resolved.lock().unwrap() = false;
    close_racer_windows(app);
}

#[tauri::command]
pub async fn stop_live_bridge(app: AppHandle) -> Result<(), String> {
    log::info!("[LiveBridge] Stopping");
    stop_live_bridge_inner(&app);
    Ok(())
}
