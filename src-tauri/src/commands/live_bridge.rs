use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

pub struct LiveBridgeState {
    pub shutdown_tx: Mutex<Option<tokio::sync::oneshot::Sender<()>>>,
    pub stream_url: Arc<Mutex<String>>,
    pub stream_cookies: Arc<Mutex<String>>,
    pub proxy_port: Arc<Mutex<u16>>,
    pub proxy_token: Arc<Mutex<String>>,
    pub resolved: Arc<Mutex<bool>>,
}

impl Default for LiveBridgeState {
    fn default() -> Self {
        Self {
            shutdown_tx: Mutex::new(None),
            stream_url: Arc::new(Mutex::new(String::new())),
            stream_cookies: Arc::new(Mutex::new(String::new())),
            proxy_port: Arc::new(Mutex::new(0)),
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

const RACER_PATHS: &[&str] = &[
    "/stream/",
    "/cast/",
    "/watch/",
    "/casting/",
    "/player/",
    "/plus/",
];

#[tauri::command]
pub async fn start_live_bridge(
    app: AppHandle,
    url: String,
    channel_id: String,
) -> Result<String, String> {
    log::info!("[LiveBridge] Starting for channel={} url={}", channel_id, url);

    // Stop existing bridge
    stop_live_bridge_inner(&app);

    // Extract stream ID from URL
    let stream_id = extract_stream_id(&url);
    log::info!("[LiveBridge] Stream ID: {}", stream_id);

    // Generate new proxy token
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

    // Start proxy server
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| { log::error!("[LiveBridge] Bind failed: {}", e); e.to_string() })?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    log::info!("[LiveBridge] Proxy on port {}", port);

    {
        let state = app.state::<LiveBridgeState>();
        *state.proxy_port.lock().unwrap() = port;
    }

    let (shutdown_tx, mut shutdown_rx) = tokio::sync::oneshot::channel::<()>();
    {
        let state = app.state::<LiveBridgeState>();
        *state.shutdown_tx.lock().unwrap() = Some(shutdown_tx);
    }

    // Spawn proxy server
    let app_proxy = app.clone();
    let token_proxy = token.clone();
    tokio::spawn(async move {
        let client = reqwest::Client::builder()
            .redirect(reqwest::redirect::Policy::limited(10))
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .unwrap_or_default();

        loop {
            tokio::select! {
                _ = &mut shutdown_rx => {
                    log::info!("[LiveBridge] Proxy shutdown");
                    break;
                }
                accepted = listener.accept() => {
                    if let Ok((stream, _)) = accepted {
                        let client = client.clone();
                        let token = token_proxy.clone();
                        let app = app_proxy.clone();
                        tokio::spawn(async move {
                            handle_proxy_connection(stream, &client, &token, &app).await;
                        });
                    }
                }
            }
        }
    });

    // Spawn racer windows
    let is_dev = cfg!(debug_assertions);
    for (i, path) in RACER_PATHS.iter().enumerate() {
        let racer_url = format!("https://dlstreams.top{}stream-{}.php", path, stream_id);
        let label = format!("racer-{}-{}", i, stream_id);
        let app_clone = app.clone();
        let channel_id_clone = channel_id.clone();
        let token_clone = token.clone();

        // Stagger racers by 250ms
        let delay = std::time::Duration::from_millis(i as u64 * 250);
        tokio::spawn(async move {
            tokio::time::sleep(delay).await;

            // Check if already resolved
            {
                let state = app_clone.state::<LiveBridgeState>();
                if *state.resolved.lock().unwrap() {
                    return;
                }
            }

            log::info!("[LiveBridge] [Racer {}] Spawning: {}", i, racer_url);

            let win = WebviewWindowBuilder::new(
                &app_clone,
                &label,
                WebviewUrl::External(racer_url.parse().unwrap()),
            )
            .title(format!("LiveBridge Racer {}", i))
            .inner_size(1280.0, 720.0)
            .visible(is_dev)
            .skip_taskbar(!is_dev)
            .build();

            match win {
                Ok(w) => {
                    // Poll for mono.css by injecting JS that checks for it
                    let app_poll = app_clone.clone();
                    let _channel_id_poll = channel_id_clone.clone();
                    let _token_poll = token_clone.clone();
                    let label_poll = label.clone();

                    tokio::spawn(async move {
                        // Give the page time to load
                        tokio::time::sleep(std::time::Duration::from_secs(2)).await;

                        for attempt in 0..60 {
                            // Check if already resolved by another racer
                            {
                                let state = app_poll.state::<LiveBridgeState>();
                                if *state.resolved.lock().unwrap() {
                                    log::info!("[LiveBridge] [Racer {}] Another racer won, closing", label_poll);
                                    let _ = w.close();
                                    return;
                                }
                            }

                            // Inject JS to find mono.css or any .m3u8 URL in performance entries
                            let js = r#"
                                (function() {
                                    var entries = performance.getEntriesByType('resource');
                                    for (var i = 0; i < entries.length; i++) {
                                        var name = entries[i].name;
                                        if (name.includes('mono.css') || (name.includes('.m3u8') && !name.includes('localhost'))) {
                                            return name;
                                        }
                                    }
                                    // Also check all iframes
                                    var iframes = document.querySelectorAll('iframe');
                                    for (var j = 0; j < iframes.length; j++) {
                                        try {
                                            var iEntries = iframes[j].contentWindow.performance.getEntriesByType('resource');
                                            for (var k = 0; k < iEntries.length; k++) {
                                                var iName = iEntries[k].name;
                                                if (iName.includes('mono.css') || (iName.includes('.m3u8') && !iName.includes('localhost'))) {
                                                    return iName;
                                                }
                                            }
                                        } catch(e) {}
                                    }
                                    return null;
                                })()
                            "#;

                            match w.eval(js) {
                                Ok(_) => {}
                                Err(_) => {
                                    if w.is_closable().unwrap_or(false) {
                                        // Window might be destroyed
                                        return;
                                    }
                                }
                            }

                            // Use a different approach: listen for navigation events
                            // Actually, use webview.url() to check loaded resources
                            // The most reliable way in Tauri: use eval to return the found URL

                            let _check_js = r#"
                                (function() {
                                    var entries = performance.getEntriesByType('resource');
                                    for (var i = entries.length - 1; i >= 0; i--) {
                                        var name = entries[i].name;
                                        if (name.includes('mono.css') || (name.includes('.m3u8') && !name.includes('localhost'))) {
                                            return name;
                                        }
                                    }
                                    return '';
                                })()
                            "#;

                            // We can't get return values from eval in Tauri directly.
                            // Instead, have the JS post a message via __TAURI__.event.emit
                            let emit_js = format!(
                                r#"
                                (function() {{
                                    var entries = performance.getEntriesByType('resource');
                                    for (var i = entries.length - 1; i >= 0; i--) {{
                                        var name = entries[i].name;
                                        if (name.includes('mono.css') || (name.includes('.m3u8') && !name.includes('localhost'))) {{
                                            if (window.__TAURI_INTERNALS__) {{
                                                window.__TAURI_INTERNALS__.invoke('live_bridge_found', {{ url: name, racer: '{}' }});
                                            }}
                                            return;
                                        }}
                                    }}
                                    try {{
                                        var iframes = document.querySelectorAll('iframe');
                                        for (var j = 0; j < iframes.length; j++) {{
                                            var iEntries = iframes[j].contentWindow.performance.getEntriesByType('resource');
                                            for (var k = iEntries.length - 1; k >= 0; k--) {{
                                                var iName = iEntries[k].name;
                                                if (iName.includes('mono.css') || (iName.includes('.m3u8') && !iName.includes('localhost'))) {{
                                                    if (window.__TAURI_INTERNALS__) {{
                                                        window.__TAURI_INTERNALS__.invoke('live_bridge_found', {{ url: iName, racer: '{}' }});
                                                    }}
                                                    return;
                                                }}
                                            }}
                                        }}
                                    }} catch(e) {{}}
                                }})()
                                "#,
                                label_poll, label_poll
                            );

                            let _ = w.eval(&emit_js);

                            tokio::time::sleep(std::time::Duration::from_millis(500)).await;

                            // Check if we got resolved via the command
                            {
                                let state = app_poll.state::<LiveBridgeState>();
                                if *state.resolved.lock().unwrap() {
                                    // Mute and close if not the winner
                                    let _ = w.eval("document.querySelectorAll('video,audio').forEach(m=>{m.pause();m.removeAttribute('src');m.load()})");
                                    if !is_dev {
                                        let _ = w.close();
                                    }
                                    return;
                                }
                            }

                            if attempt > 0 && attempt % 10 == 0 {
                                log::debug!("[LiveBridge] [Racer {}] Still searching... (attempt {})", label_poll, attempt);
                            }
                        }

                        // Timeout - close this racer
                        log::warn!("[LiveBridge] [Racer {}] Timed out", label_poll);
                        let _ = w.close();
                    });
                }
                Err(e) => {
                    log::error!("[LiveBridge] [Racer {}] Failed to create window: {}", i, e);
                }
            }
        });
    }

    // Return empty for now - the actual URL comes via the live-bridge-resolved event
    Ok(String::new())
}

/// Called from JS when a racer finds mono.css or .m3u8
#[tauri::command]
pub async fn live_bridge_found(
    app: AppHandle,
    url: String,
    racer: String,
) -> Result<(), String> {
    let state = app.state::<LiveBridgeState>();

    // Check if already resolved
    {
        let mut resolved = state.resolved.lock().unwrap();
        if *resolved {
            return Ok(());
        }
        *resolved = true;
    }

    log::info!("[LiveBridge] [WINNER] {} found stream: {}", racer, &url[..url.len().min(100)]);

    // Store the stream URL
    *state.stream_url.lock().unwrap() = url;

    let port = *state.proxy_port.lock().unwrap();
    let token = state.proxy_token.lock().unwrap().clone();

    let proxy_url = format!("http://127.0.0.1:{}/playlist.m3u8?token={}&t={}", port, token, chrono_now());

    // Emit to frontend
    app.emit(
        "live-bridge-resolved",
        BridgeResolved {
            hls_url: proxy_url,
            channel_id: String::new(), // Will be matched by the frontend
        },
    )
    .map_err(|e| e.to_string())?;

    // Close non-winner racers and mute the winner
    close_racer_windows(&app, Some(&racer));

    Ok(())
}

fn chrono_now() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

fn close_racer_windows(app: &AppHandle, keep_label: Option<&str>) {
    for (i, _) in RACER_PATHS.iter().enumerate() {
        // Try multiple stream IDs since we don't track which one
        for sid in 0..1000 {
            let label = format!("racer-{}-{}", i, sid);
            if let Some(keep) = keep_label {
                if label == keep {
                    // Mute the winner instead of closing
                    if let Some(win) = app.get_webview_window(&label) {
                        let _ = win.eval("document.querySelectorAll('video,audio').forEach(m=>{m.pause();m.removeAttribute('src');m.load()})");
                        if !cfg!(debug_assertions) {
                            let _ = win.hide();
                        }
                    }
                    continue;
                }
            }
            if let Some(win) = app.get_webview_window(&label) {
                let _ = win.close();
            }
        }
    }
}

fn extract_stream_id(url: &str) -> String {
    // Try to extract from "stream-123.php" pattern
    if let Some(caps) = regex::Regex::new(r"stream-(\d+)")
        .ok()
        .and_then(|re| re.captures(url))
    {
        return caps[1].to_string();
    }
    // Try just digits
    if let Some(caps) = regex::Regex::new(r"(\d+)")
        .ok()
        .and_then(|re| re.captures(url))
    {
        return caps[1].to_string();
    }
    url.to_string()
}

async fn handle_proxy_connection(
    mut stream: tokio::net::TcpStream,
    client: &reqwest::Client,
    token: &str,
    app: &AppHandle,
) {
    use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};

    let mut reader = BufReader::new(&mut stream);
    let mut request_line = String::new();
    if reader.read_line(&mut request_line).await.is_err() {
        return;
    }

    // Read headers
    let mut headers_map: HashMap<String, String> = HashMap::new();
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line).await.is_err() || line == "\r\n" || line.is_empty() {
            break;
        }
        if let Some((k, v)) = line.trim().split_once(':') {
            headers_map.insert(k.trim().to_lowercase(), v.trim().to_string());
        }
    }

    let parts: Vec<&str> = request_line.split_whitespace().collect();
    if parts.len() < 2 {
        return;
    }
    let method = parts[0];
    let path = parts[1];

    // CORS preflight
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
        let resp = "HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n";
        let _ = stream.write_all(resp.as_bytes()).await;
        return;
    }

    let state = app.state::<LiveBridgeState>();
    let stream_url = state.stream_url.lock().unwrap().clone();
    let cookies = state.stream_cookies.lock().unwrap().clone();
    let port = *state.proxy_port.lock().unwrap();

    if path.starts_with("/playlist.m3u8") {
        if stream_url.is_empty() {
            let body = "Initializing...";
            let resp = format!(
                "HTTP/1.1 503 Service Unavailable\r\nAccess-Control-Allow-Origin: *\r\nRetry-After: 2\r\nContent-Length: {}\r\n\r\n{}",
                body.len(), body
            );
            let _ = stream.write_all(resp.as_bytes()).await;
            return;
        }
        serve_playlist(&mut stream, client, &stream_url, &cookies, port, token).await;
    } else if path.starts_with("/proxy") {
        if let Some(url) = extract_query_param(path, "url") {
            proxy_segment(&mut stream, client, &url, &cookies).await;
        }
    } else {
        let resp = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n";
        let _ = stream.write_all(resp.as_bytes()).await;
    }
}

