# Adding Games to Nightwatch

## Overview

Games are self-hosted HTML5 games sourced from Poki's CDN, patched to remove sitelock/ads, and served from our MinIO object storage.

## Architecture

```
User → Frontend (iframe) → MinIO (s3.nightwatch.in/nightwatch-games/{slug}/index.html)
                         ↑
         Backend sets nw_game cookie for nginx auth
```

- **Frontend**: Game page at `src/app/(protected)/(main)/games/{slug}/page.tsx`
- **Backend**: Route at `src/modules/games/{slug}/` returns signed MinIO URL
- **Storage**: MinIO bucket `nightwatch-games/{slug}/` holds all game files
- **Auth**: nginx validates `nw_game` cookie via `secure_link_md5`

## Step-by-Step: Adding a New Game

### 1. Discover Game IDs (Headless Trace)

```typescript
// scripts/trace-{game}.ts in nightwatch-browser-service
import { chromium } from 'playwright';
import fs from 'node:fs';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const urls = new Set();

  page.on('request', (req) => {
    const url = req.url().split('?')[0];
    if (url.includes('gdn.poki.com')) urls.add(url);
  });

  await page.goto('https://poki.com/en/g/{game-slug}', {
    waitUntil: 'networkidle',
    timeout: 30000
  }).catch(() => {});
  await page.waitForTimeout(15000);

  fs.writeFileSync('/tmp/{game}-urls.txt', [...urls].join('\n'));
  console.log('Captured ' + urls.size + ' URLs');
  [...urls].forEach(u => console.log(u));
  await browser.close();
})();
```

**Key output**: The first URL reveals the game ID and version ID:
```
https://{GAME_ID}.gdn.poki.com/{VERSION_ID}/index.html
```

### 2. Download Assets

#### Direct Download Script

```typescript
// scripts/download-{game}-direct.ts
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://{GAME_ID}.gdn.poki.com/{VERSION_ID}';
const OUTPUT = '/Users/rudra/Development/nightwatch-games-backup/{slug}';

const FILES = [
  'index.html', 'global.css', 'bundle.js', // ... discovered from trace
];

async function download(file: string) {
  const dest = path.join(OUTPUT, file);
  if (fs.existsSync(dest)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(`${BASE}/${file}`);
  if (!res.ok) return console.error(`[FAIL ${res.status}] ${file}`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`[OK] ${file}`);
}

async function main() {
  for (let i = 0; i < FILES.length; i += 10) {
    await Promise.all(FILES.slice(i, i + 10).map(download));
  }
}
main();
```

#### For `index.html` (often returns 403 without referer):
```bash
curl -s -H "Referer: https://poki.com/" -o index.html \
  "https://{GAME_ID}.gdn.poki.com/{VERSION_ID}/index.html"
```

#### Capture Gameplay Assets (Chrome CDP)

For assets loaded during gameplay, open Chrome with remote debugging:
```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --remote-debugging-port=9222 --user-data-dir=/tmp/game-chrome \
  "https://poki.com/en/g/{game-slug}"
```

Then connect via CDP to capture URLs while playing:
```typescript
import WebSocket from 'ws';
import fs from 'node:fs';

const res = await fetch('http://localhost:9222/json');
const tabs = await res.json();
const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
const urls = new Set();

ws.on('open', () => ws.send(JSON.stringify({id:1, method:'Network.enable'})));
ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.method === 'Network.requestWillBeSent') {
    const url = msg.params.request.url.split('?')[0];
    if (url.includes('{GAME_ID}')) urls.add(url);
  }
});

process.on('SIGINT', () => {
  fs.writeFileSync('/tmp/game-urls.txt', [...urls].join('\n'));
  process.exit(0);
});
```

### 3. Patch Sitelock

**This is the critical step.** Poki games have an obfuscated domain check in `bundle.js`.

#### Finding the Sitelock

