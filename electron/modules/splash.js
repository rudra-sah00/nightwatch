const { BrowserWindow } = require('electron');
const path = require('path');

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
    },
  });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700;900&family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
        <style>
          body { 
            margin: 0; padding: 0; background: transparent; overflow: hidden; 
            display: flex; align-items: center; justify-content: center; height: 100vh; 
          }
          .container { 
            width: 280px; height: 330px; 
            background: #f5f0e8; 
            border-radius: 12px; border: 4px solid #1a1a1a; 
            box-shadow: 6px 6px 0px #1a1a1a; 
            display: flex; flex-direction: column; align-items: center; justify-content: center; 
            padding: 20px; color: #1a1a1a; text-align: center; 
          }
          .splash-logo { 
            width: 80px; height: 80px; 
            background: #ffcc00; border: 4px solid #1a1a1a; 
            border-radius: 12px; box-shadow: 4px 4px 0px #1a1a1a;
            display: flex; align-items: center; justify-content: center; 
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 900; font-style: italic; font-size: 32px; color: #1a1a1a; 
            margin-bottom: 24px; animation: pulse 2s infinite ease-in-out; 
          }
          .title { 
            font-family: 'Space Grotesk', sans-serif;
            font-size: 24px; font-weight: 900; font-style: italic;
            text-transform: uppercase; margin-bottom: 8px; letter-spacing: -0.05em; 
          }
          .status { 
            font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 900; 
            color: #1a1a1a; font-style: italic;
            max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
            text-transform: uppercase; letter-spacing: 0.1em;
          }
          .progress-bar-bg { 
            width: 100%; height: 26px; background: white; 
            border: 3px solid #1a1a1a; border-radius: 4px; box-shadow: 2px 2px 0px #1a1a1a;
            margin-top: 24px; overflow: hidden; display: flex;
          }
          .progress-bar { 
            width: 0%; height: 100%; background: #ffcc00; 
            border-right: 3px solid #1a1a1a; transition: width 0.3s ease; 
          }
          @keyframes pulse { 
            0% { transform: scale(1) translateY(0px); box-shadow: 4px 4px 0px #1a1a1a; } 
            50% { transform: scale(1) translateY(3px); box-shadow: 1px 1px 0px #1a1a1a; } 
            100% { transform: scale(1) translateY(0px); box-shadow: 4px 4px 0px #1a1a1a; } 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="splash-logo">WR</div>
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