async fn serve_playlist(
    stream: &mut tokio::net::TcpStream,
    client: &reqwest::Client,
    upstream_url: &str,
    cookies: &str,
    port: u16,
    token: &str,
) {
    use tokio::io::AsyncWriteExt;

    let resp = match client
        .get(upstream_url)
        .header("Referer", "https://funsday.cfd/")
        .header("Cookie", cookies)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            log::error!("[LiveBridge] Playlist fetch failed: {}", e);
            let body = format!("Fetch failed: {}", e);
            let resp = format!("HTTP/1.1 502 Bad Gateway\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\n\r\n{}", body.len(), body);
            let _ = stream.write_all(resp.as_bytes()).await;
            return;
        }
    };

    let final_url = resp.url().to_string();
    let body = match resp.text().await {
        Ok(b) => b,
        Err(_) => return,
    };

    let fetch_origin = final_url
        .split("://")
        .nth(1)
        .and_then(|s| s.split('/').next())
        .map(|host| {
            if final_url.starts_with("https") {
                format!("https://{}", host)
            } else {
                format!("http://{}", host)
            }
        })
        .unwrap_or_default();

    let base_url = final_url
        .rsplit_once('/')
        .map(|(b, _)| b)
        .unwrap_or(&final_url);

    // Rewrite URLs to proxy through us
    let mut rewritten = String::new();
    for line in body.lines() {
        if line.starts_with('#') {
            // Rewrite URI="..." in tags
            let rewritten_line = rewrite_uri_in_tag(line, base_url, &fetch_origin, port, token);
            rewritten.push_str(&rewritten_line);
        } else if !line.trim().is_empty() {
            let full = resolve_url(base_url, &fetch_origin, line);
            let encoded = urlencoding_encode(&full);
            rewritten.push_str(&format!(
                "http://127.0.0.1:{}/proxy?token={}&url={}",
                port, token, encoded
            ));
        }
        rewritten.push('\n');
    }

    let headers = format!(
        "HTTP/1.1 200 OK\r\n\
        Content-Type: application/vnd.apple.mpegurl\r\n\
        Access-Control-Allow-Origin: *\r\n\
        Cache-Control: no-cache, no-store\r\n\
        Content-Length: {}\r\n\r\n",
        rewritten.len()
    );
    let _ = stream.write_all(headers.as_bytes()).await;
    let _ = stream.write_all(rewritten.as_bytes()).await;
}

