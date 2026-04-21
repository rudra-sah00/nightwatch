use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

pub struct LiveBridgeState {
    pub shutdown_tx: Mutex<Option<tokio::sync::oneshot::Sender<()>>>,
}

impl Default for LiveBridgeState {
    fn default() -> Self {
        Self {
            shutdown_tx: Mutex::new(None),
        }
    }
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct BridgeResolved {
    hls_url: String,
    channel_id: String,
}

#[tauri::command]
pub async fn start_live_bridge(
    app: AppHandle,
    url: String,
    channel_id: String,
) -> Result<String, String> {
    log::info!("[LiveBridge] Starting bridge for channel={} url={}", channel_id, url);

    // Stop existing bridge
    {
        let state = app.state::<LiveBridgeState>();
        let mut guard = state.shutdown_tx.lock().unwrap();
        if let Some(tx) = guard.take() {
            let _ = tx.send(());
            log::info!("[LiveBridge] Stopped previous bridge");
        }
    }

    let token: String = {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        (0..16).map(|_| format!("{:02x}", rng.gen::<u8>())).collect()
    };

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| { log::error!("[LiveBridge] Bind failed: {}", e); e.to_string() })?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let proxy_base = format!("http://127.0.0.1:{}", port);
    log::info!("[LiveBridge] Listening on port {}", port);

    let (shutdown_tx, mut shutdown_rx) = tokio::sync::oneshot::channel::<()>();
    {
        let state = app.state::<LiveBridgeState>();
        *state.shutdown_tx.lock().unwrap() = Some(shutdown_tx);
    }

    let upstream_url = url.clone();
    let token2 = token.clone();
    let proxy_base2 = proxy_base.clone();

    tokio::spawn(async move {
        let client = reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::limited(10))
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .unwrap_or_default();

        loop {
            tokio::select! {
                _ = &mut shutdown_rx => {
                    log::info!("[LiveBridge] Shutdown signal received");
                    break;
                }
                accepted = listener.accept() => {
                    if let Ok((stream, addr)) = accepted {
                        log::debug!("[LiveBridge] Connection from {}", addr);
                        let client = client.clone();
                        let upstream = upstream_url.clone();
                        let token = token2.clone();
                        let base = proxy_base2.clone();
                        tokio::spawn(async move {
                            handle_connection(stream, &client, &upstream, &token, &base).await;
                        });
                    }
                }
            }
        }
    });

    let resolved_url = format!("{}/playlist.m3u8?token={}", proxy_base, token);
    log::info!("[LiveBridge] Resolved URL: {}", resolved_url);

    app.emit(
        "live-bridge-resolved",
        BridgeResolved {
            hls_url: resolved_url.clone(),
            channel_id,
        },
    )
    .map_err(|e| e.to_string())?;

    Ok(resolved_url)
}

async fn handle_connection(
    mut stream: tokio::net::TcpStream,
    client: &reqwest::Client,
    upstream_url: &str,
    token: &str,
    proxy_base: &str,
) {
    use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

    let mut reader = BufReader::new(&mut stream);
    let mut request_line = String::new();
    if reader.read_line(&mut request_line).await.is_err() {
        return;
    }

    // Read remaining headers (consume them)
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line).await.is_err() || line == "\r\n" || line.is_empty() {
            break;
        }
    }

    let parts: Vec<&str> = request_line.split_whitespace().collect();
    if parts.len() < 2 {
        return;
    }
    let method = parts[0];
    let path = parts[1];

    log::debug!("[LiveBridge] {} {}", method, path);

    // Handle CORS preflight
    if method == "OPTIONS" {
        let resp = "HTTP/1.1 204 No Content\r\n\
            Access-Control-Allow-Origin: *\r\n\
            Access-Control-Allow-Methods: GET, OPTIONS\r\n\
            Access-Control-Allow-Headers: *\r\n\
            Access-Control-Max-Age: 86400\r\n\
            Content-Length: 0\r\n\r\n";
        let _ = stream.write_all(resp.as_bytes()).await;
        return;
    }

    // Validate token
    if !path.contains(&format!("token={}", token)) {
        log::warn!("[LiveBridge] Invalid token in request: {}", path);
        let resp = "HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n";
        let _ = stream.write_all(resp.as_bytes()).await;
        return;
    }

    if path.starts_with("/playlist.m3u8") {
        serve_playlist(&mut stream, client, upstream_url, proxy_base, token).await;
    } else if path.starts_with("/media/") {
        // Sub-playlist request: /media/?url=<encoded_media_playlist_url>&token=<token>
        if let Some(url) = extract_query_param(path, "url") {
            serve_media_playlist(&mut stream, client, &url, proxy_base, token).await;
        }
    } else if path.starts_with("/proxy") {
        if let Some(url) = extract_query_param(path, "url") {
            proxy_segment(&mut stream, client, &url).await;
        }
    } else {
        log::warn!("[LiveBridge] Unknown path: {}", path);
        let resp = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n";
        let _ = stream.write_all(resp.as_bytes()).await;
    }
}