Search for the base64-encoded domain whitelist:
```bash
grep -o '.\{200\}bG9jYWxob3N0.\{200\}' bundle.js
```

`bG9jYWxob3N0` = base64 of "localhost"
`LnBva2kuY29t` = base64 of ".poki.com"

The pattern looks like:
```javascript
{VARIABLE}.IS_RELEASE&&function(){
  for(var e=["bG9jYWxob3N0","LnBva2kuY29t",{obfuscated}],t=!1,i=window[...][...],n=0;n<e[...];n++){
    var s=atob(e[n]);
    if(-1!==i[...](s,i.length-s.length)){t=!0;break}
  }
  if(!t){
    var r=...,o=atob(r);
    window.location[...]=o  // ← redirects to poki.com/sitelock
  }
}();
```

#### Patching

The variable before `IS_RELEASE` varies per game:
- Temple Run 2: `_t.IS_RELEASE`
- Frozen Shadows/Spooky/Holi: `s.GameConfig.IS_RELEASE`

**Python patch script:**
```python
with open('bundle.js', 'r') as f:
    c = f.read()

# Find the pattern and disable it
patterns = [
    '_t.IS_RELEASE&&function(){for(var e=["bG9jYWxob3N0","LnBva2kuY29t"',
    's.GameConfig.IS_RELEASE&&function(){for(var e=["bG9jYWxob3N0","LnBva2kuY29t"',
]

for old in patterns:
    if old in c:
        # Insert !1&& after IS_RELEASE&& to short-circuit
        new = old.replace('IS_RELEASE&&', 'IS_RELEASE&&!1&&')
        c = c.replace(old, new)
        break

# Generic fallback: find any &&function(){ before the base64 strings
if 'bG9jYWxob3N0' in c:
    idx = c.find('bG9jYWxob3N0')
    start = c.rfind('&&function(){', max(0, idx-200), idx)
    if start > 0:
        c = c[:start] + '&&!1&&function(){' + c[start+13:]

with open('bundle.js', 'w') as f:
    f.write(c)
```

### 4. Patch index.html

Replace the original `index.html` with our template that includes:

1. **Fetch interceptor** — blocks network requests to poki domains
2. **Script element interceptor** — blocks dynamic Poki SDK loading
3. **iframe src interceptor** — blocks iframe navigation to poki
4. **PokiSDK mock** — provides all SDK methods as no-ops
5. **webpack public path** — ensures assets load from correct relative path

```html
<script>
    // Block dynamic script loading from poki
    const _origCreateElement = document.createElement.bind(document);
    document.createElement = function(tag) {
        const el = _origCreateElement(tag);
        if (tag.toLowerCase() === 'script') {
            let _src = '';
            Object.defineProperty(el, 'src', {
                get() { return _src; },
                set(v) {
                    if (typeof v === 'string' && v.includes('poki')) {
                        setTimeout(() => el.onload && el.onload(), 0);
                        return;
                    }
                    _src = v;
                    HTMLScriptElement.prototype.__lookupSetter__('src').call(el, v);
                },
                configurable: true, enumerable: true
            });
        }
        return el;
    };
    const _realFetch = window.fetch.bind(window);
    window.fetch = function(url, opts) {
        if (typeof url === 'string' && url.includes('poki')) return Promise.resolve(new Response(''));
        return _realFetch(url, opts);
    };
    const srcDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'src');
    if (srcDesc && srcDesc.set) {
        const origSet = srcDesc.set;
        Object.defineProperty(HTMLIFrameElement.prototype, 'src', {
            set(v) { if (typeof v === 'string' && v.includes('poki')) { setTimeout(() => this.dispatchEvent(new Event('load')), 0); return; } origSet.call(this, v); },
            get: srcDesc.get, configurable: true, enumerable: true
        });
    }
    const _origSetAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(n, v) {
        if (this.tagName === 'IFRAME' && n === 'src' && typeof v === 'string' && v.includes('poki')) { setTimeout(() => this.dispatchEvent(new Event('load')), 0); return; }
        return _origSetAttr.call(this, n, v);
    };
</script>
<script>
    // Mock PokiSDK
    window.PokiSDK = {
        init: () => Promise.resolve(),
        gameLoadingStart: () => {},
        gameLoadingFinished: () => {},
        gameplayStart: () => {},
        gameplayStop: () => {},
        commercialBreak: () => Promise.resolve(),
        rewardedBreak: () => Promise.resolve({ success: true, rewarded: true }),
        setDebug: () => {},
        getURLParam: (key) => new URLSearchParams(window.location.search).get(key) || '',
        shareableURL: () => Promise.resolve(''),
        isAdBlocked: () => true,
        adBlockerOn: true,
        displayAd: () => Promise.resolve(),
        destroyAd: () => {},
        logError: () => {},
        hasConsentManager: () => false,
        getConsentStatus: () => 'accepted',
    };
</script>
<script>window.__webpack_public_path__ = './'; self.__webpack_public_path__ = './';</script>
<script src='bundle.js' defer></script>
```

