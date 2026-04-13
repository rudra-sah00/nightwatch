# Profile & Account Management

## Overview
The `profile` directory encapsulates user identity, public-facing user portfolios, and restricted account settings. 

## Directory Structure
`src/features/profile/`
- `components/`: `AvatarUpload`, `ProfileHeader`, `FollowButton`, `SettingsForms`.
- `hooks/`: `useProfileQuery`, `useUpdateProfile`.
- `schema.ts`: Zod validation boundaries rigorously checking payload sizes (e.g., bio character limits, URL sanitation for social links).
- `api.ts`: Profile resolution, follow/unfollow mutations, and avatar upload signed-url requests.

## Implementation Details
1. **Public vs Protected Contexts**
   - Resolving a public profile operates under standard GET route groupings.
   - Mutating a profile heavily relies on `apiFetch` executing under the umbrella of our `AUTH_TOKEN` cookies. If a 401 triggers here, the lock mechanism described in `STATE_MANAGEMENT.md` cleanly intercepts it.

2. **Zod Form Pipelines**
   - Every input in the user settings area is strictly mapped to `react-hook-form` paired with `@hookform/resolvers/zod`.
   - The schemas live in `schema.ts` to guarantee the exact same bounds are verified safely on the client before the payload strikes the NestJS backend.

3. **Optimistic Updates**
   - Clicking "Follow" on a profile page triggers an immediate client-side UI mutation using our unified state context, avoiding a network-latency flicker.
