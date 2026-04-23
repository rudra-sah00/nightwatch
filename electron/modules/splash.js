const { BrowserWindow } = require('electron');
const _path = require('node:path');
const _fs = require('node:fs');
const { getAppVersion } = require('./version');

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
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: _path.join(__dirname, '../preload-splash.js'),
    },
  });

  const iconPath = require('node:path')
    .join(__dirname, '../build/icon.png')
    .replace(/\\/g, '/');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
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
              --bg-color: #000000;
              --border-color: #1a1a1a;
              --text-color: #ffffff;
              --progress-bg: #0a0a0a;
              --progress-fill: #ffffff;
            }
            .splash-logo img { filter: brightness(0) invert(1); }
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
            width: 80px; height: 80px; border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            margin-bottom: 16px; background-color: transparent;
          }
          .splash-logo img {
            width: 100%; height: 100%; border-radius: 12px; object-fit: contain;
          }

          /* Brand animation */
          .brand-wrap {
            display: flex; align-items: center; justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            font-size: 24px; font-weight: 900; font-style: italic;
            text-transform: uppercase; letter-spacing: -0.05em;
            margin-bottom: 2px; overflow: hidden;
          }
          .brand-n {
            display: inline-block;
            animation: n-drop 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards,
                       n-bounce 0.5s 0.7s ease forwards;
            transform: translateY(-80px);
            opacity: 0;
          }
          .brand-rest {
            display: inline-block;
            max-width: 0; overflow: hidden; white-space: nowrap; opacity: 0;
            animation: rest-reveal 0.5s 1.4s ease-out forwards;
          }
          @keyframes n-drop {
            0% { transform: translateY(-80px); opacity: 0; }
            20% { opacity: 1; }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes n-bounce {
            0% { transform: translateY(0); }
            30% { transform: translateY(-14px); }
            55% { transform: translateY(0); }
            75% { transform: translateY(-5px); }
            100% { transform: translateY(0); }
          }
          @keyframes rest-reveal {
            0% { max-width: 0; opacity: 0; }
            30% { opacity: 1; }
            100% { max-width: 200px; opacity: 1; }
          }

          .version {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            font-size: 10px; font-weight: 700;
            color: var(--text-color); opacity: 0.6;
            margin-bottom: 24px; letter-spacing: 0.05em;
          }
          .status {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            font-size: 12px; font-weight: 900;
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
          <div class="brand-wrap">
            <span class="brand-n">N</span><span class="brand-rest">IGHTWATCH</span>
          </div>
          <div id="version" class="version">v${getAppVersion()}</div>
          <div id="status" class="status">STARTING...</div>
          <div class="progress-bar-bg">
            <div id="progress" class="progress-bar"></div>
          </div>
        </div>
        <script>
          window.splashAPI.onUpdaterMessage((text) => {
            document.getElementById('status').innerText = text;
          });
          window.splashAPI.onUpdaterVersion((version) => {
            document.getElementById('version').innerText = 'Updating to v' + version;
          });
          window.splashAPI.onUpdaterProgress((percent) => {
            document.getElementById('progress').style.width = percent + '%';
            if(percent === 100) document.getElementById('progress').style.borderRight = 'none';
          });
        </script>
      </body>
    </html>
`;

  const os = require('node:os');
  const splashPath = _path.join(os.tmpdir(), 'nightwatch-splash.html');
  _fs.writeFileSync(splashPath, html, 'utf-8');
  splashWindow.loadFile(splashPath);

  return splashWindow;
}

module.exports = { createSplash, getSplashWindow: () => splashWindow };
