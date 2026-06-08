# Authentication Architecture

## Overview
Our authentication strategy is a heavily secured, token-based system managed centrally by the Node backend and orchestrated by the Next.js `proxy.ts` (server-side edge guard) plus the client-side `apiFetch()` 401 interceptor for seamless token refresh.

## Core Mechanisms

### 1. Proxy Gate (`src/proxy.ts`)
The server-side proxy (Next.js 16 convention — replaces the deprecated `middleware.ts`) runs before any route renders:
- Checks for `refreshToken` cookie presence (NOT `accessToken` alone, since it expires every 15 min).
- **Protected routes** → redirect to `/login?from={path}` if no session cookie exists.
- **Auth routes** (`/login`, `/signup`) → redirect to `/home` if session exists.
- Also handles locale detection (sets `NEXT_LOCALE` cookie from `Accept-Language` header).

### 2. Client-Side Token Refresh (`src/lib/fetch.ts`)
The `apiFetch()` wrapper intercepts 401 responses:
1. Calls `POST /api/auth/refresh` with the HttpOnly `refreshToken` cookie.
2. Backend rotates both tokens (new access + new refresh with fresh JTI).
3. Retries the original failed request transparently.
4. Only dispatches `auth:expired` (logout) if the refresh itself returns 401/403.
5. Network errors and 5xx do NOT trigger logout — the session may still be valid.

### 3. Proactive Token Refresh
- A timer fires 1 minute before `accessToken` expiry to refresh preemptively.
- On page visibility change / online event, `revalidateTokenOnResume()` checks if the token expired while JS timers were frozen (laptop sleep, tab background, Capacitor).

### 4. Turnstile / Bot Protection
Registration and login flows validate a Cloudflare Turnstile token to prevent automated credential stuffing.

### 5. CSRF Protection (Backend)
Double-submit cookie pattern:
- Backend sets a `csrfToken` cookie (readable by JS, `httpOnly: false`).
- Frontend sends it back in the `x-csrf-token` header on state-changing requests.
- Backend validates with timing-safe comparison.

## Route Protection Map

### Protected Routes (require `refreshToken` cookie)
| Path | Feature |
|------|---------|
| `/home` | Home feed |
| `/watch/:id` | Video player |
| `/live/:id` | Livestream viewer |
| `/clip/:id` | Clip viewer |
| `/games`, `/games/:slug` | Browser games |
| `/music`, `/music/*` | Music player (playlists, albums, artists, radio, podcasts) |
| `/manga`, `/manga/*` | Manga reader (chapters, titles) |
| `/watchlist` | User watchlist |
| `/profile`, `/profile/*` | User profile, security, preferences, devices |
| `/search` | Search |
| `/library` | Clips library |
| `/continue-watching` | Continue watching |
| `/downloads` | Offline downloads |
| `/ask-ai` | Voice AI assistant |

### Public Routes (no auth required)
| Path | Feature |
|------|---------|
| `/login` | Login page (redirects to `/home` if authenticated) |
| `/signup` | Registration page (redirects to `/home` if authenticated) |
| `/terms` | Terms of service |
| `/privacy` | Privacy policy |
| `/user/:id` | Public user profile |
| `/clip/share/:shareId` | Public clip share page |

### Guest Routes (no auth enforcement)
| Path | Feature |
|------|---------|
| `/watch-party/:id` | Watch party room (supports both authenticated users and guests) |

### Root Route (`/`)
Client-side redirect via `useRootPage()` hook — sends authenticated users to `/home`, unauthenticated to `/login`.

## Token Architecture

| Token | Storage | Lifetime | Purpose |
|-------|---------|----------|---------|
| `accessToken` | HttpOnly cookie | 15 minutes | Authenticates API requests |
| `refreshToken` | HttpOnly cookie | 1 year | Obtains new access tokens |
| `csrfToken` | JS-readable cookie | Session | CSRF double-submit validation |

### JWT Structure (Access Token)
```json
{
  "sub": "userId",
  "email": "user@example.com",
  "name": "User Name",
  "username": "username",
  "profilePhoto": "url",
  "sid": "sessionId",
  "iss": "nightwatch-backend",
  "aud": "nightwatch-frontend",
  "exp": "15 minutes from issue"
}
```

### JWT Structure (Refresh Token)
Same payload plus `jti` (unique token ID for replay detection).

## Directory Structure

### Frontend (`nightwatch/src/`)
- `proxy.ts` — Server-side route guard + locale detection
- `lib/fetch.ts` — `apiFetch()` with 401 interceptor, token refresh, proactive refresh timer
- `lib/auth.ts` — localStorage user cache helpers
- `lib/cookies.ts` — `getCookie()` helper for reading client-accessible cookies
- `providers/auth-provider.tsx` — `AuthProvider` component (session sync, socket connect, force logout handling)
- `store/use-auth-store.ts` — Zustand persisted auth state (user, login/logout actions)
- `features/auth/api.ts` — Login, register, verifyOtp, resendOtp API calls
- `features/auth/components/` — Login/Register form blocks (Radix UI + CVA)
- `features/auth/hooks/` — Auth-related hooks

