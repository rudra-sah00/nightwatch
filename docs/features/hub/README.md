# Hub

Full-screen entry surface that asks the user where they want to go — live TV, movies, music, manga, Ask AI, or games — before showing any layout chrome. Appears on cold start and as the `/home` page.

**Source:** `src/features/hub/`, `src/app/(protected)/(main)/home/page.tsx`

## Directory Structure

```
src/features/hub/
├── lib/
│   └── destinations.ts         # HubDestination type + HUB_DESTINATIONS array
└── components/
    ├── ExploreHub.tsx          # /home page component (renders HubScreen without escape hatch)
    ├── HubGate.tsx             # Full-screen gate overlay on every cold start
    ├── HubScreen.tsx           # Shared presentation shell (dialog, heading, grid)
    └── HubGrid.tsx             # Link-based destination tile grid (web)
```

## Concept

The hub replaces a traditional home feed with an opinionated choice screen. Instead of dropping the user into a content rail and hoping they scroll to what they want, it presents six large tiles — one per product surface — and blocks the rest of the UI until one is chosen. The sidebar, navbar, and any page content behind it are hidden while the hub is visible.

Two instances exist:

1. **`/home` page** (`ExploreHub`) — the hub *is* the page content. The sidebar's Home link points here. No "Continue" escape hatch because there is nothing behind `/home` to continue to.
2. **Entry gate** (`HubGate`) — a full-screen overlay mounted in the protected layout, covering every authenticated route on each cold start or hard refresh. It dismisses after one pick and does not reappear during client-side navigation within the same page load.

Both render the same `HubScreen`, so they cannot drift apart visually.

## Destinations

`lib/destinations.ts`

Each tile is a `HubDestination`:

```typescript
interface HubDestination {
  id: string;
  href: string;
  icon: LucideIcon;
  labelKey: string;   // Resolved against the `common` i18n namespace
  accent: string;     // Tailwind bg class for the icon plate
  onTv: boolean;      // Whether the tile appears on Android TV
}
```

The `HUB_DESTINATIONS` array defines the full set:

| id | href | Label key | Icon | Accent | TV |
|----|------|-----------|------|--------|----|
| `live` | `/live` | `hub.liveChannels` | `Radio` | `bg-neo-red` | ✓ |
| `movies` | `/search` | `hub.moviesAndSeries` | `Film` | `bg-neo-blue` | ✓ |
| `music` | `/music` | `nav.music` | `Music` | `bg-neo-green` | ✓ |
| `manga` | `/manga` | `nav.manga` | `BookOpen` | `bg-neo-orange` | ✓ |
| `ask-ai` | `/ask-ai` | `nav.askAi` | `Bot` | `bg-neo-cyan` | ✓ |
| `games` | `/games` | `nav.games` | `Gamepad2` | `bg-neo-yellow` | ✗ |

Games is excluded from TV because the catalogue is embedded HTML5 that expects a pointer or keyboard — there is no `TvGames` page, and a D-pad user would be stranded inside a game they cannot quit.

`hubDestinationsFor(platform)` filters by platform: `'web'` returns all destinations, `'tv'` drops those with `onTv: false`.

Label keys are shared with the sidebar navigation where possible (e.g. `nav.music`) so the two cannot drift apart or fall out of translation sync.

## Components

### HubGate

`components/HubGate.tsx`

Mounted in the protected layout so it covers every authenticated route on cold start. Uses module-scope state (`answeredThisLoad`) to track whether the user has already chosen a destination during this page load:

- **First visit or hard refresh**: opens the full-screen `HubScreen` as an overlay
- **Landing on `/home`**: skips the gate (the `/home` page already shows the hub)
- **After any pick or dismiss**: `answeredThisLoad = true`, gate closes and does not reappear during client-side navigation
- **Deep links**: when the loaded route is not `/home`, the screen offers a "Continue" button so shared URLs (watch-party invites, clips, notification taps) stay reachable

Module-scope state is deliberate — `sessionStorage` would persist across reloads (wrong), and `useState` would reset on every route change (also wrong). Module scope is created once per document load and survives client-side navigation.

Exports `__resetHubGateForTests()` for test isolation.

### HubScreen

`components/HubScreen.tsx`

Shared full-screen presentation shell:

- `fixed inset-0` at `z-[10300]` — above all layout chrome (sidebar, navbar) but below the fullscreen game surface (`z-[99999]`)
- `role="dialog"` with `aria-modal="true"` and `aria-label` from `common.hub.title`
- `data-hub-screen` attribute — the product tour polls for this marker before starting its chrome phase
- Locks body scroll while visible
- Renders heading (`hub.title`), subtitle (`hub.subtitle`), and the tile grid
- `onPick` callback — called when a destination is chosen (gate uses it to record dismissal)
- `onContinue` callback — when supplied, renders an underlined "Continue" text button below the grid

Platform-aware: wraps the grid in `TvPageGate` which swaps in a lazily loaded `TvHubGrid` (from `@/platforms/smart-tv/components/TvHubGrid`) on Android TV. The TV grid uses spatial navigation focus management instead of pointer-based links.

### HubGrid

`components/HubGrid.tsx`

The web tile grid:

- Calls `hubDestinationsFor('web')` to get all destinations
- Renders a `<nav>` with `aria-label` from `common.hub.title` and `data-tour="hub-grid"`
- 2-column grid on mobile, 3-column on `md:` breakpoint
- Each tile is a Next.js `<Link>` with `data-tour="hub-{id}"` (the product tour keys off these instead of `a[href]` to avoid matching sidebar links)
- Tiles show a coloured icon plate (using the destination's `accent` class) and a label
- Hover/focus: border changes to `border-neo-blue`, focus ring for keyboard accessibility
- `onPick` fires before navigation so the gate can record the choice

### ExploreHub

`components/ExploreHub.tsx`

Minimal wrapper that renders `<HubScreen />` without `onContinue` — making a tile choice the only way forward from `/home`. The `/home` page component (`src/app/(protected)/(main)/home/page.tsx`) renders `ExploreHub` for web and `TvHome` for Android TV via `TvPageGate`.

## Route

The hub surfaces on one route:

| Route | Component | Behaviour |
|-------|-----------|-----------|
| `/home` | `ExploreHub` → `HubScreen` | Hub is the page. No escape hatch. |

The `HubGate` is not a route — it is mounted in the protected layout and overlays whatever route the user landed on.
