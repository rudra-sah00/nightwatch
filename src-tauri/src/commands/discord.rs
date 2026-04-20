use serde_json::{json, Value};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

const CLIENT_ID: &str = "1234567890123456789";

pub struct DiscordState {
    pub conn: Mutex<Option<DiscordIpc>>,
}

impl Default for DiscordState {
    fn default() -> Self {
        Self {
            conn: Mutex::new(None),
        }
    }
}

pub struct DiscordIpc {
    #[cfg(unix)]
    pub stream: std::os::unix::net::UnixStream,
    #[cfg(windows)]
    pub stream: std::fs::File,
    pub pid: u32,
}

impl DiscordIpc {
    pub fn connect() -> Result<Self, String> {
        let pid = std::process::id();

        #[cfg(unix)]
        {
            use std::os::unix::net::UnixStream;
            let tmpdir = std::env::var("XDG_RUNTIME_DIR")
                .or_else(|_| std::env::var("TMPDIR"))
                .unwrap_or_else(|_| "/tmp".into());
            for i in 0..10 {
                let path = format!("{}/discord-ipc-{}", tmpdir, i);
                if let Ok(stream) = UnixStream::connect(&path) {
                    return Ok(Self { stream, pid });
                }
            }
            Err("Could not connect to Discord IPC".into())
        }

        #[cfg(windows)]
        {
            use std::fs::OpenOptions;
            for i in 0..10 {
                let path = format!(r"\\.\pipe\discord-ipc-{}", i);
                if let Ok(stream) = OpenOptions::new().read(true).write(true).open(&path) {
                    return Ok(Self { stream, pid });
                }
            }
            Err("Could not connect to Discord IPC".into())
        }
    }

    fn write_frame(&mut self, opcode: u32, payload: &[u8]) -> Result<(), String> {
        use std::io::Write;
        let len = payload.len() as u32;
        let mut buf = Vec::with_capacity(8 + payload.len());
        buf.extend_from_slice(&opcode.to_le_bytes());
        buf.extend_from_slice(&len.to_le_bytes());
        buf.extend_from_slice(payload);
        self.stream.write_all(&buf).map_err(|e| e.to_string())
    }

    fn read_frame(&mut self) -> Result<Value, String> {
        use std::io::Read;
        let mut header = [0u8; 8];
        self.stream
            .read_exact(&mut header)
            .map_err(|e| e.to_string())?;
        let len = u32::from_le_bytes([header[4], header[5], header[6], header[7]]) as usize;
        let mut body = vec![0u8; len];
        self.stream
            .read_exact(&mut body)
            .map_err(|e| e.to_string())?;
        serde_json::from_slice(&body).map_err(|e| e.to_string())
    }

    pub fn handshake(&mut self) -> Result<(), String> {
        let payload = json!({"v": 1, "client_id": CLIENT_ID});
        self.write_frame(0, payload.to_string().as_bytes())?;
        let _resp = self.read_frame()?;
        Ok(())
    }

    fn set_activity(
        &mut self,
        details: &str,
        state: &str,
        large_image_key: &str,
    ) -> Result<(), String> {
        let nonce = uuid::Uuid::new_v4().to_string();
        let payload = json!({
            "cmd": "SET_ACTIVITY",
            "args": {
                "pid": self.pid,
                "activity": {
                    "details": details,
                    "state": state,
                    "assets": {
                        "large_image": large_image_key,
                        "large_text": "Watch Rudra"
                    }
                }
            },
            "nonce": nonce
        });
        self.write_frame(1, payload.to_string().as_bytes())?;
        let _resp = self.read_frame()?;
        Ok(())
    }

    pub fn close(&mut self) -> Result<(), String> {
        self.write_frame(2, b"{}").ok();
        Ok(())
    }
}

#[tauri::command]
pub async fn init_discord(app: AppHandle) -> Result<(), String> {
    let state = app.state::<DiscordState>();
    let mut conn = state.conn.lock().unwrap();
    if conn.is_some() {
        return Ok(());
    }
    let mut ipc = DiscordIpc::connect()?;
    ipc.handshake()?;
    *conn = Some(ipc);
    Ok(())
}

#[tauri::command]
pub async fn set_discord_activity(
    app: AppHandle,
    details: String,
    state: String,
    large_image_key: String,
) -> Result<(), String> {
    let ds = app.state::<DiscordState>();
    let mut conn = ds.conn.lock().unwrap();
    let ipc = conn.as_mut().ok_or("Discord not connected")?;
    ipc.set_activity(&details, &state, &large_image_key)
}

#[tauri::command]
pub async fn destroy_discord(app: AppHandle) -> Result<(), String> {
    let state = app.state::<DiscordState>();
    let mut conn = state.conn.lock().unwrap();
    if let Some(mut ipc) = conn.take() {
        ipc.close()?;
    }
    Ok(())
}
