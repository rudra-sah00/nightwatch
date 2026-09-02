# Google OAuth Integration

## Overview

Google is the **only** way to create a Nightwatch account, and one of two ways to
sign in. A single "Continue with Google" button covers both: the backend decides
whether this is a login or a signup, and the client only finds out afterwards.

There is no `/signup` or `/login` route. Both signing in and creating an account
happen on a single route: **`/continue`**.

**Rules:**
- One Google account per Nightwatch user (enforced by unique constraint on `google_id`)
- One Nightwatch account per Google account (prevents multi-linking)
- Google email doesn't need to match Nightwatch email
- Users can disconnect and reconnect a different Google account anytime
- Signup requires no email OTP — Google has already verified the address — but it
  does require the user to pick a username and set a password
- The password is stored against the Google email, so every account ends up
  reachable **both** through Google and through email + password

## Architecture

| Platform | Method | Flow |
|----------|--------|------|
| Web / Electron | OAuth 2.0 redirect | Redirect → Google consent → callback page → backend code exchange |
| iOS | Native (Google Sign-In SDK) | Device account picker → idToken → backend verification |
| Android | Native (Credential Manager) | Device account picker → idToken → backend verification |

The frontend detects native platforms via `checkIsMobile()` (`window.Capacitor?.isNativePlatform?.()`) and uses the appropriate flow. A browser redirect is never used on native: Google rejects OAuth inside embedded WebViews (`disallowed_useragent`).

## The two-call handshake

A Google authorization code can only be exchanged **once**, but signup needs two
round trips: resolve the profile, then collect a username. The backend therefore
splits the flow and parks the verified profile server-side between the two calls.

```
POST /api/auth/google/continue      { code, redirectUri } | { idToken }
  │
  ├─ google_id matches a user  → 200 { user, expiresIn }          ← signed in, cookies set
  │
  ├─ no match, email is free   → 200 { needsProfile: true,
  │                                    ticket,
  │                                    profile: { name, email, picture },
  │                                    suggestedUsername }
  │                                 ↓
  │                              POST /api/auth/google/complete
  │                                { ticket, username, name, password }
  │                                 → 201 { user, expiresIn }     ← account created, cookies set
  │
  └─ email belongs to a password account → 409 USER_EXISTS
```

### Signup ticket

| Property | Value |
|----------|-------|
| Redis key | `google_signup:<ticket>` |
| Ticket | 32 random bytes, base64url (`crypto.randomBytes`) |
| TTL | 10 minutes |
| Payload | `{ sub, email, name, picture }` — the verified Google profile |

`randomBytes` rather than a uuid: possession of a ticket authorises creating an
account against an already-verified email, so it must not be guessable from
sequence or timing.

**The email always comes from the ticket, never from the client.** `GoogleCompleteSchema`
has no email field and strips unknown keys, so a client cannot substitute an
address Google never confirmed.

### Why a taken username no longer costs a Google round trip

The old flow exchanged the credential inside `register()`, so hitting a taken
username spent the code and forced the user back through the account picker.
Now `complete` deletes the ticket **only after** the account exists: a
`USERNAME_TAKEN` rejection leaves it valid and the user just picks another name.
Concurrent submissions still cannot create two accounts, because `users.google_id`
is unique.

## Signup Flow

Both entry paths converge on the profile step rendered inside the login card.

**Web / desktop**
1. The login button redirects to Google with `state=login` (`desktop_login` inside Electron).
2. `/auth/google/callback` calls `googleContinue({ code })`.
3. On `needsProfile`, it parks the response in `sessionStorage` and redirects to `/continue`.
4. `useGoogleAuth` picks the parked signup up on mount and `LoginClient` renders `GoogleCompleteForm`.

**Native (iOS / Android)**
1. The button calls `nativeGoogleSignIn()` to open the device account picker.
2. `googleContinue({ idToken })` runs in place — no navigation.
3. On `needsProfile` the profile step renders immediately.

