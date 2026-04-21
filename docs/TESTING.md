# Testing Methodology

Watch Rudra handles complex state synchronization across distributed WebRTC clients and backend systems. This documentation explains how the testing suites are structured to ensure absolute reliability across 400+ modules and real-time domains.

## Overview

The testing strategy is divided into three major categories:
1. **Unit and Component Tests** (Vitest)
2. **Integration Tests** (Vitest)
3. **End-to-End Tests** (Playwright)

## Vitest (Unit and Component Testing)

We use Vitest as our primary test runner due to its native ESM and TypeScript support, and out-of-the-box compatibility with Vite-based build systems. Vitest executes incredibly fast and supports test coverage output out of the box in `coverage/`.

### Writing Component Tests

When testing individual components:
- Isolate the component: Mock external network hooks (e.g., `useWatchPartyMembers` or `useQuery`).
- Mock Next.js routing: `next/navigation` modules like `useRouter` should be intercepted to prevent test crashes.
- **Wrap State Updates in `act()`**: Code that causes React state updates (like user events, async API resolutions, or timers) must be wrapped in `act(() => { ... })`. This ensures you are testing the behavior exactly as the user would see it in the browser.
- **Accessibility Matching (a11y)**: Rely on `@testing-library/react` queries like `getByRole`, `getByText`, or `findByTitle`. Avoid assuming structural elements (e.g., test against the semantic `<button>` roles instead of `<div>` tags).
- **Cleanup Leftover Logs**: Ensure no debugging `console.log` or `console.warn` statements are left behind in the components, as they unnecessarily bloat the CI/CD test runner outputs.

### Commands

- `pnpm test` : Runs all tests once.
- `pnpm test:watch` : Runs tests in watch mode for development.
- `pnpm test:ui` : Opens the Vitest UI in the browser to visualize passing/failing tests and coverage metrics.
- `pnpm test:coverage` : Generates a coverage report inside the `/coverage/` directory using the V8 engine.

## Playwright (End-to-End Testing)

E2E testing is uniquely challenging for a real-time, authenticated, and rate-limited application like Watch Rudra. We use Playwright to simulate actual browser interactions, test WebSockets, and assert UI flows (e.g., Watch Party creation and lobby approval).

### The E2E Command (`test:e2e`)

Playwright tests require the local database and cache to be in a predictable state.
Our customized script located in `package.json` performs a critical teardown of local Redis keys before executing tests:

```bash
pnpm test:e2e
```

**Under the Hood:**
1. It connects to the local `redis-cli`.
2. It completely deletes all `security:*` keys. This neutralizes the IP/User-Agent rate limiters (`apiLimiter`, `authLimiter`) we wrote on the backend, allowing a single test runner to blast login requests without being blocked by `429 Too Many Requests`.
3. It deletes `auth:otp_limit*` keys. This allows the Playwright engine to continuously request OTP emails without triggering security lockdown.
4. It launches the Playwright test runner.

*Warning: Never run `pnpm test:e2e` against a production environment, as it forcefully deletes security metrics.*

## Continuous Integration (CI)

All GitHub Actions workflows now run the full test suite before deploying or building:

### Web Deploy Pipelines (`deploy.yml`, `release.yml`)
1. `pnpm check` — Biome lint & format validation
2. `pnpm type-check` — TypeScript strict mode compilation
3. `pnpm test` — Full Vitest unit/component test suite (1388+ tests)
4. Build & deploy to Vercel
5. Post-deploy smoke test (HTTP health check on deployed URL)

### Desktop Build Pipeline (`build-desktop.yml`)
1. `pnpm check` — Biome lint & format
2. `pnpm type-check` — TypeScript compilation
3. `pnpm test` — Full Vitest suite
4. Electron build pipeline — Cross-platform binary compilation

### PR Preview Pipeline (`pr-preview.yml`)
Triggers on every PR to `main`:
1. Lint + type-check + unit tests
2. Builds and deploys a Vercel preview
3. Comments the preview URL on the PR

### Nightly E2E Pipeline (`e2e-nightly.yml`)
Runs at 2 AM UTC daily (also manual trigger):
1. Installs Playwright Chromium
2. Runs full E2E test suite with test credentials from GitHub Secrets
3. Uploads test results as artifacts (7-day retention)

### Local Validation
The `pnpm validate` command sequences type-checking, formatting, linting, and Vitest runs before allowing a merge.