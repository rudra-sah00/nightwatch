# User Profile

Profile management with avatar uploads, inline-editable fields, Zod validation, app preferences, keyboard shortcuts reference, GitHub-style activity heatmap, active devices, and public profile views.

**Source:** `src/features/profile/`, `src/features/auth/api.ts` (checkUsername)

---

## Directory Structure

```
src/features/profile/
├── api.ts                          # REST API + caching
├── schema.ts                       # Zod validation schemas
├── types.ts                        # WatchActivity, MusicActivity, ActivityData types
├── components/
│   ├── profile-overview.tsx        # Main profile page layout
│   ├── update-profile-form.tsx     # Avatar + name/username form + Google section + danger zone
│   ├── app-preferences.tsx         # Theme, language, desktop settings
│   ├── keyboard-shortcuts.tsx      # Shortcut reference dialog
│   ├── activity-graph.tsx          # GitHub-style heatmap (watch + music)
│   ├── public-profile-view.tsx     # Read-only public profile
│   ├── google-account-section.tsx  # Google connect/disconnect
│   ├── active-devices.tsx          # List of logged-in sessions with per-device sign-out
│   ├── user-profile-client.tsx     # Client wrapper for user profile page
│   └── profile-back-button.tsx     # Navigation back button
└── hooks/
    ├── use-profile-overview.ts     # Activity fetch + avatar upload (TanStack Query)
    ├── use-update-profile-form.ts  # Form state + username check + submit
    └── use-change-password-form.ts # Password change form
```

## API Layer

`api.ts`

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getProfile(options?)` | GET | `/api/auth/me` | Fetch current user |
| `updateProfile(data, options?)` | PATCH | `/api/user/profile` | Update name, username |
| `uploadProfileImage(file)` | POST | `/api/user/profile-image` | Upload avatar (FormData with field `image`) |
| `changePassword(data, options?)` | PATCH | `/api/auth/password` | Change password |
| `deleteAccount(options?)` | DELETE | `/api/user/profile` | Delete account |
| `getWatchActivity(options?)` | GET | `/api/watch/activity` | Fetch daily watch activity |
| `getMusicActivity(options?)` | GET | `/api/music/activity` | Fetch daily music listening activity |
| `getPublicProfile(id, options?)` | GET | `/api/user/public/:id` | Public profile by UUID |
| `checkUsername` | — | Re-exported from `@/features/auth/api` | Username availability check (`GET /api/user/check-username/:username`) |

Avatar upload sends a `FormData` body with the file under the `image` key directly to the backend. The backend handles storage and returns the new `profilePhoto` URL in the response. There is no client-side S3 presigned URL flow — the upload goes through the backend API.

Profile data is cached by TanStack Query. The `useProfileOverview` hook uses query keys `['profile', 'activity', 'watch']` and `['profile', 'activity', 'music']` with a 60-second `staleTime`.

## Schemas

`schema.ts`

### updateProfileSchema

```typescript
z.object({
  name: z.string().min(2, 'validation.nameMinLength').optional(),
  username: z.string().min(3, 'validation.usernameMinLength')
    .regex(/^\w+$/, 'validation.usernameFormat').optional(),
})
```

### changePasswordSchema

```typescript
z.object({
  currentPassword: z.string().min(1, 'validation.currentPasswordRequired'),
  newPassword: z.string()
    .min(8, 'validation.passwordMinLength')
    .regex(/[A-Z]/, 'validation.passwordUppercase')
    .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'validation.passwordSpecialChar'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'validation.newPasswordsMismatch',
  path: ['confirmPassword'],
})
```

Note: The `changePasswordSchema` enforces uppercase and special character but does not enforce lowercase or digit requirements. The shared `passwordSchema` in `src/features/auth/schema.ts` (used by the Google signup flow) is stricter — it also requires lowercase and digit.

Zod error messages are translation keys resolved via `t(err.message)` where `t = useTranslations('profile')`.

## Types

`types.ts`

```typescript
interface WatchActivity {
  date: string;    // ISO date YYYY-MM-DD
  count: number;   // Watch minutes (converted from watchSeconds)
  level: 0 | 1 | 2 | 3 | 4;  // Heatmap intensity
}

interface MusicActivity {
  date: string;
  count: number;   // Music listening minutes (converted from listenSeconds)
  level: 0 | 1 | 2 | 3 | 4;
}

