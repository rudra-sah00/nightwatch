# Contributing & Developer Workflow

Watch Rudra is a monolithic unified repository, containing our Next.js frontend, Node.js proxy layers, and the Electron desktop application. Given the size of the codebase, we maintain strict contribution guidelines to ensure high code quality, optimal performance, and safe deployment.

## Prerequisites

Before you start building, ensure your local environment meets the strict tooling requirements:

- **Node.js**: v20 or higher.
- **Package Manager**: Strictly `pnpm` (v9). We do NOT use `npm` or `yarn`. 
- **Formatter/Linter**: Rust-based [Biome](https://biomejs.dev/). We do not use Prettier or ESLint to maximize toolchain speed.

```bash
# Install pnpm globally if you haven't
npm install -g pnpm

# Install dependencies using the strict lockfile
pnpm install
```

## Running the Project

The workspace relies on a robust Next.js environment combined with an Electron shell wrapper.

### Web Only (Development)

To run the standard web browser application, which includes hot-module-reloading (HMR) and Tailwind compilation:

```bash
pnpm dev
# The application will be accessible at http://localhost:3000
```

### Desktop Only (Electron Development)

To test the Desktop Application functionality (like Deep Linking, `app-region` dragging, and Discord RPC):

1. **Build the Web Code First:** Electron requires a compiled production output. You cannot hot-reload Next.js *inside* the Electron shell easily due to IPC context bindings.
    ```bash
    pnpm build
    ```
2. **Start the Electron Shell:**
    ```bash
    pnpm start:electron
    ```

## Formatting & Code Quality

If any formatting checks fail in CI, your Pull Request will be blocked. You should format your code locally before committing.

```bash
# Format the entire codebase
pnpm biome format --write .

# Or, safely lint and apply fixes
pnpm biome check --write --unsafe .
```

### Rule of Thumb
Do not create complex CSS styling rules inside individual `.tsx` files if a Neo-Brutalist `cva` button or component already exists! Refer to the [UI Guidelines](/UI_GUIDELINES) documentation.

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/). This dictates how we parse changes for semantic versioning (e.g. creating releases like `v1.18.0`).

**Valid Prefixes:**
- `feat:` A new feature. (e.g., `feat(watch-party): add deep link hook`)
- `fix:` A bug fix. (e.g., `fix(desktop): restore frameless window region`)
- `docs:` Documentation updates. (e.g., `docs: update UI guidelines`)
- `refactor:` Code restructuring without changing external behavior.
- `chore:` Tooling, configs, dependency bumps.

## Pull Request Process

1. Create a branch logically named: `feat/add-watch-party-sync`, `fix/desktop-memory-leak`.
2. Write tests for robust features (e.g. Socket.io handlers in `tests/features/auth/schemas.test.ts`).
3. Run `pnpm run test` locally to ensure no regressions.
4. Keep the PR focused. Don't mix UI redesigns into a Desktop IPC logic fix.

## Building for Production

If you need to cut a physical `.dmg` or `.exe` release of the Electron app:

```bash
pnpm build:desktop
```
This leverages `electron-builder` under the hood. For the Web layer on Vercel, merges to `main` automatically kick off an Edge network deployment.
