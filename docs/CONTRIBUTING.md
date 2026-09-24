# Contributing to Nightwatch

Tooling rules and code conventions for the Nightwatch frontend (Next.js 16, Electron, Capacitor, WebRTC, Socket.IO).

**Source:** `biome.json`, `package.json`, `.husky/`

## Code Formatting & Linting (Biome)

We do **not** use Prettier or ESLint. Formatting and linting are handled entirely by [Biome](https://biomejs.dev/).

Before pushing, make the codebase warning-free:
```bash
pnpm format   # biome check --write .  (auto-fix)
pnpm check    # biome check .          (validation, what CI runs)
```

`pnpm lint` is an alias for `pnpm check`.

### Strict Type Safety and Linting Rules

*   **No explicit `any`.** Use a concrete type, or `unknown` when the shape is genuinely unknown.
*   **Narrow `unknown` before use.** Cast to the expected shape explicitly (e.g. `(item.showData as ShowDetails).id`) rather than reaching into `unknown`.
*   **No unused variables.** Remove orphaned variables, unused arguments, and unused imports, or prefix them with an underscore (`_e`).
*   **`node:` protocol imports.** Always `import { readFileSync } from 'node:fs'`, never `'fs'`.
*   **No leftover `console.log`.** Remove debug output before pushing.
*   **Quotes:** single quotes.
*   **Spacing:** 2 spaces.
*   **Organized imports:** Biome sorts and groups imports automatically. Let it.

## Component Design

UI primitives live in `src/components/ui/` and use `cva` (Class Variance Authority) so styling states are declared once.

*   Use the existing variants — `variant="neo-yellow"`, `"neo-red"`, `"neo-outline"`, `"neo-ghost"`, `"neo"`, `"neo-base"`, `"default"`, or `"none"` to opt out.
*   **Never hardcode hex colours.** Use the `neo-*` and semantic tokens. The accent palette is remapped in dark mode (`--neo-yellow` becomes purple), so a hardcoded `#ffcc00` is a dark-mode bug.
*   Do **not** add offset shadow blocks like `shadow-[4px_4px_0px_#000]`. The codebase contains none, and the current design uses borders and background contrast for elevation.

Full rules: [architecture/UI_GUIDELINES.md](./architecture/UI_GUIDELINES.md).

## Hooks and Global Context

Do not scatter `useState` through complex features.

*   For the VOD player, dispatch through `PlayerContext` (`src/features/watch/player/context/PlayerContext.tsx`) rather than adding local state.
*   For Electron, never write `typeof window !== 'undefined' && window.electronAPI` inline. Use `useDesktopApp()` from `src/platforms/desktop/use-desktop-app.ts` (or the `desktopBridge` in `src/lib/electron-bridge.ts`), which already handles deep-link fallbacks.
*   For Capacitor, use `mobileBridge` from `src/lib/mobile-bridge.ts`, which no-ops off-platform.

## React Rendering Optimization

Because Agora RTM and Socket.IO listeners are long-lived:

*   Do not put rapidly changing domain state (like `WatchPartyRoom.time`) in `useEffect` dependency arrays — it re-subscribes listeners on every tick.
*   Keep the latest value in a ref and read `.current` inside listeners:
    ```ts
    const roomRef = useRef(room);
    useEffect(() => { roomRef.current = room; }, [room]);
    ```

## State Management

*   **Server data:** TanStack Query (`useQuery` / `useMutation`).
*   **Mutations:** client-side `apiFetch` calls, usually inside `useMutation`. **There are no Server Actions in this codebase** — do not add `'use server'`. The backend owns authorization, and `apiFetch` owns session refresh and retries.
*   **API calls:** always route through `apiFetch` in `src/lib/fetch.ts`, never bare `fetch()`. It handles the refresh mutex, CSRF header, timeout, and retry behaviour.
*   **Persistent client state:** Zustand (`src/store/`, `src/features/music/store/`).

Full rules: [architecture/STATE_MANAGEMENT.md](./architecture/STATE_MANAGEMENT.md).

## Commits and Releases

Releases are **automated** — do not create tags or GitHub releases by hand.

`release.yml` runs [release-please](https://github.com/googleapis/release-please) on every push to `main`. It reads commit messages, maintains `CHANGELOG.md` and `.release-please-manifest.json`, opens a release PR, and on merge creates the `v*` tag. That tag then triggers the desktop, Android, and Android TV builds.

This makes **Conventional Commits** load-bearing, because the commit type decides the version bump:

| Prefix | Effect |
|--------|--------|
| `fix:` | patch bump |
| `feat:` | minor bump |
| `feat!:` / `BREAKING CHANGE:` footer | major bump |
| `chore:`, `docs:`, `refactor:`, `test:`, `ci:` | no release |

The config sets `bump-minor-pre-major`, so breaking changes bump the minor version while the project is pre-1.0 in release-please's terms.

A `.husky/pre-commit` hook runs `pnpm type-check` and `lint-staged`, so a commit that does not type-check is rejected locally.

## Pull Requests

Open PRs against `main`. `pr-preview.yml` runs the shared quality gate and deploys a Vercel preview, commenting the URL on the PR. Pushes to `development` deploy to staging via `deploy-staging.yml`, which does **not** run the quality gate — so do not treat a green staging deploy as a passing build.

## Documentation

`docs/features/<name>/` mirrors `src/features/<name>/`, and `docs/platforms/` mirrors `src/platforms/`. When you add or meaningfully change a feature, update its doc in the same PR and keep its `**Source:**` line accurate. If you add a new feature directory, add the matching doc folder and link it from [docs/README.md](./README.md).

## Running Tests

Tests live in `tests/`, not beside the source — a `*.test.tsx` next to a component will not be picked up. See [architecture/TESTING.md](./architecture/TESTING.md) for the full methodology, including the Playwright E2E setup and the shared CI quality gate.

```bash
pnpm test         # Vitest, 187 files / 2,644 tests
pnpm type-check   # tsc --noEmit
pnpm check        # Biome
```