async fn proxy_segment(
    stream: &mut tokio::net::TcpStream,
    client: &reqwest::Client,
    url: &str,
    cookies: &str,
) {
    use tokio::io::AsyncWriteExt;

    let is_key = url.to_lowercase().contains("/key/");
    let is_m3u8 = url.contains(".m3u8");

    let resp = match client
        .get(url)
        .header("Referer", "https://funsday.cfd/")
        .header("Cookie", cookies)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            log::error!("[LiveBridge] Segment fetch failed: {}", e);
            let body = format!("Fetch failed: {}", e);
            let resp = format!("HTTP/1.1 502 Bad Gateway\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\n\r\n{}", body.len(), body);
            let _ = stream.write_all(resp.as_bytes()).await;
            return;
        }
    };

    let status = resp.status();
    let content_type = if is_key {
        "application/octet-stream"
    } else if is_m3u8 {
        "application/vnd.apple.mpegurl"
    } else {
        "video/MP2T"
    };

    let bytes = match resp.bytes().await {
        Ok(b) => b,
        Err(_) => return,
    };

    let headers = format!(
        "HTTP/1.1 {} {}\r\n\
        Content-Type: {}\r\n\
        Access-Control-Allow-Origin: *\r\n\
        Content-Length: {}\r\n\r\n",
        status.as_u16(),
        status.canonical_reason().unwrap_or("OK"),
        content_type,
        bytes.len()
    );
    let _ = stream.write_all(headers.as_bytes()).await;
    let _ = stream.write_all(&bytes).await;
}

