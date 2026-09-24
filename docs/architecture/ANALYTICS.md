# Analytics, Crash Reporting, Consent and Push Notifications

Firebase powers three cross-cutting concerns — event analytics, crash reporting, and push notifications — with a single SDK on web/desktop and a pair of native Capacitor plugins on iOS/Android. An opt-in consent gate ensures nothing is tracked until the user accepts.

**Source:** `src/lib/analytics.ts`, `src/lib/analytics-events.ts`, `src/lib/analytics-consent.ts`, `src/lib/crash-context.ts`, `src/lib/firebase.ts`, `src/lib/device-id.ts`, `src/capacitor/firebase.ts`, `src/capacitor/push.ts`, `src/hooks/use-push-notifications.ts`, `src/hooks/use-firebase-identity.ts`, `src/components/layout/ScreenTracker.tsx`, `src/components/layout/FirebaseIdentity.tsx`, `src/components/layout/PushNotifications.tsx`, `src/components/layout/CookieConsent.tsx`, `public/firebase-messaging-sw.js`

## Platform Split

| Concern | Web / Desktop (Electron) | Native (Capacitor — iOS, Android) |
|---------|--------------------------|-----------------------------------|
| Analytics | Firebase JS SDK (`firebase/analytics` v12.18.0) via `logEvent` | `@capacitor-firebase/analytics` ^8.5.1 via `window.Capacitor.Plugins.FirebaseAnalytics` |
| Crash reporting | Synthetic — logged as `app_exception` / `app_log` analytics events | `@capacitor-firebase/crashlytics` ^8.5.1 via `window.Capacitor.Plugins.FirebaseCrashlytics` |
| Push notifications | FCM JS SDK (`firebase/messaging` v12.18.0) + service worker | `@capacitor/push-notifications` 8.1.2 via native bridge |

The runtime check is a single helper in `analytics.ts`:

```ts
function isNative(): boolean {
  return typeof window !== 'undefined'
    && !!window.Capacitor?.isNativePlatform?.();
}
```

Every public function in `analytics.ts` (`trackEvent`, `trackScreen`, `reportError`, `crashLog`, `setAnalyticsUser`, `setUserProperty`) branches on `isNative()`. The native path lazy-imports `src/capacitor/firebase.ts`; the web path lazy-imports `firebase/analytics` through `src/lib/firebase.ts`.

## When Analytics Is Disabled

`shouldTrack()` in `analytics.ts` returns `false` (and all `trackEvent`/`trackScreen`/`setUserProperty` calls become no-ops) when **any** of the following is true:

1. **SSR** — `typeof window === 'undefined'`.
2. **Development** — `process.env.NODE_ENV === 'development'`.
3. **Staging** — `process.env.NEXT_PUBLIC_APP_ENV === 'staging'`.
4. **No consent** — `getAnalyticsConsent()` returns `false` (see Consent section below).

Additionally, `getFirebaseAnalytics()` in `firebase.ts` returns `null` on SSR, when `NEXT_PUBLIC_APP_ENV === 'staging'`, when the Firebase config env vars are missing (`projectId` or `apiKey`), or when `isSupported()` returns `false` (e.g. Firefox private browsing).

Crash-reporting functions (`reportError`, `crashLog`) bypass the consent check — they always fire when on a client in production — but are still rate-limited (10 s cooldown per unique message prefix, max 50 tracked keys).

## Consent Gating

`analytics-consent.ts` implements an opt-in model:

- **Storage key:** `analytics_consent` in `localStorage`.
- **Default:** `false` — no analytics fires until the user explicitly accepts.
- `hasAnsweredConsent()` returns `true` if the key exists at all (even if `"false"`).
- `setAnalyticsConsent(enabled)` writes the key and, on native, also calls `FirebaseAnalytics.setEnabled(enabled)` to toggle the native SDK.

`CookieConsent.tsx` is mounted in the **root layout** (`src/app/layout.tsx`), outside any auth gate, so it appears for unauthenticated visitors too. It renders a bottom bar with Accept / Decline buttons; once answered, the banner never reappears.

## Mount Order

Three headless components handle the runtime plumbing. They are mounted in the **protected layout** (`src/app/(protected)/layout.tsx`), meaning they only activate for authenticated users:

1. `<PushNotifications />` — calls `usePushNotifications()`.
2. `<FirebaseIdentity />` — calls `useFirebaseIdentity()`.
3. `<ScreenTracker />` — tracks pathname changes.

`<CookieConsent />` is mounted separately in the root layout (`src/app/layout.tsx`).

## Screen Tracking

`ScreenTracker.tsx` subscribes to `usePathname()`. On every navigation it:

1. Strips the leading slash and locale prefix (e.g. `/en/home` → `home`).
2. Normalises dynamic segments to stable names — `/watch/abc123` → `watch_video`, `/music/album/xyz` → `music_album`, etc.
3. Falls back to replacing slashes with underscores for unmapped routes.
4. Calls `trackScreen(screenName)` (which fires `screen_view` on web or `setCurrentScreen` on native).
5. Calls `setCrashScreen(screenName)` to update the Crashlytics custom key `screen`.

A `useRef` deduplicates so the same pathname never fires twice in a row.

## User Identity

`useFirebaseIdentity()` (mounted via `<FirebaseIdentity />`):

- On first mount calls `setPlatformProperties()`, which sets user properties `platform` (`"web"` / `"desktop"` / `"mobile"`) and `app_version` from `NEXT_PUBLIC_APP_VERSION`.
- On first mount calls `setCrashAppVersion()`, setting the Crashlytics custom key `app_version` (native only).
- Whenever `userId` changes (from `useAuthStore`), calls `setAnalyticsUser(userId)` which sets both the Analytics user ID and, on native, the Crashlytics user ID.

### Crash Context (Native Only)

`crash-context.ts` writes custom keys to Crashlytics so every native crash report carries context:

| Key | Set by |
|-----|--------|
| `screen` | `ScreenTracker` on every navigation |
| `active_feature` | `FeatureErrorBoundary` or feature entry points |
| `network_state` | Network state change handlers (`online` / `offline` / `slow`) |
| `app_version` | `useFirebaseIdentity` on mount |

These calls are no-ops on web (the `isNative()` guard returns early).

## Event Catalogue

`analytics-events.ts` exports a single `AnalyticsEvents` const object. Every value is a string literal event name passed to `trackEvent`. The full catalogue:

| Domain | Events |
|--------|--------|
| Auth | `login_success`, `login_failure`, `signup_start`, `signup_complete`, `signup_failure`, `logout`, `password_reset_request` |
| Video | `video_play`, `video_pause`, `video_seek`, `video_skip`, `video_complete`, `video_buffer_start`, `video_buffer_end`, `video_error`, `video_quality_switch`, `video_fullscreen`, `video_subtitle_change`, `video_speed_change`, `video_episode_change`, `video_next_episode_auto`, `video_next_episode_cancel` |
| Livestream | `livestream_watch`, `livestream_watch_party`, `livestream_sport_filter`, `livestream_error` |
| Watch Party | `party_create`, `party_join`, `party_leave`, `party_media_connect`, `party_chat_send`, `party_emoji_reaction`, `party_soundboard`, `party_kick`, `party_invite_copy`, `party_sync_play`, `party_sync_pause`, `party_sync_seek`, `party_approve_member`, `party_reject_member` |
| Clips | `clip_record_start`, `clip_record_stop`, `clip_record_fail`, `clip_share`, `clip_play`, `clip_delete`, `clip_rename`, `clip_toggle_public` |
| Music | `music_search`, `music_play`, `music_pause`, `music_next`, `music_previous`, `music_track_complete`, `music_shuffle_toggle`, `music_repeat_change`, `music_queue_add`, `music_playlist_create`, `music_playlist_delete`, `music_add_to_playlist`, `music_remove_from_playlist`, `music_equalizer_change`, `music_crossfade_change`, `music_device_transfer`, `music_sleep_timer_set`, `music_sleep_timer_clear` |
| Music Discover | `discover_swipe_like`, `discover_swipe_dislike`, `discover_undo`, `discover_add_to_playlist`, `discover_preview_play`, `discover_session_start` |
| Friends & Calls | `friend_request_send`, `friend_request_accept`, `friend_request_reject`, `friend_remove`, `friend_block`, `call_start`, `call_accept`, `call_decline`, `call_end` |
| Watchlist | `watchlist_add`, `watchlist_remove` |
| Profile | `profile_update`, `password_change` |
| Search | `search`, `search_result_click`, `search_no_results` |
| Ask AI | `ask_ai_start`, `ask_ai_end`, `ask_ai_error` |
| Games | `game_play`, `game_end` |
| Manga | `manga_chapter_read`, `manga_favorite_add`, `manga_favorite_remove` |
| App | `notification_open`, `share_content` |
| Crash (web) | `app_exception`, `app_log` |

