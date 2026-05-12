# Game Patching & Deployment Guide

## Quick Reference: Adding a New Game

### Step 1: Capture Game Assets

```bash
# Launch Chrome with remote debugging
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 --user-data-dir=/tmp/game-chrome \
  "https://poki.com/en/g/{slug}"

# Start CDP listener (captures all CDN URLs)
cd /Users/rudra/Development/nightwatch
nohup node --input-type=module -e "
import fs from 'node:fs';
const res = await fetch('http://localhost:9222/json');
const tabs = await res.json();
const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
const urls = new Set();
ws.onopen = () => ws.send(JSON.stringify({id:1, method:'Network.enable', params:{}}));
ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.method === 'Network.requestWillBeSent') {
    const url = msg.params.request.url.split('?')[0];
    if (url.includes('gdn.poki.com')) { urls.add(url); console.log('[' + urls.size + '] ' + url); }
  }
};
process.on('SIGINT', () => { fs.writeFileSync('/tmp/{slug}-urls.txt', [...urls].join('\n')); process.exit(0); });
" > /tmp/capture-{slug}.log 2>&1 &

# Click Play in Chrome, play for 2-3 minutes, then Ctrl+C the listener
```

The first URL reveals: `https://{GAME_ID}.gdn.poki.com/{VERSION_ID}/...`

### Step 2: Download All Assets

```bash
BACKUP="/Users/rudra/Development/nightwatch-games-backup/{slug}"
CDN="https://{GAME_ID}.gdn.poki.com/{VERSION_ID}"
mkdir -p "$BACKUP"

# Download captured URLs
while IFS= read -r url; do
  rel="${url#$CDN/}"
  [[ "$rel" == "$url" ]] && continue
  mkdir -p "$BACKUP/$(dirname "$rel")"
  curl -sS -f -H "Referer: https://poki.com/" -o "$BACKUP/$rel" "$url"
done < /tmp/{slug}-urls.txt

# For JS games: also extract referenced files from bundle.js
grep -oE '(images|fonts|sounds)/[^"'\'']+\.(png|jpg|ttf|ogg|mp3)' "$BACKUP/bundle.js" | sort -u | while read f; do
  [ ! -f "$BACKUP/$f" ] && curl -sS -f -H "Referer: https://poki.com/" -o "$BACKUP/$f" "$CDN/$f" 2>/dev/null
done

# Get thumbnail and preview video
curl -sL -o "$BACKUP/thumbnail.png" "https://img.poki-cdn.com/cdn-cgi/image/q=78,scq=50,width=600,height=600,fit=cover,f=auto/{THUMB_HASH}/{slug}.png"
curl -sL -o "$BACKUP/preview.mp4" "{VIDEO_URL}"
```

### Step 3: Identify Game Engine

| Engine | Signs | Files |
|--------|-------|-------|
| **Custom JS** | Single `bundle.js`, inline code | bundle.js, images/, fonts/ |
| **Unity WebGL** | `.wasm`, `.data`, `.framework.js`, `.loader.js` | Build/ folder, StreamingAssets/ |
| **Unity (Brotli)** | Same as above but `.br` extension | Needs nginx Content-Encoding header |
| **Defold** | `dmloader.js`, `.wasm`, `archive/` folder | game0.arcd, game0.arci, game0.dmanifest, game0.projectc |

### Step 4: Patch the Game

#### A) Create index.html with PokiSDK Mock

Every game needs this mock before any game scripts load:

