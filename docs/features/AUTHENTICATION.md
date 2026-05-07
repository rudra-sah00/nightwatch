# Authentication Architecture

## Overview
Our authentication strategy is a heavily secured, token-based system managed centrally by the Node backend and orchestrated strictly by the Next.js `middleware.ts` acting as the absolute gateway.

## Core Mechanisms
1. **Middleware Gates (`middleware.ts`)**
   - The primary file determining access control. It evaluates route patterns against valid request cookies.
   - Rejects unauthenticated traffic attempting to penetrate the `(protected)` or `(party)` Route Groups, routing them gracefully towards `/login`.
2. **Turnstile / Bot Protection**
   - Essential registration flows map directly to Cloudflare Turnstile token validation ensuring the backend endpoints remain immune to automated credential stuffing.
3. **Session Rehydration**
   - The token rotation strategy utilizes a 401 interceptor outlined powerfully inside ` STATE_MANAGEMENT.md` ensuring the user never experiences abrupt lockouts while viewing content.

## Directory Structure
`src/features/auth/`
- `components/`: Login/Register form blocks built dynamically with Radix UI + CVA.
- `hooks/`: `useAuth.ts` which exports the active current user context, replacing legacy global prop drlling.

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

## Multi-Device Sessions

The system supports concurrent sign-in across multiple devices (desktop, mobile, browser tabs). Each login creates an independent session.

### Redis Key Structure

| Key | Type | TTL | Purpose |
|-----|------|-----|---------|
| `session:{userId}:{sessionId}` | String (JSON) | 1 year | Session existence + device metadata |
| `sessions:{userId}` | Set | None | All active session IDs for bulk invalidation |
| `rt:{userId}:{sessionId}` | String | 1 year | Refresh token JTI for replay detection |
| `rt_grace:{userId}:{sessionId}` | String | 60s | Grace JTI for concurrent refresh requests |

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

### Legacy Migration

For backwards compatibility with pre-multi-session deployments, `validateSession` checks the new key format first, then falls back to the legacy `session:{userId}` → `sessionId` format. On legacy match, the session is auto-migrated to the new format atomically.
