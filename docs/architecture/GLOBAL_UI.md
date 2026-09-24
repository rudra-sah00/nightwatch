# Global UI Shell, Hooks and Instrumentation

Everything that wraps or services the feature pages but is not owned by any single feature: the root layout provider stack, the app chrome (navbar, sidebars), shared hooks, the onboarding tour, error boundaries, the SEO surface, and client-side instrumentation.

**Source:** `src/app/layout.tsx`, `src/app/(protected)/(main)/layout.tsx`, `src/components/layout/`, `src/hooks/`, `src/components/ui/global-tour.tsx`, `src/components/ui/feature-error-boundary.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/instrumentation-client.ts`

---

## Root Layout Composition

`src/app/layout.tsx` is a Server Component. It resolves the locale via `getLocale()`, sets `<html lang dir>`, injects blocking `<head>` scripts, and mounts a single `<Suspense>` boundary around the provider tree. The mount order matters — each provider depends only on those above it:

| Order | Component | Why it is here |
|-------|-----------|----------------|
| 1 | `<IntlProvider>` | Translation strings must be available before any UI renders. |
| 2 | `<ElectronDragRegion>` | Sits outside the provider tree; renders the Electron title-bar drag region. |
| 3 | `<QueryProvider>` | TanStack Query client — wraps everything that fetches. |
| 4 | `<ThemeProvider>` | Dark/light class; consumed by every styled component below. |
| 5 | `<SocketProvider>` | Socket.IO singleton — friends, presence, voice calls, remote control. |
| 6 | `<AuthProvider>` | Auth state; depends on Query (token refresh) and Socket (identity). |
| 7 | Layout shell | `<ProgressBar>`, `<DiscordPresenceSync>`, `<MobileShell>`, `<OfflineIndicator>`, `<SplashScreen>`, `{children}`, `<Toaster>`, `<SwRegister>`, `<CookieConsent>` — in that order. |

The shell `<div>` applies safe-area insets and the Electron title-bar offset via CSS `env()` and a `--electron-titlebar-height` custom property.

### Blocking head scripts

Three inline scripts run before React hydrates:

1. **Dark-mode FOUC prevention** — reads `localStorage('neo-theme')` and adds `class="dark"` to `<html>`.
2. **Touch-UI detection** — `TOUCH_UI_INLINE_SCRIPT` from `src/platforms/mobile/touch-ui-script.ts` resolves pointer type so phones never flash desktop controls.
3. **Context-menu and clipboard suppression** — disables right-click and copy/cut/paste globally, except on elements carrying `data-allow-clipboard`.

### SEO metadata

The root layout exports `metadata` with Open Graph, Twitter Card, JSON-LD (`WebApplication` schema), and `hreflang` links for all 14 locales. `metadataBase` defaults to `NEXT_PUBLIC_APP_URL` (`https://nightwatch.in`).

---

## App Chrome

The navbar and sidebars live in the `(protected)/(main)` layout — routes outside that group (`/watch/[id]`, `/live/[id]`, `/clip/[id]`) render without app chrome.

### Navbar (`src/components/layout/navbar.tsx`)

Top bar with brand logo (left), page title (centre, mobile-only), and profile avatar (right). On desktop the logo is a text link to `/home`; on mobile it is an icon button. Long-pressing the logo opens the left sidebar; long-pressing the profile avatar opens the right sidebar (touch-only, via an inline `useLongPress` hook). The bar carries `data-electron-drag-region` so it doubles as a window drag surface on Electron and disables dragging when the music player is expanded.

The centre page title is populated by any route that mounts a `<PageTitle>` component (see Shared Hooks below). Clicking it navigates to the title's `href`, or scrolls `#main-content` to the top if already on that route.

### Left sidebar (`src/components/layout/left-sidebar.tsx`)

Two exports:

- **`LeftSidebar`** — mobile-only, an absolutely-positioned panel at `width: 75%` revealed when the main content pushes right. Contains the user profile header and primary navigation links: Home, Continue Watching, Live, Watchlist, Library, Music, Manga, Games, Ask AI, and a secondary Profile link.
- **`LeftSidebarDesktop`** — desktop-only, a collapsible `<aside>` that transitions between `w-80` (open, showing icon + label) and `w-11` (collapsed, showing a menu icon). Same link set, without the profile header.