/// Fetch the upstream playlist. If it's a master playlist (contains #EXT-X-STREAM-INF),
/// rewrite variant URLs to go through /media/. If it's a media playlist, rewrite
/// segment URLs to go through /proxy.
async fn serve_playlist(
    stream: &mut tokio::net::TcpStream,
    client: &reqwest::Client,
    upstream_url: &str,
    proxy_base: &str,
    token: &str,
) {
    use tokio::io::AsyncWriteExt;

    let resp = match client
        .get(upstream_url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            log::error!("[LiveBridge] Failed to fetch master playlist: {}", e);
            let body = format!("Failed to fetch playlist: {}", e);
            let resp = format!(
                "HTTP/1.1 502 Bad Gateway\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\n\r\n{}",
                body.len(), body
            );
            let _ = stream.write_all(resp.as_bytes()).await;
            return;
        }
    };

    let status = resp.status();
    if !status.is_success() {
        log::error!("[LiveBridge] Upstream returned {}", status);
        let body = format!("Upstream returned {}", status);
        let resp = format!(
            "HTTP/1.1 {}\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\n\r\n{}",
            status.as_u16(), body.len(), body
        );
        let _ = stream.write_all(resp.as_bytes()).await;
        return;
    }

    let body = match resp.text().await {
        Ok(b) => b,
        Err(e) => {
            log::error!("[LiveBridge] Failed to read playlist body: {}", e);
            return;
        }
    };

    let base_url = upstream_url
        .rsplit_once('/')
        .map(|(b, _)| b)
        .unwrap_or(upstream_url);

    let is_master = body.contains("#EXT-X-STREAM-INF");
    log::info!(
        "[LiveBridge] Playlist type: {} ({} lines)",
        if is_master { "MASTER" } else { "MEDIA" },
        body.lines().count()
    );

    let rewritten = if is_master {
        rewrite_master_playlist(&body, base_url, proxy_base, token)
    } else {
        rewrite_media_playlist(&body, base_url, proxy_base, token)
    };

    let headers = format!(
        "HTTP/1.1 200 OK\r\n\
        Content-Type: application/vnd.apple.mpegurl\r\n\
        Access-Control-Allow-Origin: *\r\n\
        Access-Control-Expose-Headers: *\r\n\
        Cache-Control: no-cache, no-store\r\n\
        Content-Length: {}\r\n\r\n",
        rewritten.len()
    );
    let _ = stream.write_all(headers.as_bytes()).await;
    let _ = stream.write_all(rewritten.as_bytes()).await;
}

/// Serve a media (sub) playlist — fetched from a variant URL in the master playlist.
async fn serve_media_playlist(
    stream: &mut tokio::net::TcpStream,
    client: &reqwest::Client,
    media_url: &str,
    proxy_base: &str,
    token: &str,
) {
    use tokio::io::AsyncWriteExt;

    let resp = match client
        .get(media_url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            log::error!("[LiveBridge] Failed to fetch media playlist: {}", e);
            let body = format!("Failed to fetch media playlist: {}", e);
            let resp = format!(
                "HTTP/1.1 502 Bad Gateway\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\n\r\n{}",
                body.len(), body
            );
            let _ = stream.write_all(resp.as_bytes()).await;
            return;
        }
    };

    let body = match resp.text().await {
        Ok(b) => b,
        Err(_) => return,
    };

    let base_url = media_url
        .rsplit_once('/')
        .map(|(b, _)| b)
        .unwrap_or(media_url);

    let rewritten = rewrite_media_playlist(&body, base_url, proxy_base, token);

    let headers = format!(
        "HTTP/1.1 200 OK\r\n\
        Content-Type: application/vnd.apple.mpegurl\r\n\
        Access-Control-Allow-Origin: *\r\n\
        Access-Control-Expose-Headers: *\r\n\
        Cache-Control: no-cache, no-store\r\n\
        Content-Length: {}\r\n\r\n",
        rewritten.len()
    );
    let _ = stream.write_all(headers.as_bytes()).await;
    let _ = stream.write_all(rewritten.as_bytes()).await;
}

/// Rewrite a master playlist: variant stream URLs → /media/?url=<encoded>&token=<token>
fn rewrite_master_playlist(body: &str, base_url: &str, proxy_base: &str, token: &str) -> String {
    let mut out = String::new();
    for line in body.lines() {
        if line.starts_with('#') {
            // Rewrite URI= attributes in tags like #EXT-X-MEDIA
            out.push_str(&rewrite_uri_in_tag(line, base_url, proxy_base, token, true));
        } else if !line.trim().is_empty() {
            // This is a variant playlist URL — route through /media/
            let full = resolve_url(base_url, line);
            let encoded = urlencoding_encode(&full);
            out.push_str(&format!("{}/media/?url={}&token={}", proxy_base, encoded, token));
        }
        out.push('\n');
    }
    out
}

