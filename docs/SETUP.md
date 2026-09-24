# Setup and Local Development

Everything needed to run the Nightwatch frontend locally.

**Source:** `.env.example`, `package.json`, `src/lib/env.ts`

## Prerequisites

- **Node.js 20+**
- **pnpm 10.29.2** — the version is pinned via `packageManager` in `package.json`, so `corepack enable` is the least surprising way to get it.
- A running [nightwatch-backend](https://github.com/rudra-sah00/nightwatch-backend) instance and its Redis dependency.

## Installation

1. Clone the repository and navigate into the project directory:
   ```bash
   git clone https://github.com/rudra-sah00/nightwatch.git
   cd nightwatch
   ```

2. Install all dependencies using pnpm:
   ```bash
   pnpm install
   ```

`pnpm-workspace.yaml` carries dependency `overrides`, `patchedDependencies`, and the build-script allowlist (pnpm 10 no longer reads these from `package.json`). Always install with pnpm — npm or yarn will silently skip the security overrides and the `@ottimis/capacitor-volumes` patch.

## Environment Configuration

Copy the example file and fill it in:

```bash
cp .env.example .env.local
```

### Required

`src/lib/env.ts` throws at startup if any of these are missing:

```env
# Base URL of your local nightwatch-backend instance
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000

# Socket.IO endpoint (usually identical to the backend URL)
NEXT_PUBLIC_WS_URL=http://localhost:4000

# Agora App ID (from console.agora.io) — watch party and voice calls
NEXT_PUBLIC_AGORA_APP_ID=your_agora_app_id
```

### Optional

Absent values degrade the relevant feature rather than breaking the build:

```env
# Cloudflare Turnstile site key (anti-bot on login/signup)
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key

# Google OAuth — web and native iOS client IDs
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_client_id

# Firebase — Analytics and Cloud Messaging push (no Firestore is used)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key

# Verbose Agora SDK logging in the browser console
NEXT_PUBLIC_AGORA_DEBUG=false

# Cloudflare Worker used to proxy media
NEXT_PUBLIC_CF_WORKER_URL=

# Shown in the UI / crash context
NEXT_PUBLIC_APP_VERSION=

# Discord Rich Presence application ID (desktop build only, not NEXT_PUBLIC_)
DISCORD_CLIENT_ID=
```

Two further variables are read by the code but are set by the deployment rather than locally: `NEXT_PUBLIC_APP_ENV` (`staging` disables Analytics and the service worker) and `NEXT_PUBLIC_APP_URL`.

> `.env.local` is git-ignored. Playwright reads its own git-ignored `.env.test` — see [architecture/TESTING.md](./architecture/TESTING.md).

## Running the Application

### Development Server

```bash
pnpm dev
```
Then open [http://localhost:3000](http://localhost:3000).

### Build and Production Server

1. Build:
   ```bash
   pnpm build
   ```

2. Serve the build:
   ```bash
   pnpm start
   ```

## Code Quality and Linting

Formatting and type safety are enforced with Biome and TypeScript:

- **Check types:** `pnpm type-check`
- **Lint & format check:** `pnpm check` (`pnpm lint` is an alias for the same command)
- **Auto-fix formatting:** `pnpm format`

A Husky pre-commit hook runs the basics automatically.

## Testing

- **Unit/component tests:** `pnpm test`
- **Vitest UI:** `pnpm test:ui`
- **Coverage:** `pnpm test:coverage`
- **End-to-end:** `pnpm test:e2e` — requires local Redis; the script wipes `security:*` and `auth:otp_limit*` keys first, so never point it at production.

## Other Platforms

- Desktop (Electron): `pnpm desktop:start` — see [platforms/DESKTOP.md](./platforms/DESKTOP.md)
- iOS: `pnpm mobile:ios` — see [platforms/MOBILE.md](./platforms/MOBILE.md)
- Android: `pnpm mobile:android`
- Android TV: see [platforms/SMART_TV.md](./platforms/SMART_TV.md)

---

Next: [architecture/OVERVIEW.md](./architecture/OVERVIEW.md) for how the pieces fit together, or [CONTRIBUTING.md](./CONTRIBUTING.md) before your first commit.