## Device ID

`device-id.ts` generates a UUID via `crypto.randomUUID()` and persists it in `localStorage` under the key `nightwatch:device-id`. It survives page reloads and app restarts but resets on reinstall or data clear.

The device ID is **not** used by analytics tracking itself. It is used by push-notification token registration (sent alongside the FCM token to `/api/notifications/register`) and by logout (to unregister the token via `/api/notifications/unregister`). The module also provides `getDeviceInfo()` (a human-readable string like `"Android - Samsung SM-S911B"` or `"Desktop App - macOS"`) used by `apiFetch` as a header.

## Push Notifications

### Web / Desktop Flow

`usePushNotifications()` (mounted inside the protected layout as `<PushNotifications />`) runs when `userId` changes:

1. Registers the service worker at `/firebase-messaging-sw.js`.
2. Calls `getFCMToken(vapidKey)` from `firebase.ts`, which requests `Notification.requestPermission()` then calls `getToken()` from `firebase/messaging`.
3. Stores the token in `sessionStorage` under `nightwatch:fcm-token`.
4. POSTs `{ token, platform: "web", deviceId, sessionId }` to **`/api/notifications/register`** via `registerPushToken`.
5. Subscribes to foreground messages via `onForegroundMessage()`, which shows a Sonner toast with a deep-link action. The `data.type` field routes `"dm"` notifications to `/home`; all others use `data.url`.

A `useRef` prevents duplicate registration when the component re-renders without `userId` changing.

### Native Flow (Capacitor)

When `isNativePlatform()` is true, the hook imports `src/capacitor/push.ts` instead:

1. Calls `PushNotifications.checkPermissions()` / `requestPermissions()` via the native bridge.
2. Registers `addListener('registration', ...)` to capture the native FCM token.
3. Sends `{ token, platform: "ios"|"android", deviceId, sessionId }` to **`/api/notifications/register`**.
4. Registers `addListener('pushNotificationActionPerformed', ...)` — on tap, tracks `notification_open` and navigates to `data.url` if present.
5. Calls `plugin.register()` to trigger the native registration.

### Background Service Worker

`public/firebase-messaging-sw.js` runs outside the main app context. It uses Firebase compat SDK v12.14.0 (`importScripts`) with a hardcoded Firebase config. On `messaging.onBackgroundMessage` it calls `self.registration.showNotification` with the payload title, body, and icon (defaulting to `/logo.png`). The `notificationclick` handler focuses an existing Nightwatch tab if one exists, or opens a new window, navigating to `data.url`.

The file must live at the public root (`/firebase-messaging-sw.js`) because FCM registers the service worker at that scope.

### Token Lifecycle

On logout, both `auth-provider.tsx` and `use-auth-store.ts` call `unregisterPushToken(deviceId)`, which POSTs to **`/api/notifications/unregister`** with `{ deviceId }` to remove the stale token from the backend.

## Adding a New Event

1. Add the event name to the `AnalyticsEvents` object in `src/lib/analytics-events.ts`.
2. At the call site, import both `AnalyticsEvents` and `trackEvent` from `@/lib/analytics` / `@/lib/analytics-events`.
3. Call `trackEvent(AnalyticsEvents.YOUR_EVENT, { ... })` with any relevant parameters.

All events flow through `shouldTrack()`, so they automatically respect consent, staging, and SSR guards.

## Related Documentation

- [Architecture Overview](./OVERVIEW.md) — route groups, feature slicing, the protected layout.
- [State Management](./STATE_MANAGEMENT.md) — Zustand (`useAuthStore`) used by identity and push hooks.
- [Mobile Application](../platforms/MOBILE.md) — Capacitor native plugins including push and Firebase.
- [Desktop Application](../platforms/DESKTOP.md) — Electron wrapper and Discord Rich Presence.
- [Setup & Local Development](../SETUP.md) — environment variables (`NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_APP_ENV`).
