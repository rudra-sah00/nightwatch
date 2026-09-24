# Games

Embedded HTML5 game catalogue — games are sourced from Poki's CDN, patched to remove sitelock/ads, and served from Cloudflare R2 storage inside a sandboxed iframe.

**Source:** `src/features/games/`, `src/components/game-frame.tsx`, `src/app/(protected)/(main)/games/`

---

## Architecture

```
User → Frontend (iframe) → R2 (games.nightwatch.in/{slug}/index.html)
                         ↑
         Backend sets nw_game cookie for auth
```

- **Frontend**: Game listing at `src/app/(protected)/(main)/games/page.tsx`, individual game at `src/app/(protected)/(main)/games/[slug]/page.tsx`
- **Iframe host**: `src/components/game-frame.tsx` — handles cookie refresh, music ducking, Discord Rich Presence, and friend activity broadcast
- **Backend**: Per-slug route returns the authenticated game iframe URL via `GET /api/games/:slug/url` and sets an `nw_game` cookie
- **Storage**: Cloudflare R2 bucket `nightwatch-games` served via custom domain `games.nightwatch.in`
- **Auth**: `nw_game` cookie validated by the CDN/backend layer

## Frontend Components

### Games Listing — `src/app/(protected)/(main)/games/page.tsx`

Fetches all games from `GET /api/games` via TanStack Query (key `['games']`). No hardcoded game data — adding a game to the backend DB automatically shows it in the frontend.

Features:
- **Search** — client-side filter on title + description via `NeoSearchBar`
- **Shuffle** — games are shuffled once per data fetch (`useMemo` with `shuffle`)
- **Hover preview** — thumbnail shown by default; `<video>` plays on mouse enter
- **Skeleton loading** — 6 skeleton cards while data loads
- **i18n** — all strings from `common.gamesPage` namespace

### Game Page — `src/app/(protected)/(main)/games/[slug]/page.tsx`

Fetches the authenticated iframe URL via TanStack Query (key `['games', slug, 'url']`). Renders the `<GameFrame>` component inside a container with fullscreen support.

Features:
- **Fullscreen** — three strategies: native Fullscreen API (web), CSS fixed positioning (desktop/mobile), and orientation lock (mobile via `mobileBridge`)
- **Electron escape** — listens for `electronAPI.onGlobalEscape` to exit fullscreen on desktop
- **Analytics** — fires `game_play` event via `trackEvent` when game URL loads
- **Back button** — `router.back()` navigation

### GameFrame — `src/components/game-frame.tsx`

The iframe wrapper component that renders the game and manages session lifecycle.

Features:
- **Cookie refresh** — calls `refreshGameSession(slug)` every 45 minutes to prevent 403s during long play sessions
- **Music ducking** — dispatches `ask-ai:duck` CustomEvent on mount/unmount to lower background music volume
- **Friend activity** — emits `watch:set_activity` via Socket.IO with `type: 'game'`, title, and poster URL; heartbeat every 3 minutes
- **Discord Rich Presence** — on desktop, updates presence with game title via `desktopBridge.updateDiscordPresence`; clears on unmount
- **Audio cleanup** — sets iframe `src` to `about:blank` and removes it from DOM on unmount to kill lingering game audio
- **Orientation restore** — unlocks orientation and shows status bar on mobile when unmounting
- **iframe permissions** — `allow="autoplay; fullscreen; gamepad"` (no `sandbox` attribute)

### Error Boundary — `src/app/(protected)/(main)/games/error.tsx`

Standard error page with "Try Again" button that calls `reset()`.

### Layout — `src/app/(protected)/(main)/games/layout.tsx`

Sets page metadata: `{ title: 'Games' }`.

## API Layer

`src/features/games/api.ts` — all functions use `apiFetch` from `src/lib/fetch.ts`.

| Function | Endpoint | Description |
|----------|----------|-------------|
| `getGames()` | `GET /api/games` | Fetch all active games (returns `{ games: Game[] }`) |
| `getGameUrl(slug)` | `GET /api/games/:slug/url` | Fetch authenticated iframe URL (returns `{ url: string }`) |
| `refreshGameSession(slug)` | `GET /api/games/:slug/url` | Re-fetches URL to refresh the auth cookie |