### Backend (`nightwatch-backend/src/`)
- `modules/auth/auth.service.ts` — Core auth logic (OTP, tokens, sessions, password reset)
- `modules/auth/auth.controller.ts` — HTTP handlers (login, verify, refresh, logout, sessions)
- `modules/auth/auth.routes.ts` — Route definitions with middleware
- `middlewares/auth.middleware.ts` — JWT verification + session validation middleware
- `middlewares/optional-auth.middleware.ts` — For routes that work with or without auth
- `utils/jwt.ts` — JWT sign/verify utilities (HS256)
- `services/security.service.ts` — Brute force detection, OTP abuse tracking

## Desktop Browser Login

The desktop Electron app cannot use standard cookie-based auth because it loads a remote URL (`https://nightwatch.in`). Instead, it uses a **browser-delegated login flow** where the user authenticates in their default browser and the session is transferred back to the desktop app via a one-time code.

### Flow

1. **Desktop app** calls `POST /api/auth/desktop/initiate` → receives a `code` (UUIDv7).
2. Desktop opens the user's default browser to `https://nightwatch.in/login?desktopCode={code}`.
3. User logs in normally in the browser (email + OTP).
4. On OTP verification, the frontend passes `desktopCode` to `verifyOtp()`. The backend calls `desktopAuthorize(code, userId)`, linking the code to the authenticated user.
5. Browser shows a "You can return to the desktop app" confirmation page.
6. Meanwhile, the desktop app polls `POST /api/auth/desktop/exchange` with the code. Once authorized, it receives `accessToken` + `refreshToken` + `user` and stores them in the Electron persistent store.

### Frontend Implementation

- `desktopAuthInitiate()` — calls `/api/auth/desktop/initiate`, returns `{ code }`.
- `desktopAuthExchange(code)` — calls `/api/auth/desktop/exchange`, returns `LoginResponse`.
- `verifyOtp()` accepts an optional `desktopCode` parameter. When present, the backend links the code to the user instead of setting cookies.
- `LoginResponse` includes an optional `desktopAuthorized` boolean field.

### Security

- Codes are single-use (consumed atomically via Redis `GETDEL`).
- Codes expire after 5 minutes (Redis `EX 300`).
- The code transitions through states: `pending` → `authorized:{userId}` → deleted on exchange.

## QR Code Login

Allows scanning a QR code on an authenticated device to log into a new device.

### Flow
1. New device calls `POST /api/auth/qr/initiate` → receives `{ code, expiresIn: 300 }`.
2. Displays QR code encoding the `code`.
3. Authenticated device scans QR → calls `POST /api/auth/qr/authorize` with `{ code }`.
4. New device polls `POST /api/auth/qr/status` → once authorized, receives tokens + cookies.

## Multi-Device Sessions

The system supports concurrent sign-in across multiple devices (desktop, mobile, browser tabs). Each login creates an independent session.

### Redis Key Structure

| Key | Type | TTL | Purpose |
|-----|------|-----|---------|
| `session:{userId}:{sessionId}` | String (JSON) | 1 year | Session existence + device metadata |
| `sessions:{userId}` | Set | None | All active session IDs for bulk invalidation |
| `rt:{userId}:{sessionId}` | String | 1 year | Refresh token JTI for replay detection |
| `rt_grace:{userId}:{sessionId}` | String | 5 min | Grace JTI for concurrent refresh requests |

### Session Metadata

Each session stores `{ device: string, createdAt: number }` as JSON. The `device` field is the `User-Agent` header from the login request (or `"Desktop App"` for Electron auth).

### Session Management API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/sessions` | List all active sessions (device, createdAt, isCurrent) |
| DELETE | `/api/auth/sessions/:sessionId` | Revoke a specific session (cannot revoke current) |

### Bulk Invalidation

Password change and password reset call `invalidateAllSessions(userId)` which:
1. Reads all session IDs from the `sessions:{userId}` set.
2. Deletes all per-session keys (`session:*`, `rt:*`, `rt_grace:*`).
3. Deletes the set itself.

### Force Logout

When a session is revoked remotely, the backend emits a `force_logout` Socket.IO event to `session:{sessionId}` room. The frontend's `AuthProvider` listens for this and immediately disconnects + redirects.

### Legacy Migration

For backwards compatibility with pre-multi-session deployments, `validateSession` checks the new key format first, then falls back to the legacy `session:{userId}` → `sessionId` format. On legacy match, the session is auto-migrated to the new format atomically.

## Guest Authentication (Watch Party)

Watch party rooms allow unauthenticated guests with limited-scope tokens:
- Guest access token: 15 min, `role: "guest"`, scoped to a specific `roomId`.
- Guest refresh token: 4 hours.
- Revocation via `auth:guest_revoked:{userId}` Redis key (24h TTL).
- Guest tokens are accepted via `Authorization: Bearer` header or `?token=` query param (for `<video>` src attributes).

## Critical Implementation Rules

1. **Always use `apiFetch()` for API calls** — never raw `fetch()` to `/api/` endpoints. Raw fetch bypasses the 401 interceptor and causes logout cascades.
2. **The proxy only checks cookie presence** — it cannot validate JWT signatures (no access to the secret). Actual auth validation happens in the backend middleware.
3. **Network errors don't trigger logout** — only explicit 401/403 from the refresh endpoint means the session is truly dead.
4. **Refresh token deduplication** — multiple concurrent 401s share a single refresh call via `refreshPromise` singleton.
