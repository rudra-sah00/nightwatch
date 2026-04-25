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
