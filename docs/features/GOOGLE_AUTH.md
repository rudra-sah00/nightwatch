# Google OAuth Integration

## Overview

Nightwatch supports "Sign in with Google" as an authentication method. Users can connect their Google account from the profile page, then use it to sign in on any platform.

**Rules:**
- One Google account per Nightwatch user (enforced by unique constraint on `google_id`)
- One Nightwatch account per Google account (prevents multi-linking)
- Google email doesn't need to match Nightwatch email
- Users can disconnect and reconnect a different Google account anytime

## Architecture

| Platform | Method | Flow |
|----------|--------|------|
| Web / Electron | OAuth 2.0 redirect | Redirect → Google consent → callback page → backend code exchange |
| iOS | Native (Google Sign-In SDK) | Device account picker → idToken → backend verification |
| Android | Native (Credential Manager) | Device account picker → idToken → backend verification |

The frontend detects native platforms via `window.Capacitor?.isNativePlatform?.()` and uses the appropriate flow.

## Frontend Implementation

### Key Files

- `src/features/auth/google-api.ts` — OAuth URL builder, native sign-in, API calls
- `src/features/auth/components/google-sign-in-button.tsx` — Standalone button component (unused, kept for reference)
- `src/features/auth/components/login-form.tsx` — Adaptive button (Google when fields empty, login when filled)
- `src/features/profile/components/google-account-section.tsx` — Connect/disconnect on profile page
- `src/app/(public)/auth/google/callback/page.tsx` — Handles OAuth redirect from Google

### Native Plugin

Uses `@capgo/capacitor-social-login` (v8.x) which supports:
- Swift Package Manager (required for iOS Capacitor 8+)
- Android Credential Manager
- Both iOS and Android from a single API

Configuration in `google-api.ts`:
```typescript
await SocialLogin.initialize({
  google: {
    webClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    iOSClientId: process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  },
});
```

### Android Setup

`MainActivity.java` must implement `ModifiedMainActivityForSocialLoginPlugin` and handle `onActivityResult` for the Google login intent.

## Backend Implementation

### Key Files

- `src/modules/auth/google-auth.service.ts` — Code exchange, idToken verification, login/connect/disconnect
- `src/modules/auth/google-auth.controller.ts` — HTTP handlers with cookie-based session creation
- `src/db/schema.ts` — `google_id` (unique) and `google_email` columns on users table
- `drizzle/0017_add_google_oauth.sql` — Migration SQL

### API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/google/login` | Public | Sign in with Google (code or idToken) |
| POST | `/api/user/google/connect` | Protected | Link Google to account |
| POST | `/api/user/google/disconnect` | Protected | Unlink Google from account |

### Token Verification

The backend accepts two formats:
- `{ code, redirectUri }` — Web redirect flow, exchanges code via Google's token endpoint
- `{ idToken }` — Native flow, verifies via `https://oauth2.googleapis.com/tokeninfo`

Audience validation ensures the idToken was issued for our client IDs (web or iOS).

## Environment Variables

### Frontend (GitHub Secrets → .env.production.local at build time)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Web OAuth client ID (also used as Android serverClientId) |
| `NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID` | iOS OAuth client ID |

### Backend (GitHub Secrets → .env on server)

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` | Web OAuth client ID (for code exchange) |
| `GOOGLE_CLIENT_SECRET` | Web OAuth client secret (for code exchange) |
| `GOOGLE_IOS_CLIENT_ID` | iOS client ID (for idToken audience validation) |

## Google Cloud Console

Project: `nightwatch-prod`

### OAuth 2.0 Clients

| Type | Client ID | Purpose |
|------|-----------|---------|
| Web | `99440023345-oojcjkc66bksspt27f1adpbq5lh02pg0` | Redirect flow + Android serverClientId |
| iOS | `99440023345-b4aomde426cgkhb4p4dukm6ccg4jgn9p` | Native iOS sign-in |
| Android | `99440023345-2bd9ppuhup0ct3oj09ehist0vv578qjp` | SHA-1 verification (not used in code) |

### Authorized Redirect URIs (Web client)

```
https://www.nightwatch.in/auth/google/callback
https://nightwatch.in/auth/google/callback
http://localhost:3000/auth/google/callback
```

## iOS Setup

- `GoogleService-Info.plist` must include `CLIENT_ID` and `REVERSED_CLIENT_ID`
- `REVERSED_CLIENT_ID` must be added as a URL scheme in Xcode (Info → URL Types)
- Plugin is synced via `npx cap sync ios`

## Android Setup

- `google-services.json` must exist in `android/app/`
- Android OAuth client in Google Console must have correct SHA-1 fingerprint
- `MainActivity.java` must implement `ModifiedMainActivityForSocialLoginPlugin`
- Plugin is synced via `npx cap sync android`

## i18n Keys

### `auth.json`
- `googleSignIn` — "Sign in with Google"

### `profile.json` → `google`
- `title` — "Google Account"
- `description` — "Connect your Google account to sign in faster"
- `connectedAs` — "Connected as {email}"
- `connect` — "Connect"
- `disconnect` — "Disconnect"
- `connected` — "Google account connected"
- `disconnected` — "Google account disconnected"
- `disconnectFailed` — "Failed to disconnect Google account"