```html
<script>
window.PokiSDK = {
  init: () => Promise.resolve({ interstitial: false, rewarded: false }),
  gameLoadingStart: () => {}, gameLoadingFinished: () => {}, gameLoadingProgress: () => {},
  gameplayStart: () => {}, gameplayStop: () => {},
  commercialBreak: () => Promise.resolve(),
  rewardedBreak: () => Promise.resolve({ success: false, rewarded: false }),
  setDebug: () => {}, happyTime: () => {},
  getURLParam: (k) => new URLSearchParams(window.location.search).get(k) || "",
  shareableURL: () => Promise.resolve(""),
  isAdBlocked: () => true,
  displayAd: () => Promise.resolve(), destroyAd: () => {},
  logError: () => {}, hasConsentManager: () => false, getConsentStatus: () => 'accepted',
};
// For Unity games - window-level bridge functions
window.initPokiBridge = function() {
  return { commercialBreak: () => Promise.resolve(), rewardedBreak: () => Promise.resolve({ success: false, rewarded: false }), gameplayStart: () => {}, gameplayStop: () => {}, happyTime: () => {}, setDebug: () => {}, logError: () => {}, displayAd: () => Promise.resolve(), destroyAd: () => {} };
};
window.commercialBreak = () => Promise.resolve();
window.rewardedBreak = () => Promise.resolve({ success: false, rewarded: false });
window.gameplayStart = () => {};
window.gameplayStop = () => {};
window.happyTime = () => {};
</script>
```

#### B) Engine-Specific Patching

**Custom JS (Stickman Hook, Dinosaur Game):**
- Remove `<script src="//game-cdn.poki.com/scripts/v2/poki-sdk.js">` tag
- Search `bundle.js` for sitelock: `grep 'bG9jYWxob3N0' bundle.js`
- Patch sitelock: insert `!1&&` after `IS_RELEASE&&` to short-circuit
- Unlock features: find lock check functions and make them return `true`

**Unity WebGL (Stunt Bike, Going Up, Happy Glass):**
- Patch the framework `.js` file directly:
  - Find `_JS_PokiSDK_*` functions and make them no-ops or add callbacks
  - `_JS_PokiSDK_rewardedBreak` → call `SendMessage("PokiSDKManager","RewardedBreakComplete","true")`
  - `_JS_PokiSDK_isAdBlocked` → `return 1`
  - `_JS_PokiSDK_displayAd` → empty function
- For `.br` (Brotli) files: nginx needs `Content-Encoding: br` header (already configured)

**Defold (Level Devil):**
- Patch `{Game}_wasm.js`:
  - `_dmSysOpenURL` → add `if(jsurl.includes("poki")||jsurl.includes("sitelock"))return;`
  - `_dmSysGetApplicationPath` → can spoof return URL if needed
- For sitelocks in archives: binary patch `game*.arcd` files (search with `strings`)
- **WARNING:** Defold games that check `window.location.hostname` in Lua bytecode CANNOT be bypassed (e.g., Monkey Mart)

#### C) Sitelock Bypass Strategies (by difficulty)

1. **Easy** - JS sitelock in bundle.js: Find and patch the check function
2. **Medium** - Unity framework sitelock: Patch `_JS_PokiSDK_initPokiBridge` or framework JS
3. **Hard** - Binary sitelock in game data: Use `strings` to find URLs, binary-patch with same-length replacement
4. **Impossible** - Defold Lua checking `window.location.hostname`: Cannot override browser's location property

### Step 5: Upload to MinIO

```bash
# Local
AWS_ACCESS_KEY_ID=minioadmin AWS_SECRET_ACCESS_KEY=minioadmin \
aws --endpoint-url http://localhost:9000 s3 sync {slug}/ s3://nightwatch-games/{slug}/ --exclude '._*' --quiet

# Prod
tar czf /tmp/{slug}.tar.gz --exclude='._*' {slug}/
scp /tmp/{slug}.tar.gz rudra@rudrasahoo:/tmp/
ssh rudra@rudrasahoo "
  cd /tmp && tar xzf {slug}.tar.gz
  MINIO_ID=\$(docker ps -q -f name=minio)
  docker cp {slug} \$MINIO_ID:/tmp/{slug}
  docker exec \$MINIO_ID mc mirror --overwrite /tmp/{slug}/ local/nightwatch-games/{slug}/
  docker exec \$MINIO_ID rm -rf /tmp/{slug}
  rm -rf /tmp/{slug} /tmp/{slug}.tar.gz
"
```

### Step 6: Add to Database