fn rewrite_uri_in_tag(line: &str, base_url: &str, origin: &str, port: u16, token: &str) -> String {
    if !line.contains("URI=") {
        return line.to_string();
    }
    let mut result = line.to_string();
    for quote in ['"', '\''] {
        let pattern = format!("URI={}", quote);
        if let Some(start) = result.find(&pattern) {
            let uri_start = start + pattern.len();
            if let Some(end) = result[uri_start..].find(quote) {
                let uri = &result[uri_start..uri_start + end].to_string();
                let full = resolve_url(base_url, origin, uri);
                let encoded = urlencoding_encode(&full);
                let new_uri = format!("http://127.0.0.1:{}/proxy?token={}&url={}", port, token, encoded);
                result = format!(
                    "{}URI={}{}{}{}",
                    &result[..start], quote, new_uri, quote, &result[uri_start + end + 1..]
                );
            }
        }
    }
    result
}

fn resolve_url(base: &str, origin: &str, url: &str) -> String {
    if url.starts_with("http://") || url.starts_with("https://") {
        url.to_string()
    } else if url.starts_with('/') {
        format!("{}{}", origin, url)
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

fn stop_live_bridge_inner(app: &AppHandle) {
    let state = app.state::<LiveBridgeState>();
    if let Some(tx) = state.shutdown_tx.lock().unwrap().take() {
        let _ = tx.send(());
    }
    *state.resolved.lock().unwrap() = false;
    close_racer_windows(app, None);
}

#[tauri::command]
pub async fn stop_live_bridge(app: AppHandle) -> Result<(), String> {
    log::info!("[LiveBridge] Stopping");
    stop_live_bridge_inner(&app);
    Ok(())
}
