# Games Deployment Guide

## Architecture

- Game assets stored in MinIO bucket `nightwatch-games` (public-read)
- Served via `s3.nightwatch.in` (nginx → MinIO, behind Cloudflare)
- Frontend loads game in sandboxed iframe (`allow-scripts allow-same-origin allow-popups`)
- Backend returns direct public URL (no presigned URLs — bucket is public)

## Adding a New Game

### 1. Prepare Game Files

Strip all third-party SDK sitelocks before uploading:

```bash
# Search for sitelock/DRM code
grep -r "poki\|crazygames\|sitelock\|frame-ancestors" game-folder/

# In the obfuscated JS, replace:
# - Any SDK domain strings (e.g., 'poki', 'p.com', 'ki.io') with harmless values
# - Domain whitelist checks: find `if(!_0xVARIABLE)` patterns near domain arrays and replace with `if(false)`
# - Remove SDK init function calls (e.g., `_0x42f86e();` → remove the call)
```

**Key strings to search and neutralize:**
- `poki`, `crazygames`, `sitelock`, `frame-ancestors`
- `.com` fragments used to build SDK URLs
- `ancestorOrigins`, `location.hostname` checks
- `addEventListener('message'` handlers waiting for SDK responses

### 2. Create `index.html` Wrapper

Every game needs a custom `index.html` with:

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <script>
        // 1. Mock the game platform SDK (Poki, CrazyGames, etc.)
        window.PokiSDK = {
            init: () => Promise.reject(),
            gameLoadingStart: () => {},
            gameLoadingFinished: () => {},
            gameplayStart: () => {},
            gameplayStop: () => {},
            commercialBreak: () => Promise.resolve(),
            rewardedBreak: () => Promise.resolve(false),
            setDebug: () => {},
            getURLParam: () => '',
            // ... add any methods the game calls
        };

        // 2. Disable service worker
        window.NOSW = true;

        // 3. Score bridge to Nightwatch
        // (postMessage to parent for score submission)
    </script>
    <!-- Game scripts -->
</head>
</html>
```

### 3. Upload to MinIO

```bash
# Upload game files
AWS_ACCESS_KEY_ID=minioadmin AWS_SECRET_ACCESS_KEY=minioadmin \
  aws --endpoint-url http://localhost:9000 \
  s3 sync ./game-folder/ s3://nightwatch-games/game-slug/

# Test locally
open http://localhost:9000/nightwatch-games/game-slug/index.html
```

### 4. Upload to Production

```bash
# SCP files to server, then use mc inside MinIO container
scp -r ./game-folder/ rudra@rudrasahoo:/tmp/game-upload/

ssh rudra@rudrasahoo "
  docker cp /tmp/game-upload/ nightwatch_minio_prod:/tmp/game-upload/ &&
  docker exec nightwatch_minio_prod mc mirror /tmp/game-upload/ local/nightwatch-games/game-slug/
"
```

### 5. Purge Cloudflare Cache (CRITICAL)

After ANY file update in production MinIO:

1. Go to **dash.cloudflare.com** → `nightwatch.in` zone
2. **Caching** → **Configuration** → **Purge Cache**
3. **Custom Purge** the changed URLs, or **Purge Everything**

Without this step, Cloudflare serves stale cached files (up to 4 hours).

### 6. Add Backend Route

In `nightwatch-backend/src/modules/games/`:

- Add route file with: URL endpoint, score submission, leaderboard, nickname
- Register in `games.routes.ts`
- All routes are auth-gated (`authMiddleware` + `restrictTo('user')`)

### 7. Add Frontend Page

In `nightwatch/src/app/(protected)/(main)/games/game-slug/page.tsx`:

- Fetch game URL from backend
- Render `<GameFrame>` component
- Add postMessage bridge for scores/leaderboard

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Game not loading in prod but works locally | Cloudflare cache | Purge CF cache |
| `frame-ancestors` CSP error | Game SDK sitelock | Remove SDK domain strings from JS |
| Game hangs on loading | SDK waiting for postMessage response | Remove SDK init call, mock all methods |
| `404` on assets | Wrong bundle path / missing files | Check MinIO bucket contents |
| `CORS` errors | Missing `allow-same-origin` in sandbox | Ensure iframe has `sandbox="allow-scripts allow-same-origin allow-popups"` |

## nginx Config (s3.nightwatch.in)

The nginx proxy adds a CSP header to block iframe creation to external domains:

```nginx
add_header Content-Security-Policy "frame-src 'none'; child-src 'self' blob:;" always;
```

## File Locations

- **Local backup**: `/Users/rudra/Development/nightwatch-games-backup/`
- **Local MinIO**: `http://localhost:9000/nightwatch-games/`
- **Production MinIO**: `https://s3.nightwatch.in/nightwatch-games/`
- **nginx config**: `/opt/nginx/conf.d/s3.nightwatch.in.conf` (on prod server)