interface ActivityData {
  watch: WatchActivity[];
  music: MusicActivity[];
}
```

## Components

### ProfileOverview

`components/profile-overview.tsx`

Main profile page layout composing five sections:
1. `UpdateProfileForm` — avatar + profile fields + Google section + danger zone
2. `AppPreferences` — theme, language, desktop settings (lazy-loaded via `next/dynamic`)
3. Password change form — current/new/confirm fields with show/hide toggle
4. `ActiveDevices` — list of logged-in sessions with per-device sign-out (lazy-loaded)
5. `ActivityGraph` — watch + music activity heatmap (lazy-loaded)

The password form uses `React.useActionState` (React 19's progressive-enhancement form primitive) for submission — **not** Server Actions. The form action calls `changePassword()` via `apiFetch`, which is a standard client-side API call.

### UpdateProfileForm

`components/update-profile-form.tsx`

Profile editing form with:
- **Avatar section** — clickable image with camera overlay, file input trigger, upload progress indicator
- **Inline-editable name** — large neo-brutalist input, auto-saves on blur/Enter via hidden form submit
- **Username field** — with debounced availability check (green check / red X indicator)
- **Google account section** — connect/disconnect Google via `GoogleAccountSection` component
- **Public profile link** — copy-to-clipboard button (uses `desktopBridge.copyToClipboard` on Electron)
- **Danger zone** — account deletion with `AlertDialog` confirmation
- **Logout button** — with confirmation dialog

Uses `useUpdateProfileForm` for all form logic and `useProfileOverview` for avatar upload.

### AppPreferences

`components/app-preferences.tsx`

Application preferences panel:
- **Theme selection** — Light/Dark/System with Sun/Moon/Monitor icons, dialog-based picker
- **Language switching** — `LanguageSwitcher` component (14 languages)
- **Keyboard shortcuts** — opens `KeyboardShortcuts` dialog
- **Desktop-only settings** (shown only in Electron):
  - Launch on startup toggle (`desktopBridge.setRunOnBoot`)
  - All persisted via `desktopBridge.storeSet`

### KeyboardShortcuts

`components/keyboard-shortcuts.tsx`

Tabbed dialog showing keyboard shortcuts grouped by context:

| Group | Icon | Shortcuts |
|-------|------|-----------|
| Video | MonitorPlay | Space/K, J/L/arrows, M, F, C, N, Esc |
| Music | Music | Space, arrows, M, S, R |
| Party | Users | Enter, Esc |
| Search | Search | (search-specific shortcuts) |
| Desktop | Monitor | (desktop-only, shown only in Electron) |

Each shortcut displays key badges and a translated label.

### ActivityGraph

`components/activity-graph.tsx`

GitHub-style contribution heatmap:
- 52-week grid (7 rows × ~52 columns)
- Split cells: left half watch activity, right half music activity
- Watch levels: `bg-secondary` (0), `bg-activity-1` (1), `bg-activity-2` (2), `bg-activity-3` (3), `bg-activity-4` (4)
- Music levels: `bg-secondary` (0), `bg-music-1` (1), `bg-music-2` (2), `bg-music-3` (3), `bg-music-4` (4)
- Month labels derived from week start dates
- Tooltip on hover showing date, watch minutes, and music minutes
- Loading skeleton state
- Locale-aware month names via `useTranslations`
- **TV platform**: Same component rendered in `TvActivityHeatmap` wrapper on TV profile page

### PublicProfileView

`components/public-profile-view.tsx`

Read-only public profile page:
- User avatar (large, with fallback initial)
- Display name and username
- Join date formatted via `useFormatter`
- **Stats**: watch streak (consecutive days) and total watch hours
- Activity heatmap (`ActivityGraph`)
- Link back to home page
- "What's New" section

Streak calculation: counts consecutive days with activity backwards from today (using server-provided `todayIso` to prevent hydration mismatch).

## Hooks

### useProfileOverview

`hooks/use-profile-overview.ts`

Powers the profile overview page:
- Fetches watch and music activity via TanStack Query (`useQuery`) with 60-second stale time
- **Avatar upload**: optimistic local preview via `URL.createObjectURL`, uploads via `uploadProfileImage` (FormData POST), updates auth context on success, revokes object URL on cleanup
- Returns: `user`, `logout`, `activity` (both watch + music as `ActivityData`), `loadingActivity`, `isUploading`, `displayImage`, `fileInputRef`, `formattedJoinDate`, `handleFileClick`, `handleFileChange`

### useUpdateProfileForm

`hooks/use-update-profile-form.ts`

Form state management:
- **Debounced username check** (500ms) via `useDebounce` + `checkUsername` API, using `useTransition` for non-blocking state updates
- **Form submission** via `React.useActionState` (React 19 progressive enhancement, **not** a Server Action — calls `updateProfile` via `apiFetch`):
  1. Detects no-change submissions → info toast
  2. Validates username availability
  3. Validates against `updateProfileSchema`
  4. Calls `updateProfile` API
  5. Updates auth context via `updateUser`
- **Account deletion**: `handleDeleteAccount` → `deleteAccount` API → `logout`
- **Change detection**: `hasChanges` computed from current vs original values
- **Guard pattern**: Uses `wasPending` ref to only show toasts for actual submissions (not cached state from tab switches)

### useChangePasswordForm

`hooks/use-change-password-form.ts`

Password change form:
- Three controlled fields: `currentPassword`, `newPassword`, `confirmPassword`
- `React.useActionState` submission (**not** a Server Action — calls `changePassword` via `apiFetch`):
  1. Validates against `changePasswordSchema`
  2. Calls `changePassword` API
  3. Resets fields on success
- Same `wasPending` guard pattern as the profile form

## Data Flow: Profile Update

1. User edits name/username → local state updates
2. Username change triggers 500ms debounced availability check
3. Form submit (blur/Enter) → `React.useActionState` action fires
4. Validates against `updateProfileSchema`
5. `updateProfile` PATCH → backend validates → returns updated user
6. `updateUser(result.user)` updates auth context
7. Success/error/info toast shown via `wasPending` guard

## Related Docs

- [Authentication](../auth/README.md)
- [Google OAuth](../auth/GOOGLE_OAUTH.md)
- [Friends](../friends/README.md)
- [State Management](../../architecture/STATE_MANAGEMENT.md)
- [UI Guidelines](../../architecture/UI_GUIDELINES.md)