```bash
cd /Users/rudra/Development/nightwatch-backend
node --input-type=module -e "
import 'dotenv/config';
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';
const local = postgres(process.env.DATABASE_URL);
await local\`INSERT INTO games (id, slug, title, description, sort_order) VALUES (\${randomUUID()}, '{slug}', '{Title}', '{description}', {N}) ON CONFLICT (slug) DO NOTHING\`;
await local.end();
const prod = postgres('postgresql://neondb_owner:npg_n04ZmXzGbCkU@ep-gentle-feather-aoq3aww6-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');
await prod\`INSERT INTO games (id, slug, title, description, sort_order) VALUES (\${randomUUID()}, '{slug}', '{Title}', '{description}', {N}) ON CONFLICT (slug) DO NOTHING\`;
await prod.end();
"
```

### Step 7: Create Backend Route

```bash
mkdir -p src/modules/games/{slug}
sed 's/subway-surfers/{slug}/g; s/SubwaySurfers/{PascalCase}/g' \
  src/modules/games/subway-surfers/controller.ts > src/modules/games/{slug}/controller.ts
sed 's/SubwaySurfers/{PascalCase}/g' \
  src/modules/games/subway-surfers/routes.ts > src/modules/games/{slug}/routes.ts

# Register in games.routes.ts:
# import {name}Routes from './{slug}/routes';
# router.use('/{slug}', {name}Routes);
```

### Step 8: Create Frontend Page

```bash
mkdir -p "/Users/rudra/Development/nightwatch/src/app/(protected)/(main)/games/{slug}"
sed 's/subway-surfers/{slug}/g; s/Subway Surfers/{Title}/g' \
  ".../games/subway-surfers/page.tsx" > ".../games/{slug}/page.tsx"

# Layout for title:
echo 'import type { Metadata } from "next";
export const metadata: Metadata = { title: "{Title}" };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }' > ".../games/{slug}/layout.tsx"
```

### Step 9: Push Everything

```bash
# Backend
cd nightwatch-backend && pnpm run check:fix && git add -A && git commit -m "feat(games): add {slug}" && git push

# Frontend
cd nightwatch && git add -A && git commit -m "feat(games): add {slug} page" && git push

# Backup
cd nightwatch-games-backup && git add -A && git commit -m "feat: add {slug}" && git push
```

---

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| 403 on game assets | Missing `nw_game` cookie | Game page must call `/api/games/{slug}/url` first |
| 403 on thumbnails | nginx blocks all `/nightwatch-games/` | Already fixed: regex allows `thumbnail.png` and `preview.mp4` |
| Black screen on load | Splash overlay stays on top | Add canvas-detect auto-hide script |
| Unity `.br` files fail | Wrong MIME type | nginx adds `Content-Encoding: br` for `.br` files |
| `initPokiBridge is not a function` | Unity Poki plugin | Add `window.initPokiBridge` + window-level functions |
| `happyTime is not a function` | Missing SDK method | Add to PokiSDK mock |
| Game stuck after level | `commercialBreak` not resolving | Mock resolves immediately; for Unity add `SendMessage` callback |
| Sitelock redirect | Domain check in game code | Patch bundle.js or binary-patch game archives |
| Ad button shows popup | `rewardedBreak` has no callback | Patch framework JS to call Unity `SendMessage` immediately |

## File Locations

- **Game backups:** `/Users/rudra/Development/nightwatch-games-backup/`
- **GitHub backup:** `github.com/rudra-sah00/nightwatch-games-backup` (private)
- **CDP capture script:** `/Users/rudra/Development/nightwatch/scripts/capture-game-assets.mjs`
- **Backend routes:** `nightwatch-backend/src/modules/games/`
- **Frontend pages:** `nightwatch/src/app/(protected)/(main)/games/`
- **Prod MinIO:** `ssh rudra@rudrasahoo` → `docker exec $(docker ps -q -f name=minio) mc ...`
- **Prod nginx:** `/opt/nginx/conf.d/s3.nightwatch.in.conf`
- **Admin panel:** `rudrasahoo:7799/pages/games/`
