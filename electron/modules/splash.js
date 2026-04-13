const { BrowserWindow } = require('electron');
const _path = require('node:path');

let splashWindow;

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 300,
    height: 350,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false, // allow local files to load in data URI
    },
  });

  const iconPath = require('node:path')
    .join(__dirname, '../build/icon.png')
    .replace(/\\/g, '/');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;900&family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
          :root {
            --bg-color: #f5f0e8;
            --border-color: #1a1a1a;
            --text-color: #1a1a1a;
            --progress-bg: white;
            --progress-fill: #ffcc00;
          }
          @media (prefers-color-scheme: dark) {
            :root {
              --bg-color: #09090b;
              --border-color: #27272a; /* Replaced the white border with a dark subtle border */
              --text-color: #f4f4f5;
              --progress-bg: #18181b;
              --progress-fill: #a855f7;
            }
            .splash-logo img {
              filter: brightness(0) invert(1); /* Turns the black play icon to pure white in dark mode */
            }
          }
          body { 
            margin: 0; padding: 0; background: transparent; overflow: hidden; 
            display: flex; align-items: center; justify-content: center; height: 100vh; 
          }
          .container { 
            width: 280px; height: 330px; 
            background: var(--bg-color); 
            border-radius: 12px; border: 4px solid var(--border-color); 
            display: flex; flex-direction: column; align-items: center; justify-content: center; 
            padding: 20px; color: var(--text-color); text-align: center; 
          }
          .splash-logo { 
            width: 80px; height: 80px; 
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center; 
            margin-bottom: 24px;
            background-color: transparent;
          }
          .splash-logo img {
            width: 100%; height: 100%; border-radius: 12px; object-fit: contain;
          }
          .title { 
            font-family: 'Space Grotesk', sans-serif;
            font-size: 24px; font-weight: 900; font-style: italic;
            text-transform: uppercase; margin-bottom: 8px; letter-spacing: -0.05em; 
          }
          .status { 
            font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 900; 
            color: var(--text-color); font-style: italic;
            max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
            text-transform: uppercase; letter-spacing: 0.1em;
          }
          .progress-bar-bg { 
            width: 100%; height: 26px; background: var(--progress-bg); 
            border: 3px solid var(--border-color); border-radius: 4px;
            margin-top: 24px; overflow: hidden; display: flex;
          }
          .progress-bar { 
            width: 0%; height: 100%; background: var(--progress-fill); 
            border-right: 3px solid var(--border-color); transition: width 0.3s ease; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="splash-logo"><img src="file://${iconPath}" alt="Logo" /></div>
          <div class="title">Watch Rudra</div>
          <div id="status" class="status">STARTING...</div>
          <div class="progress-bar-bg">
            <div id="progress" class="progress-bar"></div>
          </div>
        </div>
        <script>
          const { ipcRenderer } = require('electron');
          ipcRenderer.on('updater-message', (event, text) => {
            document.getElementById('status').innerText = text;
          });
          ipcRenderer.on('updater-progress', (event, percent) => {
            document.getElementById('progress').style.width = percent + '%';
            if(percent === 100) document.getElementById('progress').style.borderRight = 'none';
          });
        </script>
      </body>
    </html>
`;

  splashWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
  );

  return splashWindow;
}

module.exports = { createSplash, getSplashWindow: () => splashWindow };