### Right sidebar (`src/components/layout/right-sidebar.tsx`)

Displays the friend list with sections for pending requests, sent requests, online friends, offline friends, and blocked users. Includes an inline text filter and a "+ Add Friend" button that opens `FriendSearchSpotlight`. On mobile it renders inside `MobileSidebarShell` (slide-in drawer from the right). On desktop it is a collapsible aside, same `w-80`/`w-11` pattern as the left sidebar. Wrapped in `<FeatureErrorBoundary feature="Friends" silent>` in the main layout so a crash in the friend system does not take down the page.

### Sidebar open/close mechanics

The `(main)` layout exports a `useSidebar()` context with `leftOpen`, `rightOpen`, `setLeftOpen`, `setRightOpen`, and `sidebarsDisabled`. Desktop sidebars open on mouse hover within 50 px of the viewport edge and close when the cursor moves past 340 px. Mobile sidebars open on horizontal swipe gestures (≥ 60 px, within 40–80 px of the edge depending on native vs web). A touch-start guard suppresses mouse-move events that follow touch events. `sidebarsDisabled` is set by full-screen features (e.g. watch party) and includes a 300 ms cooldown before re-enabling hover detection.

### `sidebar/use-sidebar-animation.ts`

A shared hook that manages `visible` / `closing` booleans with a 200 ms close delay so CSS exit transitions can complete before the node unmounts.

### TV override

When `isTV()` detects an Android TV environment, the `(main)` layout replaces the entire sidebar/navbar shell with `TvRootLayout` (lazy-loaded). None of the above chrome renders on TV.

---

## Navigation Feedback

`src/components/layout/progress-bar.tsx` uses **NProgress** (spinner disabled, `minimum: 0.1`, `speed: 300`). It monkey-patches `history.pushState` and `history.replaceState` and listens for `<a>` clicks to start/stop the bar. Routes starting with `/watch/`, `/live/`, or `/clip/` are excluded — their transitions are handled by player loading states. The bar renders at `top: 77px + titlebar + safe-area` via an injected `<style>` tag, coloured `var(--neo-yellow)`.

---

## Shared Hooks

Hooks in `src/hooks/` that are not feature-specific. Push-notification and Firebase identity hooks are documented in [ANALYTICS.md](./ANALYTICS.md).

| Hook | Signature | Returns | Purpose |
|------|-----------|---------|---------|
| `useDebounce` | `useDebounce<T>(value: T, delay?: number)` | `T` | Debounces any value. Default delay 500 ms. Used by search inputs across features. |
| `useLongPress` | `useLongPress({ onLongPress, onClick?, delay? })` | `{ isPressing, handlers }` | Pointer-event-based press-and-hold (default 600 ms). Returns `onPointerDown/Up/Leave/Cancel/Click` handlers and an `isPressing` flag for CSS-driven hold feedback. Suppresses the click synthesised after a completed hold. |
| `useNetworkStatus` | `useNetworkStatus()` | `{ isOffline, mounted }` | Tracks `navigator.onLine` via `online`/`offline` events. Calls `setCrashNetworkState()` from `src/lib/crash-context.ts` to annotate error reports. `mounted` guards against SSR hydration mismatches. |
| `usePageTitle` | `usePageTitle()` | `{ title, href, setTitle }` | Context-based. `PageTitleProvider` lives in the `(main)` layout. Any route calls `setTitle(text, href?)` — the navbar reads `title` and `href` to render the mobile centre title. The `<PageTitle>` component in `src/components/layout/page-title.tsx` is a declarative shorthand that calls `setTitle` on mount and clears it on unmount. |

---

## Offline Handling

Three pieces cooperate:

1. **`useNetworkStatus`** (see above) — the reactive signal.
2. **`OfflineIndicator`** (`src/components/layout/OfflineIndicator.tsx`) — mounted in the root layout. Listens to `online`/`offline` events independently. Suppresses any visual overlay on player routes (`/watch/`, `/watch-party/`, `/live/`). Currently renders `null` — feedback is delivered only via `sonner` toasts.
3. **`OfflineState`** (`src/components/layout/OfflineState.tsx`) — a full-page fallback with a `WifiOff` icon and translated message. Rendered by the `(main)` layout in place of `{children}` when `useNetworkStatus().isOffline` is true, **except** on `/watch/`, `/watch-party/`, `/live/`, and `/downloads` routes, which bypass the blocker.

> `/downloads` has no page in `src/app/` — the path survives only in this bypass condition, in the `robots.ts` disallow list, and in the Electron drag-region title map (`src/platforms/desktop/ElectronDragRegion.tsx`). Treat it as a vestigial reference, not a live route.

The Capacitor `@capacitor/network` plugin is imported in `src/lib/mobile-bridge.ts` for native network detection, but `useNetworkStatus` itself relies on the browser `online`/`offline` events, not the Capacitor bridge.

---

## Onboarding Tour

`src/components/ui/global-tour.tsx` implements a two-phase product tour powered by **driver.js**.

### Trigger

Signup and Google sign-in redirect to `/home?tour=true`. The component is lazy-loaded (`dynamic`, `ssr: false`) in the `(main)` layout and renders nothing to the DOM.

### Phases

The tour cannot show everything on a single route, so it runs in two phases:

| Phase | Route | `?tour=` value | What it covers |
|-------|-------|----------------|----------------|
| `hub` | `/home` | `true` | Welcome overlay → hub grid → each destination tile (Live, Movies, Music, Manga, Ask AI, Games). |
| `chrome` | `/search` | `chrome` | Search input → sidebar → Continue Watching, Watchlist, Library → friends panel → profile. |

When the hub phase finishes, its last step's `onNextClick` calls `router.replace('/search?tour=chrome')` to hand over. The chrome phase waits up to 20 s (polling every 250 ms) for the hub gate (`[data-hub-screen]`) to clear before starting, and abandons the tour if it does not.

### Element targeting

Hub-phase steps use `data-tour` attributes, not `href` selectors, because the sidebar carries links to the same routes and precedes the hub in DOM order. `HubGrid` (`src/features/hub/components/HubGrid.tsx`) stamps `data-tour="hub-grid"` on the `<nav>` and `data-tour="hub-{id}"` on each tile `<a>`. Chrome-phase steps use standard CSS selectors (`input[name="q"]`, `a[href="/profile"]`, `aside`, `aside:last-of-type`).

### Platform adaptation

The chrome phase has separate step builders for mobile and desktop. The mobile variant opens/closes sidebars programmatically via `setLeftOpen`/`setRightOpen` from `useSidebar()` and explains long-press and swipe gestures. The desktop variant explains hover-to-reveal sidebars. Both share `onHighlightStarted` callbacks to open the correct sidebar before highlighting its children.

### Styling

driver.js popover colours are set dynamically based on the current theme (dark or light). The `onPopoverRender` callback applies `bg` and `borderColor` inline. Button labels and progress text are translated via the `common.tour` namespace.

### Cleanup

On destroy or close, the `tour` query param is removed via `router.replace`, and both sidebars are closed.

### Adding a tour step

To introduce a new step: add a `data-tour="hub-{id}"` attribute to the target element, then append a `DriveStep` entry in the appropriate builder function (`buildHubSteps`, `buildDesktopChromeSteps`, or `buildMobileChromeSteps`).

---

## Error Boundaries

### `FeatureErrorBoundary` (`src/components/ui/feature-error-boundary.tsx`)

A class component wrapping a named feature subtree. On error it:

1. Logs to the console with the feature name prefix.
2. Calls `setCrashFeature()` and `reportError()` (Firebase Crashlytics on native, analytics elsewhere).
3. Renders either nothing (`silent` prop), a custom `fallback`, or a default inline error card with a Retry button that re-mounts the subtree.

Used in ~12 files. The `(protected)` layout wraps Calls, Music, Music Player, Remote Control, and Hub. The `(main)` layout wraps the Friends sidebar. Feature pages wrap their own heavy subtrees.

### App Router error files