/// Rewrite a media playlist: segment URLs → /proxy?url=<encoded>&token=<token>
fn rewrite_media_playlist(body: &str, base_url: &str, proxy_base: &str, token: &str) -> String {
    let mut out = String::new();
    for line in body.lines() {
        if line.starts_with('#') {
            // Rewrite URI= attributes in tags like #EXT-X-MAP, #EXT-X-KEY
            out.push_str(&rewrite_uri_in_tag(line, base_url, proxy_base, token, false));
        } else if !line.trim().is_empty() {
            // Segment URL
            let full = resolve_url(base_url, line);
            let encoded = urlencoding_encode(&full);
            out.push_str(&format!("{}/proxy?url={}&token={}", proxy_base, encoded, token));
        }
        out.push('\n');
    }
    out
}

/// Rewrite URI="..." attributes inside HLS tags (e.g. #EXT-X-MAP:URI="init.mp4", #EXT-X-KEY:URI="key.bin")
/// If `is_master` is true, URIs route through /media/; otherwise through /proxy.
fn rewrite_uri_in_tag(line: &str, base_url: &str, proxy_base: &str, token: &str, is_master: bool) -> String {
    if !line.contains("URI=") {
        return line.to_string();
    }

    let mut result = line.to_string();
    // Find URI="..." or URI='...'
    for quote in ['"', '\''] {
        let pattern = format!("URI={}", quote);
        if let Some(start) = result.find(&pattern) {
            let uri_start = start + pattern.len();
            if let Some(end) = result[uri_start..].find(quote) {
                let uri = &result[uri_start..uri_start + end];
                let full = resolve_url(base_url, uri);
                let encoded = urlencoding_encode(&full);
                let route = if is_master { "media/" } else { "proxy" };
                let new_uri = format!("{}/{}?url={}&token={}", proxy_base, route, encoded, token);
                result = format!(
                    "{}URI={}{}{}{}",
                    &result[..start],
                    quote,
                    new_uri,
                    quote,
                    &result[uri_start + end + 1..]
                );
            }
        }
    }
    result
}

async fn proxy_segment(
    stream: &mut tokio::net::TcpStream,
    client: &reqwest::Client,
    url: &str,
) {
    use tokio::io::AsyncWriteExt;

    log::debug!("[LiveBridge] Proxying segment: {}", &url[..url.len().min(120)]);

    let resp = match client
        .get(url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            log::error!("[LiveBridge] Segment fetch failed: {}", e);
            let body = format!("Segment fetch failed: {}", e);
            let resp = format!(
                "HTTP/1.1 502 Bad Gateway\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\n\r\n{}",
                body.len(), body
            );
            let _ = stream.write_all(resp.as_bytes()).await;
            return;
        }
    };

    let status = resp.status();
    let content_type = resp
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();

    let bytes = match resp.bytes().await {
        Ok(b) => b,
        Err(e) => {
            log::error!("[LiveBridge] Failed to read segment bytes: {}", e);
            return;
        }
    };

    let headers = format!(
        "HTTP/1.1 {} {}\r\n\
        Content-Type: {}\r\n\
        Access-Control-Allow-Origin: *\r\n\
        Access-Control-Expose-Headers: *\r\n\
        Content-Length: {}\r\n\r\n",
        status.as_u16(),
        status.canonical_reason().unwrap_or("OK"),
        content_type,
        bytes.len()
    );
    let _ = stream.write_all(headers.as_bytes()).await;
    let _ = stream.write_all(&bytes).await;
}

/// Resolve a potentially relative URL against a base URL.
fn resolve_url(base: &str, url: &str) -> String {
    if url.starts_with("http://") || url.starts_with("https://") {
        url.to_string()
    } else if url.starts_with('/') {
        // Absolute path — extract origin from base
        if let Some(idx) = base.find("://") {
            if let Some(slash) = base[idx + 3..].find('/') {
                return format!("{}{}", &base[..idx + 3 + slash], url);
            }
        }
        format!("{}{}", base, url)
    } else {
        format!("{}/{}", base, url)
    }
}

fn extract_query_param(path: &str, key: &str) -> Option<String> {
    let query = path.split_once('?')?.1;
    for pair in query.split('&') {
        if let Some((k, v)) = pair.split_once('=') {
            if k == key {
                return Some(urlencoding_decode(v));
            }
        }
    }
    None
}

fn urlencoding_encode(s: &str) -> String {
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

fn urlencoding_decode(s: &str) -> String {
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

#[tauri::command]
pub async fn stop_live_bridge(app: AppHandle) -> Result<(), String> {
    let state = app.state::<LiveBridgeState>();
    if let Some(tx) = state.shutdown_tx.lock().unwrap().take() {
        let _ = tx.send(());
        log::info!("[LiveBridge] Bridge stopped");
    }
    Ok(())
}
