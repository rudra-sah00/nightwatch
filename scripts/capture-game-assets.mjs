#!/usr/bin/env node
// CDP Network listener - captures game asset URLs from Chrome remote debugging
// Usage: node scripts/capture-game-assets.mjs <game-id> <output-file>
// Example: node scripts/capture-game-assets.mjs 43a9c68e-4e5a-4916-8fdd-d4a23bc94d04 /tmp/frozen-shadows-urls.txt

import fs from 'node:fs';

const GAME_ID = process.argv[2];
const OUTPUT = process.argv[3] || '/tmp/game-urls.txt';

if (!GAME_ID) {
  console.error('Usage: node capture-game-assets.mjs <game-id> [output-file]');
  process.exit(1);
}

const urls = new Set();

async function main() {
  const res = await fetch('http://localhost:9222/json');
  const tabs = await res.json();
  const wsUrl = tabs[0].webSocketDebuggerUrl;
  console.log(`Connecting to: ${wsUrl}`);

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    ws.send(JSON.stringify({ id: 1, method: 'Network.enable', params: {} }));
    console.log(`Listening for requests containing: ${GAME_ID}`);
    console.log('Play the game, then press Ctrl+C to save URLs.\n');
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Network.requestWillBeSent') {
      const url = msg.params.request.url.split('?')[0];
      if (url.includes(GAME_ID) && !urls.has(url)) {
        urls.add(url);
        console.log(`[${urls.size}] ${url}`);
      }
    }
  };

  ws.onerror = (e) => console.error('WebSocket error:', e.message);
  ws.onclose = () => {
    save();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    save();
    ws.close();
    process.exit(0);
  });
}

function save() {
  fs.writeFileSync(OUTPUT, [...urls].join('\n'));
  console.log(`\nSaved ${urls.size} URLs to ${OUTPUT}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