**Important**: Remove any `<script src="//game-cdn.poki.com/...">` tags and adblock detection code.

### 5. Upload to MinIO

#### Via Admin Panel (Recommended)

1. Go to the admin panel at `https://admin.nightwatch.in/pages/games/`
2. Create the game entry (slug, title, description)
3. Upload the tar.gz archive of the game folder

#### Via Admin API

```bash
# 1. Create game entry in database
curl -X POST https://api.nightwatch.in/api/admin/games \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"slug":"new-game","title":"New Game","description":"A cool game","sortOrder":5}'

# 2. Upload game files (tar.gz of the prepared game folder)
tar czf /tmp/new-game.tar.gz --exclude='._*' new-game/
curl -X POST https://api.nightwatch.in/api/admin/games/new-game/upload \
  -H "Authorization: Bearer <admin-token>" \
  -F "archive=@/tmp/new-game.tar.gz"
```

#### Via CLI (Manual)

```bash
# Local
AWS_ACCESS_KEY_ID=minioadmin AWS_SECRET_ACCESS_KEY=minioadmin \
  aws --endpoint-url http://localhost:9000 s3 sync ./{slug}/ s3://nightwatch-games/{slug}/

# Production
tar czf /tmp/{slug}.tar.gz --exclude='._*' {slug}/
scp /tmp/{slug}.tar.gz rudra@rudrasahoo:/tmp/
ssh rudra@rudrasahoo "cd /tmp && tar xzf {slug}.tar.gz && \
  find {slug} -name '._*' -delete && \
  docker cp {slug} \$(docker ps -q -f name=minio):/tmp/{slug} && \
  docker exec \$(docker ps -q -f name=minio) mc mirror --overwrite /tmp/{slug}/ local/nightwatch-games/{slug}/ && \
  rm -rf /tmp/{slug} /tmp/{slug}.tar.gz"
```

### 6. Database & Backend

Games are stored in the `games` PostgreSQL table:

```sql
CREATE TABLE games (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);
```

**Public API:**
- `GET /api/games` — returns all active games with thumbnail/video URLs (used by frontend)

**Admin API** (requires admin token + Tailscale):
- `GET /api/admin/games` — list all games (including inactive)
- `POST /api/admin/games` — create game `{ slug, title, description?, sortOrder? }`
- `POST /api/admin/games/:slug/upload` — upload tar.gz archive (max 100MB)
- `PATCH /api/admin/games/:id` — update fields (title, description, active, sortOrder)
- `DELETE /api/admin/games/:id` — remove game from DB

Each game also needs a per-slug route for the iframe URL cookie:

Create `src/modules/games/{slug}/controller.ts`:
```typescript
import crypto from 'node:crypto';
import type { Response } from 'express';
import type { AuthRequest } from '@/middlewares/auth.middleware';

const GAMES_BUCKET = 'nightwatch-games';
const MINIO_PUBLIC_ENDPOINT = process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT || 'http://localhost:9000';
const GAME_SECRET = process.env.GAME_COOKIE_SECRET || 'nightwatch-games-secret-key';
const COOKIE_TTL = 3600;
const IS_PROD = process.env.NODE_ENV === 'production';

function generateGameToken(expiry: number): string {
  const hash = crypto.createHash('md5').update(`${GAME_SECRET}${expiry}`).digest('base64url');
  return `${hash}${expiry}`;
}

function getGameUrl(_req: AuthRequest, res: Response) {
  const expiry = Math.floor(Date.now() / 1000) + COOKIE_TTL;
  const token = generateGameToken(expiry);
  res.cookie('nw_game', token, {
    domain: IS_PROD ? '.nightwatch.in' : undefined,
    path: '/', httpOnly: true, secure: IS_PROD, sameSite: 'lax', maxAge: COOKIE_TTL * 1000,
  });
  const url = `${MINIO_PUBLIC_ENDPOINT}/${GAMES_BUCKET}/{slug}/index.html`;
  return res.json({ url });
}

export const Controller = { getGameUrl };
```

Create `src/modules/games/{slug}/routes.ts`:
```typescript
import { Router } from 'express';
import { Controller } from './controller';
const router: Router = Router();
router.get('/url', Controller.getGameUrl);
export default router;
```

Register in `games.routes.ts`:
```typescript
import newGameRoutes from './{slug}/routes';
router.use('/{slug}', newGameRoutes);
```

### 7. Frontend

The games listing page (`src/app/(protected)/(main)/games/page.tsx`) fetches from `GET /api/games` — no hardcoded data. Adding a game to the DB automatically shows it on the frontend.

For each game's play page, copy from an existing game page directory and update the slug/title/API path.

**Thumbnail & Preview Video**: Upload `thumbnail.png` and `preview.mp4` to `nightwatch-games/{slug}/` in MinIO. The API constructs URLs automatically.

### 8. Electron CSP

Add `http://localhost:9000` to `frame-src` in `electron/main.js` CSP (already done).

## Troubleshooting

### Game redirects to poki.com/sitelock
- The sitelock in `bundle.js` wasn't patched correctly
- Search for `bG9jYWxob3N0` (base64 "localhost") to find the check
- The variable name before `IS_RELEASE` differs per game

### Assets return 404
- Game loads assets dynamically during gameplay that weren't in the initial trace
- Re-run the Chrome CDP capture while playing the game
- Some assets genuinely don't exist on the CDN (the game handles missing assets gracefully)

### Assets return 403 in prod
- The `nw_game` cookie isn't being sent (check domain/path settings)
- Cookie expired (TTL is 1 hour)
- nginx `secure_link` validation failing

### Game works locally but not in prod
- Check nginx CSP headers on the games location
- Verify the `MINIO_ENDPOINT` env var in prod backend
- Ensure all files were uploaded (check `mc ls --recursive`)

## Known Game IDs

| Game | Game ID | Version ID |
|------|---------|------------|
| Subway Surfers | `5dd312fa-015f-11ea-ad56-9cb6d0d995f7` | `3b92beeb-6b18-43a2-a0b6-aac2c34ed26d` |
| Temple Run 2 | `84938be4-42ce-42a8-9968-2f5f2a7618d8` | `f2e6056e-ac6f-4d61-bec9-5618e79105e7` |
| TR2 Frozen Shadows | `43a9c68e-4e5a-4916-8fdd-d4a23bc94d04` | `a43bfe6b-00c1-42e0-bb51-c2bd5a1c0395` |
| TR2 Spooky Summit | `721a3443-bef9-4ffe-a586-3d461117a850` | `82393176-65d6-4d35-bb04-4d8817e54397` |
| TR2 Holi Festival | `9de7a940-2560-46af-bbf3-6a6f503ce250` | `3fa4d23e-5419-4a73-86f6-150094aad78f` |