| File | Catches |
|------|---------|
| `src/app/error.tsx` | Unhandled errors in any route segment below the root layout. Shows a centered error card with a translated "Try Again" button that calls `reset()`. |
| `src/app/global-error.tsx` | Errors in the root layout itself (including providers). Renders a standalone `<html>` shell, reads locale from the `NEXT_LOCALE` cookie, and reports to analytics via `reportCatchError`. Uses `next/error` for the fallback UI. |
| `src/app/not-found.tsx` | 404 pages. Full-screen neo-brutalist treatment with Home and Back buttons and a translated scan hint. |

---

## Turnstile Captcha

`src/components/ui/captcha.tsx` wraps `@marsidev/react-turnstile`. Props:

```ts
interface CaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  ref?: React.Ref<CaptchaHandle>;  // { reset(): void }
  variant?: 'full' | 'bottom';
}
```

In development, `onVerify` is called immediately with `'dev-bypass-token'`. In test, a static placeholder renders. In production, the real widget uses the site key from `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (read via `src/lib/env.ts`).

---

## SEO Surface

### Sitemap (`src/app/sitemap.ts`)

Static routes: `/` (priority 1), `/continue` (0.8), `/terms` (0.3), `/privacy` (0.3). Dynamic routes: public clip share pages fetched from `/api/clips/public/sitemap` (authenticated with `SITEMAP_SECRET`), each at priority 0.5. Falls back to static-only if the API is unreachable.

### Robots (`src/app/robots.ts`)

Non-production environments (`NEXT_PUBLIC_APP_URL ≠ https://nightwatch.in`) disallow everything. Production allows `/` with disallows for `/api/`, `/_next/`, `/static/`, `/reset-password`, `/profile`, `/settings`, `/watch-party/`, `/games/`, `/downloads`, `/friends`. A second rule blocks 14 AI training crawlers (GPTBot, ChatGPT-User, Google-Extended, CCBot, anthropic-ai, Claude-Web, ClaudeBot, Omgilibot, Bytespider, PerplexityBot, Amazonbot, YouBot, Diffbot, Cohere-ai) from `/`.

---

## Instrumentation

### Server (`src/instrumentation.ts`)

Exports an empty `register()` — a placeholder for future server-side hooks.

### Client (`src/instrumentation-client.ts`)

Registers two global `window` listeners:

- **`unhandledrejection`** — catches promise rejections outside React's tree. Lazy-imports `reportError` from `src/lib/analytics.ts` and reports the message and stack.
- **`error`** — catches uncaught exceptions. Ignores errors without a `filename` (browser extensions, cross-origin scripts). Reports via the same `reportError` path.

These complement `FeatureErrorBoundary` (React render errors) and `global-error.tsx` (root layout crashes) to cover async handlers, `setTimeout`, and other non-React code paths.

---

## Splash Screen

`src/components/ui/splash-screen.tsx` renders a fixed `z-[200]` overlay with the "NIGHTWATCH" wordmark in a shimmer animation. Displays for 2 s, fades out over 500 ms, then unmounts. Mounted in the root layout to mask initial content loading.

---

## Language Switcher

`src/components/layout/language-switcher.tsx` is a full-screen dialog listing all 14 locales with native and English names. Selecting a locale writes to the `NEXT_LOCALE` cookie and `localStorage('preferred-locale')`, then calls `router.refresh()`. Accepts an optional custom trigger; defaults to a globe button showing the current locale's native name.

---

## Related Documentation

- [Architecture Overview](./OVERVIEW.md) — route groups, feature slicing, and platform shells.
- [UI & Styling Guidelines](./UI_GUIDELINES.md) — theme tokens, dark-mode palette, CVA variants.
- [State Management](./STATE_MANAGEMENT.md) — TanStack Query, Zustand, Context patterns.
- [Internationalization](./I18N.md) — 14 locales, 8 namespaces, cookie-based locale, RTL.
- [Analytics & Observability](./ANALYTICS.md) — Firebase Analytics, Crashlytics, push notifications, consent.
- [Mobile Application](../platforms/MOBILE.md) — Capacitor setup, native plugins, mobile bridge.
- [Smart TV](../platforms/SMART_TV.md) — Android TV spatial navigation and `TvRootLayout`.
