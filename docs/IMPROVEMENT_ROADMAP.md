# Watch Rudra — 6-12 Month Improvement Roadmap

> **Created:** April 19, 2026
> **Scope:** Security hardening, refactoring, feature additions, UI/UX improvements, Tauri app stability, CI/CD, accessibility, SEO, and documentation.
> **Approach:** Execute phases sequentially. Each phase builds on the previous one. Items within a phase can be parallelized.

---

## Table of Contents

1. [Phase 1: Critical Security Fixes (Weeks 1–3)](#phase-1-critical-security-fixes-weeks-13)
2. [Phase 2: CI/CD & Testing Foundation (Weeks 4–6)](#phase-2-cicd--testing-foundation-weeks-46)
3. [Phase 3: Core Architecture Refactors (Weeks 7–12)](#phase-3-core-architecture-refactors-weeks-712)
4. [Phase 4: Tauri App Overhaul (Weeks 13–20)](#phase-4-tauri-app-overhaul-weeks-1320)
5. [Phase 5: UI/UX & Accessibility (Weeks 21–28)](#phase-5-uiux--accessibility-weeks-2128)
6. [Phase 6: Performance & PWA (Weeks 29–34)](#phase-6-performance--pwa-weeks-2934)
7. [Phase 7: New Features (Weeks 35–42)](#phase-7-new-features-weeks-3542)
8. [Phase 8: Documentation & Polish (Weeks 43–48)](#phase-8-documentation--polish-weeks-4348)

---

## Phase 1: Critical Security Fixes (Weeks 1–3)

> **Priority:** 🔴 CRITICAL — Do these before anything else.

### 1.1 Tauri Security Hardening

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 1 | Remove `nodeIntegration: true` from splash window | `src-tauri/src/commands/splash.rs` | Splash uses `nodeIntegration: true`, `contextIsolation: false`, `webSecurity: false`. Rewrite splash to use `contextIsolation: true` and communicate via Tauri invoke/listen. |
| 2 | Fix path traversal in `offline-media://` protocol | `src-tauri/src/commands/download-manager.rs` | The protocol handler joins user-supplied URL paths with `VAULT_PATH` without sanitizing `..` sequences. Add `path.resolve()` + verify the resolved path starts with `VAULT_PATH`. |
| 3 | Add URL allowlist to deep link handler | `src-tauri/src/commands/deep-link.rs` | `handleDeepLink` blindly transforms `watch-rudra://` to `https://` with no validation. Add an allowlist of permitted hostnames and path patterns. |
| 4 | Secure the live-bridge proxy server | `src-tauri/src/commands/live-bridge.rs` | The local HTTP proxy at `127.0.0.1:{port}/proxy?url=...` has no authentication and no URL allowlist. Any local process can use it as an open SSRF proxy. Add: (a) a per-session random token required in requests, (b) URL allowlist restricting to known streaming CDN domains. |
| 5 | Replace XOR cipher with AES-256-GCM | `src-tauri/src/commands/cipher.rs` | XOR encryption is trivially breakable. Replace with Rust `aes-gcm` crate. Remove the hardcoded fallback key — if `safeStorage` is unavailable, warn the user and store unencrypted with a clear disclaimer. |
| 6 | Add Tauri invoke/listen key allowlist for tauri-plugin-store | `src-tauri/src/main.rs` | `store-get`, `store-set`, `store-delete` command handlers accept arbitrary keys. Add an allowlist of permitted keys the webview can access. |
| 7 | Add origin validation to permission handler | `src-tauri/src/commands/window.rs` | Permission requests for camera/mic/notifications are granted for ALL origins. Restrict to the app's own origin only. |

### 1.2 Web Security Fixes

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 8 | Move Sentry DSN to environment variable | `src/instrumentation-client.ts` | DSN is hardcoded in source. Move to `NEXT_PUBLIC_SENTRY_DSN` env var. |
| 9 | Disable `sendDefaultPii` | `src/instrumentation-client.ts` | `sendDefaultPii: true` sends user IPs and cookies to Sentry. Set to `false`. |
| 10 | Reduce `tracesSampleRate` to 0.1 | `src/instrumentation-client.ts` | 100% trace sampling in production is expensive and sends all user data. Reduce to 10%. |
| 11 | ~~Move CSRF token out of query strings~~ | `src/features/watch/api.ts` | **SKIPPED** — `sendBeacon` cannot attach custom headers. The query param `?_csrf=` is the correct and only way to send CSRF tokens with `sendBeacon`. Backend already validates both `x-csrf-token` header and `_csrf` query param. |
| 12 | Move Vercel org/project IDs to GitHub secrets | `.github/workflows/deploy.yml`, `release.yml` | Currently hardcoded as plaintext env vars in workflow files. |
| 13 | Validate image proxy URLs server-side | `src/lib/utils.ts` | `getOptimizedImageUrl` passes arbitrary URLs to `/api/stream/image`. Ensure the server-side handler validates decoded URLs against an allowlist of CDN domains. |
| 14 | Restrict `images.remotePatterns` hostname | `next.config.ts` | Wildcard `hostname: '**'` allows image optimization from any domain. Replace with explicit CDN hostnames when known. |

---

## Phase 2: CI/CD & Testing Foundation (Weeks 4–6)

> **Priority:** 🟠 HIGH — Without CI tests, every subsequent phase risks regressions.

### 2.1 Add Tests to CI Pipelines

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 1 | Add `pnpm test` step to deploy workflow | `.github/workflows/deploy.yml` | Currently only runs `pnpm check` and `pnpm type-check`. Add `pnpm test` before the build step. Fail the deploy if tests fail. |
| 2 | Add `pnpm test` step to release workflow | `.github/workflows/release.yml` | Same gap — no tests run before release. |
| 3 | Add lint + type-check to desktop build | `.github/workflows/build-desktop.yml` | Goes straight from `pnpm install` to Tauri build pipeline with zero validation. Add `pnpm check` and `pnpm type-check`. |
| 4 | Add pnpm store caching to web workflows | `.github/workflows/deploy.yml`, `release.yml` | `build-desktop.yml` caches the pnpm store but web workflows don't. Add `actions/cache` for `~/.pnpm-store`. |
| 5 | Replace `sed` secret injection with env vars | `.github/workflows/build-desktop.yml` | Using `sed` to inject secrets into source files is fragile. Use build-time environment variables or a config template instead. |

### 2.2 Staging & Preview Deployments

| # | Task | Details |
|---|------|---------|
| 6 | Enable Vercel preview deployments for PRs | The `deploy.yml` has a `preview` option but always deploys with `--prod`. Configure automatic preview deployments on PR creation. |
| 7 | Add post-deploy smoke test | After each deployment (preview or prod), run a curl health check or a minimal Playwright smoke test against the deployed URL. |
| 8 | Add E2E tests to CI (nightly) | E2E tests (`tests/e2e/`) exist but never run in CI. Add a nightly scheduled workflow that runs `pnpm test:e2e` against the staging environment. |

### 2.3 Improve Test Coverage

| # | Task | Details |
|---|------|---------|
| 9 | Add error boundary tests | No tests exist for `error.tsx`, `global-error.tsx`, or `not-found.tsx`. Add tests verifying they render correctly and report to Sentry. |
| 10 | Add provider integration tests | `AuthProvider`, `SocketProvider`, and `ThemeProvider` need tests for error states, reconnection, and edge cases. |
| 11 | Add Tauri command tests | Zero test coverage for the Tauri layer. Add unit tests for Tauri command handlers, download manager state, and cipher module using mock-based testing. |

---

## Phase 3: Core Architecture Refactors (Weeks 7–12)

> **Priority:** 🟡 MEDIUM-HIGH — Reduces tech debt and makes all future work easier.

### 3.1 Unified Error Handling

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 1 | Create `ApiError` type guard | `src/lib/fetch.ts` | Replace all `err as ApiError` unsafe casts with a runtime type guard: `function isApiError(err: unknown): err is ApiError`. Currently 8+ hooks use unsafe casts that silently produce `undefined` fields. |
| 2 | Create `handleApiError()` utility | `src/lib/errors.ts` (new) | Extract the duplicated `try/catch → toast.error()` pattern into a shared utility. Every hook currently does its own error-to-toast mapping. |
| 3 | Add centralized error code mapper | `src/lib/errors.ts` (new) | `use-signup-form.ts` has 6+ `if (apiError?.code === ...)` branches. Create a `mapApiErrorToMessage(code: string): string` function. |
| 4 | Add React Error Boundaries per feature | `src/app/(protected)/(main)/layout.tsx` | Currently one error boundary wraps everything. A crash in watchlist takes down the navbar. Add error boundaries around: content-detail-modal, OfflineLibrary, watch-party sidebar, profile form. |

### 3.2 Unified Caching Layer

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 5 | Create shared `createTTLCache<T>()` utility | `src/lib/cache.ts` (new) | Three separate manual cache implementations exist in `watch/api.ts`, `search/api.ts`, and `profile/api.ts`. All implement the same pattern: Map + expiry timestamp + TTL. Extract into one shared utility. |
| 6 | Add cache invalidation on auth change | `src/lib/cache.ts` | When session expires or user logs out, all three caches serve stale data independently. Add a `clearAllCaches()` function called from the auth provider on logout. |
| 7 | Evaluate TanStack Query adoption | All API hooks | The manual caching, deduplication, and retry logic could be replaced by TanStack Query. Evaluate migration cost vs. benefit. If adopted, migrate one feature (e.g., watchlist) as a pilot. |

### 3.3 State Management Consolidation

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 8 | Document state management decision tree | `docs/STATE_MANAGEMENT.md` | Currently Zustand, React Context, and local state are used inconsistently. Define clear rules: Zustand for global client state, Context for dependency injection (socket, theme), local state for form/UI state. |
| 9 | Remove redundant auth Context wrapper | `src/providers/auth-provider.tsx`, `src/store/use-auth-store.ts` | Auth state exists in both Zustand store AND Context provider. Pick one source of truth. Recommendation: keep Zustand store, make `useAuth()` a thin wrapper that reads from the store. |
| 10 | Consolidate `isDesktopApp` checks | Multiple files | Direct `desktopBridge` checks are scattered across 6+ files. The `useDesktopApp` hook exists but isn't used consistently. Enforce using the hook everywhere. |

### 3.4 Extract Shared Patterns

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 11 | Extract shared `useOtpVerification` hook | `src/features/auth/hooks/` (new) | OTP countdown timer, resend logic, and submit handler are duplicated between `use-login-form.ts` and `use-signup-form.ts` (~60 lines each, nearly identical). |
| 12 | Extract shared `OtpStep` component | `src/features/auth/components/` (new) | The OTP UI JSX is duplicated between `login-form.tsx` and `signup-form.tsx` (~40 lines each, identical). |
| 13 | Extract shared `useAbortController` hook | `src/hooks/` (new) | `use-livestreams.ts` and `use-watchlist.ts` both implement the same abort-on-unmount pattern. Extract and reuse in auth, watch, and search hooks that currently lack cancellation. |
| 14 | Deduplicate `checkUsername` API function | `src/features/auth/api.ts`, `src/features/profile/api.ts` | Two separate implementations hitting the same endpoint. Extract to a shared utility in `src/lib/` or a shared `user` module. |
| 15 | Extract shared form error clearing logic | Auth hooks | Both `use-login-form.ts` and `use-signup-form.ts` have identical `handleChange` functions (~8 lines each). Extract to a shared `useFormErrorClearing` hook. |

### 3.5 API Layer Improvements

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 16 | Add retry logic to `apiFetch` | `src/lib/fetch.ts` | No retry logic exists except for S2 cold starts. Add configurable retry with exponential backoff for 5xx and network errors (1-2 retries, 1s/2s delays). |
| 17 | Add request cancellation to auth hooks | `src/features/auth/hooks/` | Login and signup hooks fire concurrent requests on rapid submission. Add `AbortController` using the new shared hook. |
| 18 | Add request cancellation to search hooks | `src/features/search/hooks/` | Suggestion fetches use `setTimeout` debouncing but no `AbortController`. Stale responses can arrive after newer ones. |
| 19 | Add request cancellation to watch hooks | `src/features/watch/hooks/` | `refetchStream` has no abort controller. Rapid episode switching fires overlapping requests. |
| 20 | Fix `apiFetch` timeout vs. user abort conflation | `src/lib/fetch.ts` | Internal `AbortController` conflates timeout aborts with user-initiated cancellation. Both throw "Request timed out". User's abort signal should propagate the original `AbortError`. |

---

## Phase 4: Tauri App Overhaul (Weeks 13–20)

> **Priority:** 🟡 MEDIUM-HIGH — The Tauri layer has the most accumulated tech debt.

### 4.1 Migrate to TypeScript

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 1 | Set up TypeScript for Tauri commands | `src-tauri/src/commands/` | All Tauri command files need proper type safety. Ensure typed command signatures and response types are defined in `src/lib/tauri-bridge.ts`. |
| 2 | Migrate `main.rs` types | `src-tauri/src/main.rs` | Start with the entry point. Define typed Tauri invoke/listen channel names and handler signatures in the bridge. |
| 3 | Migrate all modules to typed commands | `src-tauri/src/commands/*.rs` | Define interfaces for download state, bridge config, window options, etc. in `src/lib/tauri-bridge.ts`. |
| 4 | Migrate platform files to typed commands | `src-tauri/src/platform/*.rs` | Convert platform-specific files. |
| 5 | Add typed Tauri invoke/listen channel definitions | `src/lib/tauri-bridge.ts` | Create a shared type file defining all Tauri invoke/listen channel names and their payload types. Use in both Rust backend and frontend bridge. |

### 4.2 Architecture Cleanup

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 6 | Split monolithic `main.rs` | `src-tauri/src/main.rs` | Extract into: `commands/ipc_handlers.rs` (command registration), `commands/cors.rs` (CORS overrides), `commands/media_controls.rs` (Windows taskbar, media keys), `commands/lifecycle.rs` (app events, power monitor). Target: `main.rs` under 100 lines. |
| 7 | Separate protocol handler from download manager | `src-tauri/src/commands/download-manager.rs` | `setupOfflineMediaProtocol` and `setupDownloadManager` are separate concerns sharing a vault path. Extract protocol handler to its own module. |
| 8 | Consolidate tauri-plugin-store instances | `src-tauri/src/commands/state.rs`, `src-tauri/src/main.rs` | Two separate `tauri-plugin-store` instances write to the same JSON file. Create a single shared store instance exported from a `store.rs` module. |
| 9 | Merge duplicate platform files | `src-tauri/src/platform/windows.rs`, `linux.rs` | These files are nearly identical. Extract shared logic into a `platform/common.rs` and keep only platform-specific overrides. |
| 10 | Extract version reading utility | Multiple files | `getAsarVersion()` / package.json version reading is duplicated in 3 places. Create a shared `getAppVersion()` utility. |

### 4.3 Stability & Memory Fixes

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 11 | Fix `discord.js` missing `destroy()` method | `src-tauri/src/commands/discord.rs` | `main.rs` calls `discordLogic.destroy()` on quit, but the method doesn't exist. RPC connection is never cleaned up, leaving Discord presence stuck. |
| 12 | Add `isDestroyed()` checks before event sends | `src-tauri/src/commands/state.rs`, `download-manager.rs` | `sendSafeProgress` and download progress handlers don't check if the webview is destroyed before calling `.emit()`. Causes unhandled exceptions when window closes during downloads. |
| 13 | Fix redirect loop in `downloadFile` | `src-tauri/src/commands/network.rs` | Recursive redirect following has no depth limit. Add a max redirect count (5). |
| 14 | Clear `capturedKeys` Map on bridge stop | `src-tauri/src/commands/live-bridge.rs` | The Map is populated but never cleared except on new `start-live-bridge` calls. Add cleanup on `stop-live-bridge`. |
| 15 | Fix stale `_lastEventSender` reference | `src-tauri/src/commands/live-bridge.rs` | Holds a reference to a `WebContents` object that prevents GC after window destruction. Null out on window close. |
| 16 | Clean up `activeDownloadsMap` on completion | `src-tauri/src/commands/state.rs` | Download entries including HTTP request objects are only cleaned up on cancel, not on successful completion. |
| 17 | Debounce `syncDbState` writes | `src-tauri/src/commands/state.rs` | Currently writes the entire download database to disk on every progress chunk. Debounce to every 2-5 seconds. |
| 18 | Add disk space check before downloads | `src-tauri/src/commands/download-manager.rs` | Downloads fail mid-way if disk is full. Check available space before starting and warn the user. |

### 4.4 Missing Tauri Features

| # | Task | Details |
|---|------|---------|
| 19 | Add "Check for Updates" menu item | Add to tray menu and macOS app menu. Show release notes when an update is available. |
| 20 | Add update failure UI | Currently if both native and ASAR updaters fail, the user sees "Starting Watch Rudra..." forever. Show a clear error with retry option. |
| 21 | Add Sentry to webview process | `src-tauri/src/main.rs` | Sentry is initialized for Rust backend only. Webview JS errors aren't captured. |
| 22 | Fix Windows taskbar thumbnail buttons | `src-tauri/src/main.rs` | Buttons use empty icons — no visible icons. Create proper icon assets. |
| 23 | Process Jump List arguments | `src-tauri/src/main.rs` | `--open-downloads` and `--play-pause` args are registered in Jump List but never processed on app launch. |
| 24 | Add Windows download progress bar | Use Tauri webview window `set_progress_bar()` to show download progress in the Windows taskbar. |
| 25 | Defer macOS permission requests | `src-tauri/src/platform/macos.rs` | Camera/mic permissions are requested at startup. Defer to when the feature is actually needed (livestream, watch party). |
| 26 | Optimize racer window memory | `src-tauri/src/commands/live-bridge.rs` | 6 concurrent hidden Tauri webview windows consume ~600MB. Extract cookies from the winning window and destroy it, keeping only the proxy server. |
| 27 | Add `backgroundThrottling` toggle | `src-tauri/src/commands/window.rs` | Currently always `false`. Enable throttling when not playing media to save CPU. |

---

## Phase 5: UI/UX & Accessibility (Weeks 21–28)

> **Priority:** 🟡 MEDIUM — Improves usability for all users, required for WCAG compliance.

### 5.1 Critical Accessibility Fixes

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 1 | Replace custom `AlertDialog` with Radix primitive | `src/components/ui/alert-dialog.tsx` | Current implementation is missing: `role="alertdialog"`, `aria-modal="true"`, focus trapping, `aria-labelledby`/`aria-describedby`, proper Escape key handling. Radix `AlertDialog` (already a dependency) provides all of this. |
| 2 | Add `aria-invalid` and `aria-describedby` to `Input` | `src/components/ui/input.tsx` | When `error` is provided, screen readers don't know the input is invalid. Add `aria-invalid={!!error}` and link error message via `aria-describedby`. |
| 3 | Remove global scrollbar hiding | `src/app/globals.css` | `html, body, * { scrollbar-width: none; }` hides ALL scrollbars. This is a significant accessibility barrier. Replace with targeted `.no-scrollbar` class only where needed (e.g., horizontal carousels). |
| 4 | Remove global text selection disabling | `src/hooks/useDevToolsProtection.tsx` | `user-select: none` on the entire page prevents assistive technology users from selecting text. Remove this or limit to specific elements. |
| 5 | Add `aria-hidden="true"` to skeleton components | `src/components/ui/skeletons.tsx` | Screen readers attempt to read empty skeleton divs. |
| 6 | Add focus trap to content-detail-modal | `src/features/search/components/content-detail-modal.tsx` | Modal has `role="dialog"` but no focus trap. Users can Tab into background content. |
| 7 | Add `aria-live` regions for form errors | `src/features/auth/components/login-form.tsx`, `signup-form.tsx` | Error messages are only shown via ephemeral toasts. Add inline `aria-live="polite"` error regions. |
| 8 | Add `aria-pressed`/`aria-selected` to download quality buttons | `src/features/search/components/download-menu.tsx` | Quality options have no programmatic selected state. "Saved" status is communicated only via color. |
| 9 | Fix `OfflineLibrary` keyboard handling | `src/features/downloads/components/OfflineLibrary.tsx` | Uses `role="button"` on `div` elements. `onKeyDown` doesn't prevent default scroll on Space. Replace with `<button>` elements. |
| 10 | Add visible focus indicators to Dialog close button | `src/components/ui/dialog.tsx` | Close button has no explicit `focus-visible` ring style. |

### 5.2 UI Improvements

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 11 | Fix theme FOUC (Flash of Unstyled Content) | `src/providers/theme-provider.tsx` | Theme initializes as `'light'` then corrects in `useEffect`. Add a blocking `<script>` in `<head>` to set the `dark` class before React hydrates, or adopt `next-themes`. |
| 12 | Memoize `ThemeProvider` context value | `src/providers/theme-provider.tsx` | `{ theme, setTheme }` creates a new object every render, causing unnecessary re-renders of the entire tree. Wrap in `useMemo`. |
| 13 | Fix CSS variable naming inconsistency | `src/app/globals.css` | `--neo-yellow` becomes purple (`#a855f7`) in dark mode. Rename to `--neo-accent` or use semantic naming. |
| 14 | Remove dead `.light` CSS class | `src/app/globals.css` | The `.light` class block is defined but never applied to the DOM. Light theme uses `:root` defaults. Remove dead CSS. |
| 15 | Extract theme variants to separate files | `src/app/globals.css` | 4 watch-party theme variants (~120 lines) should be in separate files loaded conditionally to reduce initial CSS payload. |
| 16 | Reduce `!important` usage in PiP styles | `src/app/globals.css` | 20+ `!important` declarations in `.is-desktop-pip`. Use higher-specificity selectors or CSS layers instead. |
| 17 | Standardize border widths | Multiple components | Mix of `border-2`, `border-[3px]`, `border-[4px]`, `border-4`. Define 1-2 standard neo-brutalist border widths. |
| 18 | Add password visibility toggle | `src/features/auth/components/login-form.tsx`, `signup-form.tsx` | Password fields have no show/hide toggle. Important for mobile UX. |
| 19 | Show password strength meter in signup | `src/features/auth/components/signup-form.tsx` | `getPasswordStrength()` exists in `schema.ts` but the UI never displays it. Wire it up. |
| 20 | Add skeleton loading to content-detail-modal | `src/features/search/components/content-detail-modal.tsx` | Currently shows a full-screen spinner. Skeleton screens feel faster. |
| 21 | Remove dead `DevToolsProtectionProvider` | `src/providers/devtools-protection-provider.tsx` | Entire `useEffect` body is commented out. Component renders `<>{children}</>` for zero benefit. Remove it. |

---

## Phase 6: Performance & PWA (Weeks 29–34)

> **Priority:** 🟢 MEDIUM — Improves load times, offline experience, and perceived speed.

### 6.1 React Performance

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 1 | Add `React.memo` to heavy child components | `content-detail-modal.tsx` children | The entire modal re-renders when any state changes. Memoize `EpisodeList`, `SeasonSelector`, `ContentActions`. |
| 2 | Add list virtualization for downloads | `src/features/downloads/components/OfflineLibrary.tsx` | The download list re-renders entirely on every progress update. Add virtualization (e.g., `react-window`) for long lists. |
| 3 | Fix `useCallback` dependency cascades | `src/features/watch/hooks/use-watch-content.ts` | `refetchStream` has 8 dependencies. Any change cascades to `handleStreamExpired` and the initial fetch effect. Stabilize with refs for values that don't need to trigger re-creation. |
| 4 | Remove dynamic imports in signup form | `src/features/auth/hooks/use-signup-form.ts` | Dynamic `import('@/features/auth/api')` inside `useEffect` for username checking creates new module evaluation on every keystroke timer. Use static imports. |
| 5 | Fix double-fetching in search suggestions | `src/features/search/hooks/use-search-input.ts` | `fetchSuggestions` is called on focus without debouncing, while keystroke suggestions use 200ms debounce. Can cause duplicate requests. |
| 6 | Optimize auto-submit on blur | `src/features/profile/components/update-profile-form.tsx` | Form auto-submits on blur even when tabbing through fields without changes. Add a dirty-field check before triggering submit. |
| 7 | Lazy-load heavy components | Watch party, livestream, profile | Components like `EmojiPicker`, `Mermaid`, `ReactKonva` should be lazy-loaded with `React.lazy()` + Suspense since they're not needed on initial page load. |

### 6.2 PWA Improvements

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 8 | Add web app manifest | `src/app/layout.tsx`, `public/manifest.json` (new) | No `manifest.json` exists. PWA installability requires a manifest with `name`, `icons`, `start_url`, `display`, `theme_color`. |
| 9 | Create dedicated offline fallback page | `public/offline.html` (new), `src/app/sw.ts` | Currently offline navigation falls back to `/` which may show wrong content. Create a proper "You're offline" page with cached content links. |
| 10 | Add API response caching to service worker | `src/app/sw.ts` | Only static assets are cached. Add a `StaleWhileRevalidate` strategy for API responses (watchlist, profile, continue-watching) so the app is functional offline. |
| 11 | Enable navigation preload | `src/app/sw.ts` | `navigationPreload: false` means offline navigation relies entirely on cache. Enable it for faster online navigation. |
| 12 | Add SW update prompt | `src/app/serwist.ts` | Verify the service worker registration handles update prompts gracefully. Show a "New version available — refresh" toast when a new SW is waiting. |

### 6.3 Tauri Startup Performance

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 13 | Lazy-load Sentry in Tauri | `src-tauri/src/main.rs` | Sentry is loaded synchronously at startup. Defer to after splash is shown. |
| 14 | Remove `nodeIntegration` from splash | `src-tauri/src/commands/splash.rs` | Loading the full Node.js runtime into the splash renderer is unnecessary overhead for a simple progress display. |
| 15 | Defer context menu loading | `src-tauri/src/commands/window.rs` | Loaded via top-level async IIFE before app is ready. Defer to after window creation. |
| 16 | Reduce speed throttle timer creation | `src-tauri/src/commands/network.rs` | `setTimeout(() => res.resume(), waitTimeMs)` creates a new timer for every chunk. Batch or use a single recurring timer. |

---

## Phase 7: New Features (Weeks 35–42)

> **Priority:** 🔵 NORMAL — New functionality built on the improved foundation.

### 8.1 Offline & Network Resilience

| # | Task | Details |
|---|------|---------|
| 1 | Integrate `useNetworkStatus` across all features | `use-network-status.ts` exists but no feature uses it. Show "You're offline" inline messages when API calls would fail, instead of letting them fail silently. |
| 2 | Add form state persistence for signup | If user navigates away during multi-step signup (e.g., to check email for OTP), all form data is lost. Persist to `sessionStorage`. |
| 3 | Add optimistic UI rollback for watchlist | `use-watchlist.ts` removes items optimistically but has no rollback if the API call fails. Add rollback with error toast. |
| 4 | Add download queue management | Downloads can be paused/resumed individually but there's no queue priority, bandwidth limiting, or "download all episodes" batch action. |
| 5 | Add download integrity verification | No checksum validation after download completes. Add hash verification against server-provided checksums. |

### 8.2 Watch Experience

| # | Task | Details |
|---|------|---------|
| 6 | Add "Resume Last Watched" global shortcut | Watch progress is tracked but there's no quick-resume shortcut or notification on the home page. |
| 7 | Add connection quality indicator for watch party | `use-watch-party-client.ts` exposes `isConnected` but no latency/quality metric. Show a connection quality badge (good/fair/poor) based on RTM latency. |
| 8 | Replace brute-force sync with acknowledgment | When a new member joins a watch party, the host sends sync events 3 times with `setTimeout(500/1000/2000)`. Replace with an ack-based protocol: send once, resend only if no ack received. |
| 9 | Add keyboard shortcuts for player controls | Volume, seek, fullscreen, PiP — add keyboard shortcuts with a discoverable shortcut overlay (press `?` to show). |

### 8.3 Tauri Enhancements

| # | Task | Details |
|---|------|---------|
| 10 | Add Discord Rich Presence join/spectate buttons | Support Watch Party invites via Discord "Join" button using Rich Presence party features. |
| 11 | Add dynamic Discord presence images | Show content poster/thumbnail as the large image in Discord Rich Presence based on what's being watched. |
| 12 | Add Windows toast notifications | Replace generic Tauri notifications with native Windows toast notifications with Action Center support. |
| 13 | Add Linux XDG integration | Improve `.desktop` file generation and XDG compliance for better Linux DE integration. |
| 14 | Add macOS Touch Bar enhancements | Currently only Play/Pause and Toggle Mic. Add track info, seek bar, volume control. |
| 15 | Add configurable download location | All platforms use `app.getPath('userData')/OfflineVault`. Let users choose a custom download directory. |

### 8.4 Provider & Lib Improvements

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 16 | Fix `storage-cache.ts` SSR side effects | `src/lib/storage-cache.ts` | Global event listeners registered at module import time. Wrap in an `init()` function called from a client-side provider. |
| 17 | Fix `linkify.ts` global regex bug | `src/lib/linkify.ts` | `URL_REGEX` with `g` flag + `.test()` mutates `lastIndex`, causing alternating calls to return incorrect results. Use a non-global regex for `containsLinks()`. |
| 18 | Make `env.ts` fail gracefully | `src/lib/env.ts` | Currently throws at import time if any env var is missing, crashing the entire app. Return typed errors instead. |
| 19 | Fix `ServerProvider` setState-during-render | `src/providers/server-provider.tsx` | Uses the fragile "setState during render" pattern. Replace with a `useEffect`. |
| 20 | Remove dead `_registerForceLogout` from SocketProvider | `src/providers/socket-provider.tsx` | Callback defined but never exposed or used. Dead code. |

---

## Phase 8: Documentation & Polish (Weeks 43–48)

> **Priority:** 🔵 NORMAL — Ensures long-term maintainability.

### 9.1 Documentation Updates

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 1 | Update `TESTING.md` to reflect CI reality | `docs/TESTING.md` | Currently describes test commands but doesn't mention that CI pipelines skip tests. After Phase 2, update to document the full CI test pipeline. |
| 2 | Complete `STATE_MANAGEMENT.md` | `docs/STATE_MANAGEMENT.md` | Referenced in README but may be incomplete. Document the Zustand vs Context vs local state decision tree established in Phase 3. |
| 3 | Add status labels to `OFFLINE_DOWNLOADS_ROADMAP.md` | `docs/OFFLINE_DOWNLOADS_ROADMAP.md` | Mixes implemented features with future plans. Add `[DONE]` / `[IN PROGRESS]` / `[PLANNED]` labels. |
| 4 | Add missing env vars to `SETUP.md` | `docs/SETUP.md` | Missing `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and other env vars referenced in code but not in the setup guide. |
| 5 | Fix `CONTRIBUTING.md` rule references | `docs/CONTRIBUTING.md` | References "rule 5.1" and "rule 5.4" from an internal style guide that isn't included. Either include the guide or remove the references. |
| 6 | Split `DESKTOP.md` into sub-documents | `docs/DESKTOP.md` | At ~200 lines, consider splitting into: `DESKTOP_ARCHITECTURE.md`, `DESKTOP_OFFLINE.md`, `DESKTOP_AUTO_UPDATE.md`, `DESKTOP_CI.md`. |
| 7 | Add API surface documentation | `docs/API_LAYER.md` | Document all backend endpoints used by the frontend, their request/response shapes, and error codes. |
| 8 | Add architecture decision records (ADRs) | `docs/adr/` (new) | Document key decisions: why Zustand over Redux, why manual caching over TanStack Query, why XOR cipher was chosen, etc. |

### 9.2 Code Cleanup

| # | Task | Details |
|---|------|---------|
| 9 | Remove `.DS_Store` files from repo | `.DS_Store` files exist in `src-tauri/` and `src/features/downloads/components/`. Add to `.gitignore` and remove from tracking. |
| 10 | Remove dead `_CardHeader` etc. from Card component | `src/components/ui/card.tsx` defines internal components with underscore prefixes that are never exported. Remove or export them. |
| 11 | Clean up `frontend.log` from repo | `frontend.log` is committed to the repo. Add to `.gitignore`. |
| 12 | Audit and pin dependency versions | `package.json` uses `^` ranges for all dependencies. Pin exact versions for production dependencies to prevent unexpected breaking changes. |
| 13 | Remove `v8-compile-cache` dependency | Listed as a production dependency but only useful for Node.js CLI tools, not Next.js apps. |
| 14 | Add `error.tsx` Sentry reporting | `src/app/error.tsx` silently swallows errors unlike `global-error.tsx` which reports to Sentry. Add Sentry reporting. |
| 15 | Fix root page blank screen | `src/app/page.tsx` renders `null` while `useRootPage()` redirects. Add a loading state or server-side redirect. |

---

## Summary: Effort Estimates

| Phase | Weeks | Items | Focus |
|-------|-------|-------|-------|
| 1. Critical Security | 1–3 | 14 | Tauri + web security vulnerabilities |
| 2. CI/CD & Testing | 4–6 | 11 | Pipeline reliability, test coverage |
| 3. Core Refactors | 7–12 | 20 | Error handling, caching, state, API layer |
| 4. Tauri Overhaul | 13–20 | 27 | TypeScript migration, architecture, stability |
| 5. UI/UX & A11y | 21–28 | 21 | Accessibility compliance, UI polish |
| 6. Performance & PWA | 29–34 | 16 | React perf, service worker, startup time |
| 7. New Features | 35–42 | 20 | Offline resilience, watch UX, Tauri features |
| 8. Docs & Polish | 43–48 | 15 | Documentation, code cleanup, dependency audit |
| **Total** | **48** | **144** | |

---

## How to Use This Roadmap

1. **Work phase by phase.** Each phase builds on the previous one.
2. **Items within a phase can be parallelized** across team members.
3. **Track progress** by checking off items in each table.
4. **Re-evaluate priorities** at the start of each phase — new findings may shift items between phases.
5. **Each completed item should include:** code changes, tests, and documentation updates.

> This roadmap was generated from a full codebase analysis on April 19, 2026. File references are accurate as of that date.