The pending signup is mirrored to `sessionStorage` in both cases so there is only
one code path. It holds an opaque ticket, never the Google credential.

### Profile step fields

| Field | Source | Editable |
|-------|--------|----------|
| Email | Google (verified) | **No** — displayed as read-only text, not an input |
| Name | Google, pre-filled | Yes |
| Username | `suggestedUsername` from the email local part, pre-filled | Yes |
| Password | — | Required |

`suggestedUsername` is sanitised to `[a-z0-9_]`, truncated to 20 chars, and checked
for availability; a numeric suffix is tried a few times before giving up and
returning an empty string so the field simply starts blank.

### Password policy

The profile step validates with the shared `passwordSchema` from
`src/features/auth/schema.ts` (8+ chars, lowercase, uppercase, number, special
character), which mirrors the backend `GoogleCompleteSchema`. Keeping these in
lockstep matters because the backend strips Zod field paths in production —
anything the client lets through surfaces as an untargeted "Validation failed".

## Frontend Implementation

### Key Files

- `src/features/auth/google-api.ts` — OAuth URL builder, native sign-in, `googleContinue`/`googleComplete`, pending-signup storage helpers
- `src/features/auth/hooks/use-google-auth.ts` — owns `start`/`complete`/`cancel` and the pending-signup state
- `src/features/auth/components/google-complete-form.tsx` — the profile step
- `src/features/auth/components/login-form.tsx` — adaptive button (Google when credential fields are empty, login when filled)
- `src/features/profile/components/google-account-section.tsx` — connect/disconnect on profile page
- `src/app/(public)/auth/google/callback/page.tsx` — handles the OAuth redirect from Google
- `tests/features/auth/google-continue.test.ts` — API contract, ticket storage, OAuth URL states
- `tests/features/auth/google-complete-form.test.tsx` — profile step validation and read-only email

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

- `src/modules/auth/google-auth.service.ts` — Code exchange, idToken verification, `continueWithGoogle`/`completeRegistration`/connect/disconnect, signup tickets
- `src/modules/auth/google-auth.controller.ts` — HTTP handlers with cookie-based session creation
- `src/db/schema.ts` — `google_id` (unique) and `google_email` columns on users table
- `drizzle/0017_add_google_oauth.sql` — Migration SQL

### API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/google/continue` | Public | Sign in, or return a signup ticket (code or idToken) |
| POST | `/api/auth/google/complete` | Public | Create the account from a ticket + username + name + password |
| POST | `/api/user/google/connect` | Protected | Link Google to account |
| POST | `/api/user/google/disconnect` | Protected | Unlink Google from account |

Both public endpoints are exempt from CSRF validation: they run before the client is guaranteed to hold a `csrfToken` cookie (first launch of the native app), and forging them is not useful to an attacker since each requires a valid Google credential.

### Error codes

| Code | Meaning |
|------|---------|
| `GOOGLE_TICKET_INVALID` | Signup ticket unknown or expired — restart from "Continue with Google" |
| `USER_EXISTS` | The Google email already belongs to a password account. Linking is done from the profile page, deliberately from an authenticated session, so holding the email is never on its own enough to take over the account |
| `USERNAME_TAKEN` | Chosen username is taken or reserved |
| `GOOGLE_AUTH_FAILED` | Credential invalid, expired, or already spent — restart the handshake |

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
- `continueWithGoogle` — "Continue with Google"
- `googleSignup.title` — profile step heading
- `googleSignup.createAccount` — profile step submit
- `googleSignup.fromGoogle` — badge marking the read-only email
- `googleSignup.usernameTaken` — server-side username clash

### `profile.json` → `google`
- `title` — "Google Account"
- `description` — "Connect your Google account to sign in faster"
- `connectedAs` — "Connected as {email}"
- `connect` — "Connect"
- `disconnect` — "Disconnect"
- `connected` — "Google account connected"
- `disconnected` — "Google account disconnected"
- `disconnectFailed` — "Failed to disconnect Google account"