## Types

`src/features/games/types.ts`

```typescript
interface Game {
  slug: string;
  title: string;
  description: string;
  thumbnail: string;
  video: string;
}
```

## Asset Pipeline Scripts

The repo contains scripts used to trace and download game assets from Poki's CDN:

| Script | Purpose |
|--------|---------|
| `scripts/capture-game-assets.mjs` | CDP network listener — connects to Chrome remote debugging, captures asset URLs containing a given game ID. Usage: `node scripts/capture-game-assets.mjs <game-id> [output-file]` |
| `scripts/trace-fruit-ninja.ts` | Playwright-based tracer for Fruit Ninja — launches Chrome, navigates to Poki, intercepts and downloads all CDN assets during gameplay |
| `scripts/download-fruit-ninja-assets.ts` | Downloads specific missing Fruit Ninja assets by file path list (textures, models, UI elements) |

These scripts are development tools run manually, not wired into `package.json` scripts.

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

Then use the repo's CDP capture script:
```bash
node scripts/capture-game-assets.mjs {GAME_ID} /tmp/{game}-urls.txt
```

### 3. Patch Sitelock

**This is the critical step.** See [./PATCHING.md](./PATCHING.md) for the full patching guide covering sitelock removal, PokiSDK mocking, and engine-specific instructions.

### 4. Upload to R2

See [./DEPLOYMENT.md](./DEPLOYMENT.md) for upload procedures and cache management.

### 5. Database & Backend

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

Each game also needs a per-slug backend route for the iframe URL cookie (see backend repo: `src/modules/games/{slug}/controller.ts`).

### 6. Frontend

The games listing page fetches from `GET /api/games` — no hardcoded data. Adding a game to the DB automatically shows it on the frontend.

For each game's play page, the `[slug]` dynamic route handles all slugs automatically — no per-game page files needed.

**Thumbnail & Preview Video**: Upload `thumbnail.png` and `preview.mp4` to `nightwatch-games/{slug}/` in R2. The API constructs URLs automatically.

### 7. Electron CSP

The Electron main process CSP must include the games domain in `frame-src`.

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

### Game works locally but not in prod
- Verify MIME types were set correctly during R2 upload
- Check Cloudflare cache — purge if files were re-uploaded

## Known Game IDs

| Game | Game ID | Version ID |
|------|---------|------------|
| Subway Surfers | `5dd312fa-015f-11ea-ad56-9cb6d0d995f7` | `3b92beeb-6b18-43a2-a0b6-aac2c34ed26d` |
| Temple Run 2 | `84938be4-42ce-42a8-9968-2f5f2a7618d8` | `f2e6056e-ac6f-4d61-bec9-5618e79105e7` |
| TR2 Frozen Shadows | `43a9c68e-4e5a-4916-8fdd-d4a23bc94d04` | `a43bfe6b-00c1-42e0-bb51-c2bd5a1c0395` |
| TR2 Spooky Summit | `721a3443-bef9-4ffe-a586-3d461117a850` | `82393176-65d6-4d35-bb04-4d8817e54397` |
| TR2 Holi Festival | `9de7a940-2560-46af-bbf3-6a6f503ce250` | `3fa4d23e-5419-4a73-86f6-150094aad78f` |
| Fruit Ninja | `8b32c0f4-2dcb-4fdd-bf8b-16df63b01532` | *(version varies — see `scripts/download-fruit-ninja-assets.ts`)* |

## Related Documentation

- [Game Patching Guide](./PATCHING.md) — sitelock removal, SDK mocking, engine-specific patches
- [Game Deployment Guide](./DEPLOYMENT.md) — R2 uploads, cache purging, database entries
- [Architecture Overview](../../architecture/OVERVIEW.md)
- [API Layer](../../architecture/API_LAYER.md)
- [Smart TV Platform](../../platforms/SMART_TV.md)
- [Desktop Platform](../../platforms/DESKTOP.md)
