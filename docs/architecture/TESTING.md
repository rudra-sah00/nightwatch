# Testing Methodology

How the Nightwatch test suites are structured: Vitest for unit and component tests, Playwright for end-to-end flows, and a single reusable CI workflow that gates every pipeline.

**Source:** `vitest.config.ts`, `playwright.config.ts`, `tests/`, `.github/workflows/quality.yml`

## Overview

Tests are **not colocated with source**. Everything lives under `tests/`, mirroring the `src/` layout:

```
tests/
├── setup.ts                 # Global setup (registered via setupFiles)
├── e2e/                     # Playwright specs (excluded from Vitest)
├── features/                # Per-feature unit/component tests
├── platforms/               # smart-tv, mobile
├── providers/               # Provider tests + __mocks__/
├── lib/
├── i18n/                    # Translation integrity
└── types/
```

Vitest is configured with `include: ['tests/**/*.test.{ts,tsx}']`, so a test file placed next to a component will not run.

Current suite size: **187 test files, 2,644 tests** (`pnpm test`, September 2026).

The strategy has three categories:
1. **Unit and Component Tests** (Vitest)
2. **Integration Tests** (Vitest — providers, socket reconnection, engine flows)
3. **End-to-End Tests** (Playwright)

## Vitest (Unit and Component Testing)

Vitest runs on `happy-dom` (not jsdom) with `globals: true` and `@vitejs/plugin-react`. The `@` alias resolves to `src/`.

One non-default setting matters: `clearMocks: false`. Vitest 5 flipped `clearMocks` to default `true`, which clears mock call history before every test, but `tests/setup.ts` registers module mocks whose recorded calls some suites assert on. Do not "fix" this flag.

### Writing Component Tests

- Isolate the component: mock external network hooks (e.g. `useWatchPartyMembers`, `useQuery`).
- Mock Next.js routing: intercept `next/navigation` (`useRouter`, `useSearchParams`) to prevent crashes.
- **Wrap state updates in `act()`**: user events, resolving promises, and timers all need it.
- **Query by role**: use `@testing-library/react` queries like `getByRole`, `getByText`, `findByTitle`. Test against semantic `<button>` roles rather than `<div>` structure — this is also why accessibility rules in [UI_GUIDELINES.md](./UI_GUIDELINES.md) are load-bearing.
- **Reuse the shared mocks** in `tests/providers/__mocks__/` and `tests/features/*/__mocks__/` (`lib-fetch`, `lib-socket`, `auth-provider`, `sonner`, …) instead of rolling new ones per file.
- **No leftover `console.log`**: debug output bloats CI logs.

### Commands

- `pnpm test` — run all tests once.
- `pnpm test:watch` — watch mode.
- `pnpm test:ui` — Vitest UI in the browser.
- `pnpm test:coverage` — V8 coverage report in `coverage/`.

### Coverage Thresholds

Enforced in `vitest.config.ts`:
- **Lines:** 82%
- **Functions:** 74%
- **Branches:** 67%
- **Statements:** 79%

Excluded from coverage: `tests/e2e/**`, config files, `.next/`, and App Router `layout.tsx` / `loading.tsx` / `error.tsx` files.

## Playwright (End-to-End Testing)

E2E is uniquely awkward for a real-time, authenticated, rate-limited app. Playwright drives a real browser to assert full flows.

Config highlights (`playwright.config.ts`):
- `testDir: './tests/e2e'`
- `fullyParallel: false` — execution is sequential, because the backend enforces a single session per login and parallel workers would invalidate each other.
- `forbidOnly` on CI.
- Credentials load from a git-ignored `.env.test`, parsed with `node:fs` to avoid adding `dotenv` as a dependency. On CI they come from the environment instead.

Current specs: `smoke.spec.ts`, `watch-party-flow.spec.ts`, `profile-settings.spec.ts`, `engagement-features.spec.ts`, `i18n-locale-switching.spec.ts`.

### The E2E Command (`test:e2e`)

Playwright needs the local cache in a predictable state, so the script in `package.json` tears down Redis keys first:

```bash
pnpm test:e2e
```

**Under the hood:**
1. Connects to the local `redis-cli`.
2. Deletes all `security:*` keys, neutralizing the IP/User-Agent rate limiters (`apiLimiter`, `authLimiter`) so a single runner can issue repeated logins without hitting `429 Too Many Requests`.
3. Deletes `auth:otp_limit*` keys so OTP emails can be requested repeatedly without a security lockdown.
4. Launches the Playwright runner.

*Warning: never run `pnpm test:e2e` against production — it forcefully deletes security metrics.*

E2E is **not** part of the CI gate; it is a local/manual suite because it requires Redis and real credentials.

## Continuous Integration (CI)

CI is centralized. `.github/workflows/quality.yml` is a **reusable workflow** (`on: workflow_call`) that every pipeline calls, rather than each duplicating its own steps:

1. `pnpm check` — Biome lint & format validation
2. `pnpm type-check` — TypeScript strict mode
3. `pnpm test` — full Vitest suite
4. `pnpm vitest run tests/i18n/` — translation integrity pass

### Who calls the quality gate

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `quality.yml` | `workflow_call` | The shared gate (above) |
| `pr-preview.yml` | PR to `main` | Gate + Vercel preview deploy, URL commented on the PR |
| `release.yml` | push to `main` | Gate + release-please versioning + production Vercel deploy, then fans out to the desktop, Android, and Android TV builds |
| `deploy.yml` | `workflow_dispatch` | Manual Vercel deploy (production or preview) |
| `build-desktop.yml` | `v*` tag, published release, or manual | Gate + Electron binaries via electron-builder |
| `build-android.yml` | `v*` tag, published release, or manual | Gate + Android APK |
| `build-android-tv.yml` | `v*` tag, published release, or manual | Gate + Android TV APK (`-PtvBuild`) |
| `deploy-staging.yml` | push to `development` | Docker image build and staging rollout over Tailscale. **Does not call the quality gate.** |

### Local Validation

Run `pnpm check` and `pnpm type-check` before committing. A Husky pre-commit hook enforces the basics.

## Related Documentation

- [../CONTRIBUTING.md](../CONTRIBUTING.md) — lint rules the gate enforces
- [I18N.md](./I18N.md) — what the translation integrity test checks
- [../platforms/SMART_TV.md](../platforms/SMART_TV.md) — the most heavily unit-tested platform layer