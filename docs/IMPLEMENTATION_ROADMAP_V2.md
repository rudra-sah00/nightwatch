# Nightwatch — Next Implementation Roadmap (v2)

> **Created:** April 19, 2026
> **Prerequisite:** Phases 1-8 of the original roadmap are complete.
> **Scope:** Feature completion, UX polish, accessibility compliance, code deduplication, and performance optimization.
> **Estimated Duration:** 6-9 months

---

## Table of Contents

1. [Phase A: Critical Fixes & Quick Wins (Weeks 1-3)](#phase-a-critical-fixes--quick-wins-weeks-1-3)
2. [Phase B: Player Overhaul (Weeks 4-8)](#phase-b-player-overhaul-weeks-4-8)
3. [Phase C: Search & Discovery (Weeks 9-13)](#phase-c-search--discovery-weeks-9-13)
4. [Phase D: Watch Party Hardening (Weeks 14-18)](#phase-d-watch-party-hardening-weeks-14-18)
5. [Phase E: Profile & Settings (Weeks 19-22)](#phase-e-profile--settings-weeks-19-22)
6. [Phase F: Livestream & Channels (Weeks 23-26)](#phase-f-livestream--channels-weeks-23-26)
7. [Phase G: Component Library & Deduplication (Weeks 27-30)](#phase-g-component-library--deduplication-weeks-27-30)
8. [Phase H: Performance & SSR (Weeks 31-34)](#phase-h-performance--ssr-weeks-31-34)
9. [Phase I: Electron Desktop Features (Weeks 35-38)](#phase-i-electron-desktop-features-weeks-35-38)

---

## Phase A: Critical Fixes & Quick Wins (Weeks 1-3)

> **Priority:** 🔴 HIGH — Bugs, security issues, and dead code found during analysis.

### A.1 Security & Safety

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 1 | Stop importing `package.json` in client bundle | `src/components/ui/creator-footer.tsx` | Imports entire `package.json` into the client bundle for the version number. Replace with a build-time constant or `process.env.npm_package_version`. |

### A.2 Remove Artificial Page Delays

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 4 | Remove 2500ms delay from home page | `src/app/(protected)/(main)/home/page.tsx` | `await new Promise(resolve => setTimeout(resolve, 2500))` — users wait 2.5s for no reason. Remove entirely. |
| 5 | Remove 1000ms delay from profile page | `src/app/(protected)/(main)/profile/page.tsx` | Same pattern. Remove. |
| 6 | Remove 1000ms delay from downloads page | `src/app/(protected)/(main)/downloads/page.tsx` | Same pattern. Remove. |
| 7 | Remove 1000ms delay from live page | `src/app/(protected)/(main)/live/page.tsx` | Same pattern. Remove. |
| 8 | Remove 1000ms delay from continue watching page | `src/app/(protected)/(main)/continue-watching/page.tsx` | Same pattern. Remove. |

### A.3 Dead Code Cleanup

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 9 | Remove unused imports in PlayPause.tsx | `src/features/watch/player/ui/controls/PlayPause.tsx` | `Lock`, `useMobileDetection`, `useMobileOrientation` are imported but never used. |
| 10 | Remove unused `_isHome` variable | `src/components/layout/navbar.tsx` | Declared but never used. |
| 11 | Remove unused `_total` in activity graph | `src/features/profile/components/activity-graph.tsx` | Computed but never displayed. |

### A.4 Wire Existing Shared Hooks

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 12 | Wire `useOtpVerification` into login form | `src/features/auth/hooks/use-login-form.ts` | Replace ~60 lines of duplicated OTP logic (countdown, resend, submit) with the shared hook created in Phase 3. |
| 13 | Wire `useOtpVerification` into signup form | `src/features/auth/hooks/use-signup-form.ts` | Same — replace ~60 lines of duplicated OTP logic. |

---

## Phase B: Player Overhaul (Weeks 4-8)

> **Priority:** 🔴 HIGH — The video player is the core product. Accessibility and UX gaps here affect every user.

### B.1 Player Keyboard Shortcuts

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 1 | Add player-level keyboard handler | `src/features/watch/player/ui/compound/PlayerRoot.tsx` | Add a `onKeyDown` handler on the player container for: `Space`/`K` = play/pause, `M` = mute, `F` = fullscreen, `←`/`→` = seek ±10s, `↑`/`↓` = volume ±10%, `J`/`L` = seek ±10s, `0-9` = seek to 0%-90%, `>` / `<` = playback speed. |
| 2 | Add keyboard shortcut overlay | `src/features/watch/player/ui/overlays/` (new) | Press `?` to show a translucent overlay listing all keyboard shortcuts. Auto-dismiss after 5s or on any key press. |
| 3 | Add `aria-label` to PlayPause button | `src/features/watch/player/ui/controls/PlayPause.tsx` | Missing — screen readers can't identify the most-used control. Add `aria-label={isPlaying ? 'Pause' : 'Play'}`. |
| 4 | Add `aria-label` to mute button | `src/features/watch/player/ui/controls/Volume.tsx` | Missing — add `aria-label={isMuted ? 'Unmute' : 'Mute'}`. |
| 5 | Fix volume slider keyboard accessibility | `src/features/watch/player/ui/controls/Volume.tsx` | Slider only appears on hover — keyboard users can never reach it. Make it also expand on focus (`:focus-within` on the container). |

### B.2 Live Player Improvements

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 6 | Add "Jump to Live Edge" button | `src/features/watch/components/WatchLivePlayer.tsx` | Critical for DVR-capable live players. When user scrubs back, show a "LIVE" button that seeks to the live edge. |
| 7 | Add `Player.LiveBadge` to live player | `src/features/watch/components/WatchLivePlayer.tsx` | The component exists in the Player namespace but is not used. Add it to indicate live status. |
| 8 | Add PiP button to player controls | `src/features/watch/components/WatchVODPlayer.tsx`, `WatchLivePlayer.tsx` | Electron already supports PiP via `set-pip` Electron invoke/listen. Add a PiP toggle button to the player controls bar. |

### B.3 Player Polish

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 9 | Add mobile back button `aria-label` | `WatchVODPlayer.tsx`, `WatchLivePlayer.tsx` | Mobile header back button is just an `ArrowLeft` icon with no accessible name. |
| 10 | Add `aria-hidden` to decorative loading poster | `WatchVODPlayer.tsx` | The blur overlay poster is decorative but announced by screen readers. |
| 11 | Add tooltip hints for keyboard shortcuts | All control buttons | Show "Fullscreen (F)", "Mute (M)", etc. on hover. |

---

## Phase C: Search & Discovery (Weeks 9-13)

> **Priority:** 🟠 MEDIUM-HIGH — The home page is just a search bar with no content discovery.

### C.1 Navbar Improvements

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 1 | Add active route highlighting to navbar | `src/components/layout/navbar.tsx` | Users can't tell which page they're on. Highlight the current route's nav link. |
| 2 | Add search icon/shortcut to navbar | `src/components/layout/navbar.tsx` | Users must navigate to `/home` to search. Add a search icon that opens a command palette or navigates to search. |
| 3 | Add skip-to-content link | `src/app/(protected)/(main)/layout.tsx` | Accessibility requirement — keyboard users need to skip past the navbar. |

### C.2 Home Page Content Discovery

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 4 | Add trending/popular content section | `src/features/search/components/HomeClient.tsx` | The home page is only a search bar. Add a "Trending Now" or "Popular" section below the search for users who don't have a specific query. |
| 5 | Add recent search history | `src/features/search/hooks/use-search-input.ts` | Store last 5-10 searches in localStorage. Show as suggestions when the search input is focused with no query. |
| 6 | Add `aria-label` to search input | `src/features/search/components/HomeClient.tsx` | Search input has placeholder but no explicit label for screen readers. |

### C.3 Search Results Improvements

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 7 | Add "no results" illustration | `src/features/search/components/SearchClient.tsx` | Currently shows "0 Films Found" with no helpful guidance. Add suggestions like "Try a different spelling" or "Browse trending content". |
| 8 | Add search result type filters | `src/features/search/components/SearchClient.tsx` | Filter by Movies / TV Shows / Anime. |
| 9 | Fix search Suspense fallback | `src/app/(protected)/(main)/search/page.tsx` | `Suspense fallback={null}` shows nothing during server-side search. Add a skeleton. |
| 10 | Add error state to search | `src/features/search/components/SearchClient.tsx` | API errors are silently swallowed — show a retry-able error state. |

---

## Phase D: Watch Party Hardening (Weeks 14-18)

> **Priority:** 🟡 MEDIUM — Watch party is the most complex feature. Stability and UX improvements.

### D.1 Connection Resilience

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 1 | Add reconnection UI | `src/features/watch-party/components/WatchPartyClient.tsx` | If socket/RTM disconnects mid-session, show a "Reconnecting..." overlay with retry button instead of infinite loading. |
| 2 | Add error boundary around dynamic imports | `src/features/watch-party/components/WatchPartyClient.tsx` | If `ActiveWatchParty` or `WatchPartyLobby` fail to load, show a fallback UI. |
| 3 | Replace brute-force sync with ack-based protocol | `src/features/watch-party/hooks/use-watch-party-client.ts` | Host sends sync 3 times with setTimeout(500/1000/2000). Replace with send-once + resend-if-no-ack. |
| 4 | Add pending state timeout in lobby | `src/features/watch-party/components/WatchPartyLobby.tsx` | User waits indefinitely for host approval. Add a 2-minute timeout with "Host hasn't responded" message. |

### D.2 Watch Party Accessibility

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 5 | Add `aria-live` regions for state transitions | `WatchPartyClient.tsx`, `WatchPartyLobby.tsx` | Loading → lobby → active transitions are not announced to screen readers. |
| 6 | Add landmark roles to active party layout | `src/features/watch-party/components/ActiveWatchParty.tsx` | Add `<aside>` for sidebar, `<main>` for video area. |
| 7 | Add `aria-hidden`/`inert` to collapsed sidebar | `src/features/watch-party/components/ActiveWatchParty.tsx` | Collapsed sidebar uses `w-0` but screen readers can still traverse it. |
| 8 | Add `aria-label` to permission switches | `src/features/watch-party/components/WatchPartySettings.tsx` | Switches have `role="switch"` but no label — screen readers say "switch, checked" without context. |

### D.3 Watch Party Features

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 9 | Add keyboard shortcut to toggle sidebar | `ActiveWatchParty.tsx` | Press `S` to show/hide the sidebar. |
| 10 | Add rollback on failed permission updates | `WatchPartySettings.tsx` | If `updatePartyPermissions` API fails, the optimistic update is never rolled back. |
| 11 | Clean up guest token on leave | `use-watch-party-client.ts` | `sessionStorage.getItem('guest_token')` is never cleaned up when leaving a party. |
| 12 | Fix movie-end timeout cleanup | `use-watch-party-client.ts` | The 3-second `setTimeout` before `leaveRoom()` isn't cleaned up if component unmounts during the delay. |

---

## Phase E: Profile & Settings (Weeks 19-22)

> **Priority:** 🟡 MEDIUM — UX polish and accessibility for the profile section.

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 1 | Add proper `<label>` elements to password fields | `src/features/profile/components/profile-overview.tsx` | Password inputs use `<span>` as visual labels, not associated via `htmlFor`/`id`. |
| 2 | Add password visibility toggle to profile | `src/features/profile/components/profile-overview.tsx` | Login/signup have it now, but the change-password form in profile doesn't. |
| 3 | Add `role="radiogroup"` to server selection | `src/features/profile/components/update-profile-form.tsx` | Server selection buttons lack radio semantics. |
| 4 | Add `role="radiogroup"` to preference buttons | `src/features/profile/components/app-preferences.tsx` | Concurrent downloads and speed limit button groups lack radio semantics. |
| 5 | Add "System" theme option | `src/features/profile/components/app-preferences.tsx` | Only light/dark — no "follow system preference" option. |
| 6 | Add activity graph text alternative | `src/features/profile/components/activity-graph.tsx` | The heatmap is purely visual — add a summary like "X hours watched this year" and `aria-label` on the grid. |
| 7 | Fix ghost input pattern in update-profile-form | `src/features/profile/components/update-profile-form.tsx` | The invisible-input-over-span pattern confuses screen readers. Use a single visible input with styling. |
| 8 | Remove duplicate mobile/desktop inputs | `src/features/profile/components/update-profile-form.tsx` | `name_mobile` and `username_mobile` duplicate inputs exist for responsive layout. Use a single responsive input. |

---

## Phase F: Livestream & Channels (Weeks 23-26)

> **Priority:** 🟡 MEDIUM — Stability and UX for live content.

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 1 | Add focus trap to LiveMatchModal | `src/features/livestream/components/LiveMatchModal.tsx` | Has `role="dialog"` but no focus trap or Escape key handler. |
| 2 | Add focus trap to content-detail-modal | `src/features/search/components/content-detail-modal.tsx` | Same issue — has dialog role but no focus trap. |
| 3 | Optimize LiveMatchCard modal rendering | `src/features/livestream/components/LiveMatchCard.tsx` | Each card renders its own hidden modal instance. Use a single shared modal at the list level. |
| 4 | Add `aria-live` for live score updates | `src/features/livestream/components/LiveMatchCard.tsx` | Scores update in real-time but changes aren't announced. |

---

## Phase G: Component Library & Deduplication (Weeks 27-30)

> **Priority:** 🟢 MEDIUM — Reduces maintenance burden and improves consistency.

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 1 | Replace custom AlertDialog with Radix | `src/components/ui/alert-dialog.tsx` | Custom implementation missing: `role="alertdialog"`, focus trap, `aria-labelledby`, auto-focus, focus restoration. Radix AlertDialog (already a dependency) handles all of this. API is already compatible. |
| 2 | Create shared FocusTrap utility | `src/components/ui/focus-trap.tsx` (new) | Multiple modals need focus trapping. Create a reusable `<FocusTrap>` wrapper or use `@radix-ui/react-focus-scope`. |
| 3 | Deduplicate content-detail-modal and offline variant | `src/features/search/components/content-detail-modal.tsx`, `src/features/downloads/components/offline-content-detail-modal.tsx` | ~80% identical code. Extract a shared base component with an `isOffline` prop. |
| 4 | Add `role="progressbar"` to download progress bars | `src/features/downloads/components/OfflineLibrary.tsx` | Progress bars lack ARIA attributes (`aria-valuenow`, `aria-valuemin`, `aria-valuemax`). |
| 5 | Replace `title` with `aria-label` on download action buttons | `src/features/downloads/components/OfflineLibrary.tsx` | `title` is not reliably announced by screen readers. |
| 6 | Extract `formatBytes` to shared utility | `src/features/downloads/components/OfflineLibrary.tsx` | Utility function should be in `src/lib/utils.ts`. |

---

## Phase H: Performance & SSR (Weeks 31-34)

> **Priority:** 🟢 MEDIUM — Leverage Next.js App Router capabilities.

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 1 | Add server-side data prefetching to home page | `src/app/(protected)/(main)/home/page.tsx` | Currently a thin server component that just renders a client component. Prefetch trending/popular content server-side. |
| 2 | Add server-side search prefetching | `src/app/(protected)/(main)/search/page.tsx` | Initial results are fetched server-side (good), but error handling silently swallows failures. Add proper error UI. |
| 3 | Convert main layout to server component | `src/app/(protected)/(main)/layout.tsx` | Entire layout is `'use client'`. The navbar and layout chrome could be a server component with client islands. |
| 4 | Fix whats-new page caching | `src/app/(public)/whats-new/page.tsx` | Uses `cache: 'force-cache'` — releases are stale until redeploy. Use `next: { revalidate: 3600 }` for hourly refresh. |
| 5 | Add loading skeletons to all page.tsx files | All page files | Most pages have `Suspense fallback={null}`. Add proper skeleton fallbacks. |
| 6 | Lazy-load heavy components | Watch party, livestream, profile | `EmojiPicker`, `Mermaid`, `ReactKonva`, `ActivityGraph` should use `React.lazy()` + Suspense. |

---

## Phase I: Electron Desktop Features (Weeks 35-38)

> **Priority:** 🔵 NORMAL — Desktop-specific enhancements.

| # | Task | File(s) | Details |
|---|------|---------|---------|
| 1 | Migrate Electron commands to TypeScript bridge | `src-electron/src/commands/*.js` → `src/lib/electron-bridge.ts` | All Electron command files need typed bridge definitions. Start with `main.js`, Electron invoke/listen type definitions, then modules. |
| 2 | Add "Check for Updates" menu item | `src-electron/src/commands/tray.js`, `src-electron/src/platform/macos.js` | No manual update check option. Add to tray menu and macOS app menu. |
| 3 | Add Windows taskbar download progress | `src-electron/src/commands/download-manager.js` | Use Electron webview window `set_progress_bar()` to show download progress in the Windows taskbar. |
| 4 | Fix Windows taskbar thumbnail icons | `src-electron/src/main.js` | Buttons use empty icons — no visible icons. Create proper icon assets. |
| 5 | Defer macOS permission requests | `src-electron/src/platform/macos.js` | Camera/mic permissions requested at startup. Defer to when the feature is actually needed. |
| 6 | Add configurable download location | `src-electron/src/commands/download-manager.js` | All platforms use `OfflineVault` in app data. Let users choose a custom directory. |
| 7 | Optimize live-bridge racer memory | `src-electron/src/commands/live-bridge.js` | 6 concurrent hidden Electron webview windows consume ~600MB. Extract cookies from winner and destroy it. |

---

## Summary

| Phase | Weeks | Items | Focus |
|-------|-------|-------|-------|
| A. Critical Fixes | 1–3 | 13 | Security, artificial delays, dead code, hook wiring |
| B. Player Overhaul | 4–8 | 11 | Keyboard shortcuts, live player, accessibility |
| C. Search & Discovery | 9–13 | 10 | Navbar, home page content, search UX |
| D. Watch Party | 14–18 | 12 | Connection resilience, accessibility, features |
| E. Profile & Settings | 19–22 | 8 | Accessibility, UX polish |
| F. Livestream | 23–26 | 6 | Focus traps, modal optimization, channels |
| G. Component Library | 27–30 | 6 | AlertDialog, deduplication, shared utilities |
| H. Performance & SSR | 31–34 | 6 | Server-side prefetching, lazy loading |
| I. Electron Desktop | 35–38 | 7 | TypeScript migration, native features |
| **Total** | **38** | **79** | |

---

## How to Use This Roadmap

1. **Phase A first** — these are bugs and quick wins that should be done immediately.
2. **Phases B-C next** — player and search are the core user experience.
3. **Phases D-F in parallel** — watch party, profile, and livestream can be worked on independently.
4. **Phases G-I last** — infrastructure and polish that builds on the earlier work.

> Generated from a full codebase analysis on April 19, 2026, after completing Phases 1-8 of the original roadmap.
