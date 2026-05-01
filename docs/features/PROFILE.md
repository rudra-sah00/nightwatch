# User Profile

Profile management with avatar uploads, inline-editable fields, Zod validation, app preferences, keyboard shortcuts reference, GitHub-style activity heatmap, and public profile views.

## Directory Structure

```
src/features/profile/
├── api.ts                          # REST API + caching
├── schema.ts                       # Zod validation schemas
├── types.ts                        # WatchActivity type
├── components/
│   ├── profile-overview.tsx        # Main profile page layout
│   ├── update-profile-form.tsx     # Avatar + name/username/server form
│   ├── app-preferences.tsx         # Theme, language, desktop settings
│   ├── keyboard-shortcuts.tsx      # Shortcut reference dialog
│   ├── activity-graph.tsx          # GitHub-style heatmap
│   └── public-profile-view.tsx     # Read-only public profile
└── hooks/
    ├── use-profile-overview.ts     # Activity fetch + avatar upload
    ├── use-update-profile-form.ts  # Form state + username check + submit
    └── use-change-password-form.ts # Password change form
```

## API Layer

`api.ts`

| Function | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| `getProfile(options?)` | GET | `/api/auth/me` | Fetch current user (5-min TTL cache) |
| `updateProfile(data, options?)` | PATCH | `/api/user/profile` | Update name, username, preferred server |
| `uploadProfileImage(file)` | POST | `/api/user/profile-image` | Upload avatar (FormData) |
| `changePassword(data, options?)` | PATCH | `/api/auth/password` | Change password |
| `deleteAccount(options?)` | DELETE | `/api/user/profile` | Delete account |
| `getWatchActivity(options?)` | GET | `/api/watch/activity` | Fetch daily watch activity (no cache) |
| `getPublicProfile(id, options?)` | GET | `/api/user/public/:id` | Public profile by UUID |
| `checkUsername` | — | Re-exported from `@/features/auth/api` | Username availability check |

Profile data is cached with a 5-minute TTL via `createTTLCache`. `invalidateProfileCache()` clears the cache after mutations.

## Schemas

`schema.ts`

### updateProfileSchema

```typescript
z.object({
  name: z.string().min(2, 'validation.nameMinLength').optional(),
  username: z.string().min(3, 'validation.usernameMinLength')
    .regex(/^\w+$/, 'validation.usernameFormat').optional(),
  preferredServer: z.enum(['s1', 's2', 's3']).optional(),
})
```

### changePasswordSchema

```typescript
z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).regex(/[A-Z]/).regex(/[special chars]/),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword)
```

Zod error messages are translation keys resolved via `t(err.message)` where `t = useTranslations('profile')`.

## Types

`types.ts`

```typescript
interface WatchActivity {
  date: string;    // ISO date YYYY-MM-DD
  count: number;   // Watch minutes
  level: 0 | 1 | 2 | 3 | 4;  // Heatmap intensity
}
```

## Components

### ProfileOverview

`components/profile-overview.tsx`

Main profile page layout composing four sections:
1. `UpdateProfileForm` — avatar + profile fields
2. `AppPreferences` — theme, language, desktop settings
3. Password change form — current/new/confirm fields with show/hide toggle
4. `ActivityGraph` — watch activity heatmap

Uses `useProfileOverview` for activity data and `useChangePasswordForm` for the password section. The password form uses `React.useActionState` for server-action-style submission.

### UpdateProfileForm

`components/update-profile-form.tsx`

Profile editing form with:
- **Avatar section** — clickable image with camera overlay, file input trigger, upload progress indicator
- **Inline-editable name** — large neo-brutalist input, auto-saves on blur/Enter via hidden form submit
- **Username field** — with debounced availability check (green check / red X indicator)
- **Server selection** — radio group for s1/s2/s3 with `preferredServer` persistence
- **Public profile link** — copy-to-clipboard button (uses `desktopBridge.copyToClipboard` on Electron)
- **Danger zone** — account deletion with `AlertDialog` confirmation
- **Logout button**

Uses `useUpdateProfileForm` for all form logic and `useProfileOverview` for avatar upload.

### AppPreferences

`components/app-preferences.tsx`

Application preferences panel:
- **Theme selection** — Light/Dark/System with Sun/Moon/Monitor icons, dialog-based picker
- **Language switching** — `LanguageSwitcher` component (14 languages)
- **Keyboard shortcuts** — opens `KeyboardShortcuts` dialog
- **Desktop-only settings** (shown only in Electron):
  - Launch on startup toggle (`desktopBridge.setRunOnBoot`)
  - Concurrent downloads limit (1–10, custom input)
  - Download speed limit (0 = unlimited, presets + custom)
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
- 5 intensity levels with neo-brutalist colors: `bg-secondary` (0), `bg-neo-blue/40` (1), `bg-neo-blue` (2), `bg-neo-yellow` (3), `bg-neo-red` (4)
- Month labels derived from week start dates
- Tooltip on hover showing date and watch minutes
- Loading skeleton state
- Locale-aware month names via `useTranslations`

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
- Fetches watch activity on mount and on window re-focus
- **Avatar upload**: optimistic local preview via `URL.createObjectURL`, uploads via `uploadProfileImage`, updates auth context on success, revokes object URL on cleanup
- Returns: `user`, `logout`, `activity`, `loadingActivity`, `isUploading`, `displayImage`, `fileInputRef`, `formattedJoinDate`, `handleFileClick`, `handleFileChange`

### useUpdateProfileForm

`hooks/use-update-profile-form.ts`

Form state management:
- **Debounced username check** (500ms) via `useDebounce` + `checkUsername` API
- **Form submission** via `React.useActionState`:
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
- `React.useActionState` submission:
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
7. Profile cache updated with new data
8. Success toast shown
