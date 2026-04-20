# Contributing to Watch Rudra

With Watch Rudra's extensive ecosystem (Next.js 15, Tauri, React Server Components, custom WebRTC and WebSockets hooks), maintaining code stability is a priority. Please thoroughly read our tooling rules below.

## Code Formatting & Linting (Biome)

We do **not** use Prettier or ESLint. We exclusively use [Biome (formerly Rome)](https://biomejs.dev/). Biome is natively integrated into `package.json` (`@biomejs/biome`) and `pnpm`.

Before pushing PRs or committing changes, ensure your codebase is completely warning-free by running:
```bash
pnpm biome format src/ --write
pnpm biome check src/ --write
```

### Strict Type Safety and Linting Rules
*   **No Explicit Any (`any`)**: Biome aggressively enforces type boundaries data contracts. Avoid using implicitly or explicitly typed `any`. Always specify a different type or use `unknown` to guarantee strict interface parsing.
*   **Type Narrowing (`unknown`)**: When converting legacy variables typed as `any` to `unknown`, you must explicitly typecast the object structure before attempting property access (e.g., `(item.showData as ShowDetails).id`) to stop TypeScript from throwing attribute errors (`Property 'id' does not exist on type '{}'`).
*   **No Unused Variables**: Ensure that orphaned variables, unused arguments (like `catch (e)`), and unused imports have been successfully cleaned, or prepend them with underscores (`_e`).
*   **Strict Native Imports**: Always import Node.js built-ins using the `node:` protocol format (`require('node:fs')` or `require('node:url')`).
*   **No Console Statement Leftovers**: Do not persist debugging `console.log` traces. Remove them completely before pushing code to avoid muddying the stdout.

*   **Quotes**: Use single quotes (`'`) internally, especially for component configuration or Mermaid JS maps (which crash `docs/UI_GUIDELINES.md` if double-quotes `"default"` are used).
*   **Spacing**: 2 spaces.
*   **Organized Imports**: Biome manages and automatically organizes imports alphabetically based on group types (`src/features` vs `react`). Let it sort for you.

## Component Design (Neo-Brutalist)

All UI elements must utilize `cva` (Class Variance Authority) from `src/components/ui/` to ensure the strict brutalist styling rules are applied identically.
*   **Variants**: Use `variant="neo-yellow"`, `variant="neo-red"`, `variant="neo-outline"`, `variant="default"`.
*   Avoid adding standard Tailwind shadows. Use our bespoke `shadow-[4px_4px_0px_#000]` or utility classes like `border-2 border-black`.

## Hooks and Global Context

Do not scatter standard React `useState` everywhere inside complex features.
*   If managing the VOD Player, dispatch events internally through `PlayerContext.tsx` strictly.
*   If bridging the Desktop Tauri shell with the browser, never write `typeof window !== "undefined" && window.__TAURI__` redundantly. Import and utilize `useDesktopApp()` from `src/hooks/use-desktop-app.ts`. This central hook includes heuristics to automatically fallback deep links.

## React Rendering Optimization

Because we heavily use Agora's real-time channels:
*   Do not put rapidly changing domain states (like `WatchPartyRoom.time`) into `useEffect` dependency arrays unless strictly needed. It triggers destructive re-rendering loops.
*   Cache the latest pointer logic into mutable memory: `const roomRef = useRef(room); roomRef.current = room;` and only let the listeners read `.current` statically.

## State Management

*   **Mutations**: Standard data mutations (profiles, passwords) use **Server Actions**.
*   **API Calling**: We do not use standard `fetch()` syntax. Route heavily through `src/lib/fetch.ts`, specifically employing `apiFetch` which wraps Mutex Queues to handle JWT Access Token timeouts silently without crashing active components executing parallel requests.

## Adding Markdown Files to `/docs`

If you add a new Markdown file, ensure it correctly proxies in Next.js Server config. Any file containing the string `api` out of pure coincidence (like `API_LAYER.md`) can trigger Vercel Edge Server 404 collapses unless whitelisted in `src/proxy.ts` using the correct negative-lookahead expressions:
`/((?!api\/|_next\/static).*)`

## Running Tests

All testing rules are comprehensively outlined in `docs/TESTING.md`. We enforce cross-platform Playwright e2e checking heavily for the Watch Party features.
