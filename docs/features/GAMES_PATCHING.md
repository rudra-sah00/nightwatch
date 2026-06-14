# Game Adding & Patching Guide

## Overview

Games are HTML5 games sourced from Poki's CDN, patched to remove sitelock/ads, and served from Cloudflare R2 (`games.nightwatch.in`).

## Prerequisites

- `nightwatch-scraper` repo with `pnpm install` done
- Wrangler logged in: `cd nightwatch-backend/workers/cdn-proxy && npx wrangler login`
- Access to dev/prod Neon databases

## Step 1: Capture Game Assets

```bash
cd /Users/rudra/development/nightwatch-scraper
pnpm game https://poki.com/en/g/{slug}
```

This opens a Playwright browser. Click Play, play for 2-3 minutes to load all assets, then **close the browser window**. URLs are saved to `traces/{slug}-urls.txt`.

Output gives you:
- **Game ID**: UUID in the CDN URL
- **Version ID**: second UUID
- **CDN Base**: `https://{GAME_ID}.gdn.poki.com/{VERSION_ID}`

## Step 2: Download All Assets

```bash
BACKUP="/Users/rudra/development/nightwatch-games-backup/{slug}"
CDN="https://{GAME_ID}.gdn.poki.com/{VERSION_ID}"
mkdir -p "$BACKUP"

grep "{GAME_ID}" traces/{slug}-urls.txt | grep -v "^#" | while IFS= read -r url; do
  rel="${url#$CDN/}"
  [ "$rel" = "$url" ] && continue
  mkdir -p "$BACKUP/$(dirname "$rel")"
  curl -sS -f -H "Referer: https://poki.com/" -o "$BACKUP/$rel" "$url" && echo "[OK] $rel" || echo "[FAIL] $rel"
done
```

## Step 3: Get Thumbnail & Preview Video

```bash
# Thumbnail (use the hash from img.poki-cdn.com URLs in the trace file)
curl -sL -o "$BACKUP/thumbnail.png" \
  "https://img.poki-cdn.com/cdn-cgi/image/q=90,width=600,height=600,fit=cover,f=png/{THUMB_HASH}/{slug}-logo.png"

# Convert to PNG if needed (Poki often returns JPEG regardless of f=png)
sips -s format png thumbnail.png --out thumbnail.png

# Preview video: grep the only .mp4 URL from the game page
VIDEO_URL=$(curl -sS "https://poki.com/en/g/{slug}" | grep -oE 'https://v\.poki-cdn\.com/[^"]+\.mp4')
curl -sL -o "$BACKUP/preview.mp4" "$VIDEO_URL"
```

## Step 4: Identify Engine & Patch

### Identify Engine

