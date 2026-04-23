# Real-World Codebase Architecture

Nightwatch is not a simple Next.js boilerplate; it's a massive, multi-environment monorepo architecture bridging browser clients explicitly with native Electron (OS) hooks, complex HLS streaming, and real-time P2P networking protocols.

## High-Level Tech Stack

*   **Framework**: Next.js 15 (App Router fully utilizing RSC / Server Actions).
*   **Language**: TypeScript (Strict typing for RPC channels, APIs, and React props).
*   **Styling**: Tailwind CSS (Custom Neo-Brutalist Theme with variables in `tailwind.config`).
*   **Real-time Infrastructure**: Agora RTM (Signaling / UI State), Agora RTC (WebRTC Video/Audio Calls), and Socket.io (`socket.ts` legacy fallbacks).
*   **Video Engine**: Custom HLS abstractions over `hls.js` supporting dynamic manifest swapping.
*   **Native Bridge**: Electron invoke/listen via `desktopBridge` (`src/lib/electron-bridge.ts`).
*   **Quality Config**: `biome.json` (Lint/Format entirely replacing ESLint/Prettier), Vitest (Unit), Playwright (E2E).

---

## 1. The Route Grouping Paradigm

The entry point of the app lives in `src/app/`, where React Server Components determine authentication layouts gracefully before reaching the client boundaries.

We strategically compartmentalize routes using parenthesis:
*   `app/(public)/`: Landing pages, SEO-focused indexing maps, and unauthenticated feature showcases. No auth middleware blocking occurs here.
*   `app/(protected)/`: The core dashboard, Discover maps, user profiles, and VOD watch streams (`/watch/:id`). This enforces the user has hit the `AuthProvider`.
*   `app/(party)/`: The extremely complex layout dedicated solely to real-time WebRTC connections, bypassing generic navigation sidebars to prevent accidental unmounts of the Agora connection container (`src/features/watch-party/`).

---

## 2. Feature-Sliced Design (`src/features/`)

Instead of throwing every component into a global `src/components/` folder, Nightwatch embraces a deeply nested Feature-Pattern architecture. A generic `Button` lives in `src/components/ui/`, but business logic lives in `src/features/[domain]/`:

*   **`auth/`**: Sign In, Sign Up, JWT handling UI.
*   **`watch/`**: The complete VOD engine, storing `src/features/watch/player/` for parsing m3u8 manifests into `HTMLVideoElement` contexts cleanly.
*   **`watch-party/`**: The single largest domain in the project. Broken down locally into:
    *   `/chat/`: Instant messaging hooks and P2P overlays.
    *   `/hooks/`: Global UI states, full-screen detection, active media controls.
    *   `/interactions/`: The `useGestureDetection.ts` logic handling camera hand movements, `useSoundboard.ts`, and `SketchContext.tsx` for drawing on the screen.
    *   `/media/`: The exact `useAgora.ts` and `useAgoraRtm.ts` engines. Provides standard React hooks mapping perfectly to SDK connection promises.
    *   `/room/`: Member tracking, permission sync (`useWatchPartyMembers.ts`, `usePredictiveSync.ts`), and the legacy fallback lobby logic natively bridging socket approvals.

---

## 3. The `src/lib/` Utilities Layer

*   **`fetch.ts`:** The `apiFetch` wrapper with automatic token refresh, CSRF handling, configurable retries with linear backoff, and proper abort signal handling (user abort vs timeout are distinguished).
*   **`cache.ts`:** Shared `createTTLCache<T>()` utility used by search, profile, and watch APIs. All caches auto-register for bulk invalidation via `clearAllCaches()` on logout.
*   **`errors.ts`:** Centralized error handling — `isApiError()` type guard, `handleApiError()` with toast, `mapErrorCode()` for user-friendly messages.
*   **`socket.ts`:** A global singleton initialization for the Socket.io server connection. Keeps track of force logouts and active connections.
*   **`storage-cache.ts`:** In-memory cache for `localStorage` reads. Event listeners initialized lazily via `initStorageCache()` to avoid SSR side effects.
*   **`linkify.ts`:** URL parsing for chat messages. Uses separate global/non-global regex to avoid `lastIndex` mutation bugs.
*   **`constants.ts`:** Strongly typed enumerations for system-wide behaviors.
*   **`env.ts`:** Validated environment configuration at runtime.

---

## 4. The Edge Proxy & Custom Matchers

Inside Next.js `src/proxy.ts` (mapped in Edge infrastructure), our frontend intercepts direct CDN manifest requests (`.m3u8` or chunk `.ts` files) dynamically. This forces CDN edge servers to believe the VOD stream is being requested by the authorized Host Platform, mitigating hard CORS rules and Hotlink protections designed to crash third-party React players.

*   **The Regex Matcher Strategy:** A heavily tested Regex pattern `/((?!api/|_next/static).*)` ensures internal documentation links like `/API_LAYER` aren't automatically redirected into 404 Vercel Edge endpoints.

---

## 5. The Electron Sandbox (`src/hooks/use-desktop-app.ts`)

Instead of rendering a normal web app in a system webview, the Nightwatch standard browser experience contains fallback abstractions checking for custom protocol handlers (`nightwatch://`).
If the system timeout detects `document.hidden` failing to trigger after 2000 milliseconds, it visually outputs a Sonner Toast asking the user to manually install the desktop shell to enjoy Frameless borders, system hardware rendering, and Discord Rich Presence integrations linked explicitly inside `src/lib/electron-bridge.ts`.
