# Games Deployment Guide

Building and shipping game assets to Cloudflare R2, adding database entries, and managing the CDN cache.

**Source:** `src/features/games/`, `src/components/game-frame.tsx`

---

## Architecture

- Game assets stored in Cloudflare R2 bucket `nightwatch-games`
- Served via the R2 custom domain `games.nightwatch.in`
- Frontend loads game in an iframe with `allow="autoplay; fullscreen; gamepad"` (no `sandbox` attribute — games need full DOM access for canvas/WebGL)
- Backend returns the game URL via `GET /api/games/:slug/url` and sets an `nw_game` auth cookie
- The `GameFrame` component (`src/components/game-frame.tsx`) refreshes the cookie every 45 minutes to prevent 403s during long sessions

## Adding a New Game

### 1. Prepare Game Files

Strip all third-party SDK sitelocks before uploading. See [./PATCHING.md](./PATCHING.md) for the full patching guide.

```bash
# Search for sitelock/DRM code
grep -r "poki\|crazygames\|sitelock\|frame-ancestors" game-folder/
```

### 2. Create Patched `index.html`

Every game needs a custom `index.html` with the PokiSDK mock. The mock's `init()` must return `Promise.resolve()` (not `reject`) — many games gate their loading sequence on a successful init:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <script>
        // Mock the game platform SDK (Poki, CrazyGames, etc.)
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

        // Disable service worker
        window.NOSW = true;
    </script>
    <!-- Game scripts -->
</head>
</html>
```

### 3. Upload to R2

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

**CRITICAL**: Always use `--content-type` flag. R2 does NOT auto-detect MIME types. Without it, browsers reject module scripts due to empty MIME type.

### 4. Insert into Database

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

### 5. Add Backend Route

In `nightwatch-backend/src/modules/games/`:

- Add route file with: URL endpoint returning `{ url }` and setting `nw_game` cookie
- Register in `games.routes.ts`
- All routes are auth-gated (`authMiddleware` + `restrictTo('user')`)

### 6. Purge Cloudflare Cache (CRITICAL)

After ANY file update in R2:

1. Go to **dash.cloudflare.com** → `nightwatch.in` zone
2. **Caching** → **Configuration** → **Purge Cache**
3. **Custom Purge** the changed URLs, or **Purge Everything**

Without this step, Cloudflare serves stale cached files (up to 4 hours).

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

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Game not loading in prod but works locally | Cloudflare cache serving stale files | Purge CF cache |
| `frame-ancestors` CSP error | Game SDK sitelock not fully removed | Remove SDK domain strings from JS (see [./PATCHING.md](./PATCHING.md)) |
| Game hangs on loading | SDK waiting for postMessage response | Remove SDK init call, mock all methods |
| `404` on assets | Wrong bundle path / missing files | Check R2 bucket contents via wrangler |
| `CORS` errors | CDN configuration | Verify R2 custom domain CORS rules |
| Game audio persists after navigation | iframe not cleaned up | `GameFrame` handles this — sets `src=about:blank` + removes iframe on unmount |
| 403 during long play sessions | Auth cookie expired | `GameFrame` auto-refreshes every 45 minutes; verify backend cookie TTL |

## File Locations

- **Local backup**: `/Users/rudra/Development/nightwatch-games-backup/`
- **R2 bucket**: `nightwatch-games` (served via `games.nightwatch.in`)
- **Frontend game frame**: `src/components/game-frame.tsx`
- **Frontend game pages**: `src/app/(protected)/(main)/games/`
- **Frontend API layer**: `src/features/games/api.ts`

## Related Documentation

- [Games Overview](./README.md)
- [Game Patching Guide](./PATCHING.md)
- [Architecture Overview](../../architecture/OVERVIEW.md)
- [Desktop Platform](../../platforms/DESKTOP.md) — Electron CSP configuration
