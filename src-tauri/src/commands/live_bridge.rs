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
    // Stop existing bridge
    {
        let state = app.state::<LiveBridgeState>();
        let mut guard = state.shutdown_tx.lock().unwrap();
        if let Some(tx) = guard.take() {
            let _ = tx.send(());
        }
    }

    let token: String = {
        use rand::Rng;
        let mut rng = rand::thread_rng();
        (0..16).map(|_| format!("{:02x}", rng.gen::<u8>())).collect()
    };

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let proxy_base = format!("http://127.0.0.1:{}", port);

    let (shutdown_tx, mut shutdown_rx) = tokio::sync::oneshot::channel::<()>();
    {
        let state = app.state::<LiveBridgeState>();
        *state.shutdown_tx.lock().unwrap() = Some(shutdown_tx);
    }

    let upstream_url = url.clone();
    let token2 = token.clone();
    let proxy_base2 = proxy_base.clone();

    tokio::spawn(async move {
        let client = reqwest::Client::new();
        loop {
            tokio::select! {
                _ = &mut shutdown_rx => break,
                accepted = listener.accept() => {
                    if let Ok((stream, _)) = accepted {
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

    // Read remaining headers
    let mut headers_raw = String::new();
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line).await.is_err() || line == "\r\n" || line.is_empty() {
            break;
        }
        headers_raw.push_str(&line);
    }

    let parts: Vec<&str> = request_line.split_whitespace().collect();
    if parts.len() < 2 {
        return;
    }
    let path = parts[1];

    // Validate token
    if !path.contains(&format!("token={}", token)) {
        let resp = "HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n";
        let _ = stream.write_all(resp.as_bytes()).await;
        return;
    }

    if path.starts_with("/playlist.m3u8") {
        serve_playlist(&mut stream, client, upstream_url, proxy_base, token).await;
    } else if path.starts_with("/proxy") {
        if let Some(url) = extract_query_param(path, "url") {
            proxy_segment(&mut stream, client, &url).await;
        }
    }
}

async fn serve_playlist(
    stream: &mut tokio::net::TcpStream,
    client: &reqwest::Client,
    upstream_url: &str,
    proxy_base: &str,
    token: &str,
) {
    use tokio::io::AsyncWriteExt;

    let resp = match client.get(upstream_url).send().await {
        Ok(r) => r,
        Err(_) => return,
    };
    let body = match resp.text().await {
        Ok(b) => b,
        Err(_) => return,
    };

    let base_url = upstream_url
        .rsplit_once('/')
        .map(|(b, _)| b)
        .unwrap_or(upstream_url);

    // Rewrite segment URLs to proxy through us
    let mut rewritten = String::new();
    for line in body.lines() {
        if line.starts_with('#') {
            rewritten.push_str(line);
        } else if !line.trim().is_empty() {
            let full_url = if line.starts_with("http") {
                line.to_string()
            } else {
                format!("{}/{}", base_url, line)
            };
            let encoded = urlencoding_encode(&full_url);
            rewritten.push_str(&format!(
                "{}/proxy?url={}&token={}",
                proxy_base, encoded, token
            ));
        }
        rewritten.push('\n');
    }

    let headers = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: application/x-mpegURL\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\n\r\n",
        rewritten.len()
    );
    let _ = stream.write_all(headers.as_bytes()).await;
    let _ = stream.write_all(rewritten.as_bytes()).await;
}

async fn proxy_segment(
    stream: &mut tokio::net::TcpStream,
    client: &reqwest::Client,
    url: &str,
) {
    use tokio::io::AsyncWriteExt;

    let resp = match client
        .get(url)
        .header("User-Agent", "Mozilla/5.0")
        .send()
        .await
    {
        Ok(r) => r,
        Err(_) => return,
    };

    let content_type = resp
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();

    let bytes = match resp.bytes().await {
        Ok(b) => b,
        Err(_) => return,
    };

    let headers = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: {}\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\n\r\n",
        content_type,
        bytes.len()
    );
    let _ = stream.write_all(headers.as_bytes()).await;
    let _ = stream.write_all(&bytes).await;
}

fn extract_query_param<'a>(path: &'a str, key: &str) -> Option<String> {
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
    }
    Ok(())
}