| Engine | Signs | Files |
|--------|-------|-------|
| **Custom JS** | Single `bundle.js`, inline code | bundle.js, images/, fonts/ |
| **Construct 3** | `c3main.js`, `data.json`, sprite sheets | scripts/c3main.js, scripts/main.js, images/*-lsheet*.webp |
| **Unity WebGL** | `.wasm`, `.data`, `.framework.js`, `.loader.js` | Build/ folder, StreamingAssets/ |
| **Defold** | `dmloader.js`, `.wasm`, `archive/` folder | game0.arcd, game0.arci |

### Check for Sitelock

```bash
grep -rl "bG9jYWxob3N0\|poki\|IS_RELEASE" *.js scripts/*.js 2>/dev/null
```

### Patch index.html

Replace `index.html` with a patched version. **Always** include:

1. Remove `<script src="//game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>`
2. Remove `<script src="scripts/register-sw.js">` (service worker not needed)
3. Add PokiSDK mock BEFORE game scripts:

```html
<script>
window.PokiSDK = {
  init: () => Promise.resolve(),
  gameLoadingStart: () => {},
  gameLoadingFinished: () => {},
  gameLoadingProgress: () => {},
  gameplayStart: () => {},
  gameplayStop: () => {},
  commercialBreak: () => Promise.resolve(),
  rewardedBreak: () => Promise.resolve(true),
  setDebug: () => {},
  happyTime: () => {},
  getURLParam: (k) => new URLSearchParams(window.location.search).get(k) || '',
  shareableURL: () => Promise.resolve(''),
  isAdBlocked: () => true,
  displayAd: () => Promise.resolve(),
  destroyAd: () => {},
  logError: () => {},
  measure: () => {},
  hasConsentManager: () => false,
  getConsentStatus: () => 'accepted',
};
</script>
```

### Engine-Specific Patching

**Construct 3** (e.g., Mophead Dash):
- No sitelock in JS — the Poki plugin (`avix-pokisdk-forc3`) just checks `typeof PokiSDK`
- Only need PokiSDK mock in index.html
- If game calls `PokiSDK.measure()`, ensure mock includes it

**Custom JS** (e.g., Stickman Hook, bundle.js games):
- Find sitelock: `grep 'bG9jYWxob3N0' bundle.js`
- Patch: insert `!1&&` after `IS_RELEASE&&` to short-circuit
- Or insert `return;` at start of the sitelock IIFE

**Games with obfuscated sitelocks** (e.g., Sniper Code):
- These are HARD to patch — multiple layers of obfuscation
- The sitelock whitelists `localhost` so it works locally but not on real domains
- Approaches that DON'T reliably work:
  - `return;` in sitelock function (may have multiple sitelock copies)
  - `atob` override (URL may be built through lookup tables, not raw atob)
  - `Location.prototype.href` override (may use other assignment methods)
- **Recommendation: SKIP games with heavy obfuscated sitelocks** unless you can find and binary-replace the whitelist array

## Step 5: Test Locally

```bash
cd /Users/rudra/development/nightwatch-games-backup/{slug}
npx -y http-server -p 8888 -c-1
# Open http://127.0.0.1:8888
```

⚠️ **IMPORTANT**: Testing on localhost is NOT sufficient for sitelock verification. Poki games whitelist `localhost`. You must also test on a real domain (or use a non-localhost hostname) to confirm sitelock is actually patched.

## Step 6: Upload to R2

```bash
cd /Users/rudra/development/nightwatch-backend/workers/cdn-proxy

# Upload all files with correct content-types (6 parallel)
find /Users/rudra/development/nightwatch-games-backup/{slug} -type f ! -name '._*' ! -name '.DS_Store' | while read f; do
  rel="${f#/Users/rudra/development/nightwatch-games-backup/{slug}/}"
  ext="${rel##*.}"
  case "$ext" in
    js) ct="application/javascript" ;;
    json) ct="application/json" ;;
    html) ct="text/html; charset=UTF-8" ;;
    css) ct="text/css" ;;
    wasm) ct="application/wasm" ;;
    png) ct="image/png" ;;
    webp) ct="image/webp" ;;
    webm) ct="audio/webm" ;;
    mp4) ct="video/mp4" ;;
    ttf) ct="font/ttf" ;;
    woff) ct="font/woff" ;;
    woff2) ct="font/woff2" ;;
    *) ct="application/octet-stream" ;;
  esac
  npx wrangler r2 object put "nightwatch-games/{slug}/$rel" --remote --file="$f" --content-type="$ct" >/dev/null 2>&1 && echo "[OK] $rel" || echo "[FAIL] $rel" &
  count=$((count + 1))
  if [ $((count % 6)) -eq 0 ]; then wait; fi
done
wait
```

**CRITICAL**: Always use `--content-type` flag. Without it, R2 serves files with empty MIME type → browsers reject module scripts.

## Step 7: Insert into Database

```bash
cd /Users/rudra/development/nightwatch-backend && node --input-type=module -e "
import postgres from 'postgres';
import { randomUUID } from 'node:crypto';

// Dev DB
const dev = postgres(process.env.DEV_DATABASE_URL);
await dev\`INSERT INTO games (id, slug, title, description, active, sort_order)
VALUES (\${randomUUID()}, '{slug}', '{Title}', '{description}', true, {N})
ON CONFLICT (slug) DO NOTHING\`;
await dev.end();

// Prod DB
const prod = postgres(process.env.PROD_DATABASE_URL);
await prod\`INSERT INTO games (id, slug, title, description, active, sort_order)
VALUES (\${randomUUID()}, '{slug}', '{Title}', '{description}', true, {N})
ON CONFLICT (slug) DO NOTHING\`;
await prod.end();
"
```

## Step 8: Purge CF Cache (if updating existing game)

Go to Cloudflare Dashboard → nightwatch.in → Caching → Purge specific URLs:
- `https://games.nightwatch.in/{slug}/index.html`
- Any other modified files

## Removing a Game

```bash
# 1. Delete from both DBs
node --input-type=module -e "
import postgres from 'postgres';
const dev = postgres('DEV_URL');
const prod = postgres('PROD_URL');
await dev\`DELETE FROM games WHERE slug = '{slug}'\`;
await prod\`DELETE FROM games WHERE slug = '{slug}'\`;
await dev.end(); await prod.end();
"

# 2. Delete from R2 (each file individually via wrangler)
# 3. Delete local backup: rm -rf nightwatch-games-backup/{slug}
```

## Key Gotchas

1. **MIME types on R2**: Always upload with `--content-type`. CF R2 does NOT auto-detect MIME types. Without it, JS module scripts fail with empty MIME type error.

2. **CF Cache**: After re-uploading files, old versions may be cached at edge (24h TTL). Purge from dashboard.

3. **Sitelock testing**: `localhost` is whitelisted by Poki. Always verify on a real domain.

4. **localStorage**: Games save progress to localStorage. If game starts at wrong level, clear `localStorage` for the game domain.

5. **Construct 3 games**: Easiest to patch — just need PokiSDK mock, no JS file modifications needed.

6. **Heavy obfuscation**: Games like Sniper Code have multiple redundant sitelocks with obfuscated lookup tables. These are not worth patching — skip them.
