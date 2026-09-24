# UI and Styling Guidelines

The rules, tokens, and component APIs that keep Nightwatch's "softened neo-brutalist" interface consistent across web, desktop, mobile, and TV.

**Source:** `src/app/globals.css`, `src/components/ui/`, `src/platforms/smart-tv/styles/tv.css`

## Design Philosophy

The interface is neo-brutalist in its palette and typography — flat, saturated accent colours, heavy uppercase headline type, visible borders — but it is **not** the hard-edged variant with sharp corners and offset drop shadows. The implementation softened over time, and the rules below describe what the code actually does.

Core principles:

- **Visible borders, moderate weight.** `border-2` is the common structural weight (used in ~33 component files); `border-4` is reserved for emphasis surfaces such as dialogs and gates (~14 files). Many primitives use a hairline `border` plus a solid background instead.
- **Rounded corners.** Elements are rounded, not sharp. `rounded-full` (pills, avatars, icon buttons), `rounded-lg`, and `rounded-xl` are the dominant radii. `rounded-none` exists but is the exception.
- **No offset shadow blocks.** The codebase contains **zero** `shadow-[Npx_Npx_0px_...]` utilities. Do not add them — elevation comes from borders, background contrast, and layering.
- **High contrast.** Text must read starkly against its background. Use the semantic tokens (`text-foreground` on `bg-background`) rather than hardcoded black/white so dark mode inverts correctly.
- **Solid accent colours.** Use the `neo-*` tokens, never raw hex, and never gradients for structural fills.
- **Sharp typography.** `font-headline` (Space Grotesk) with `uppercase` and wide tracking for headers and primary actions.

## Tailwind Configuration (v4, CSS-Native)

The project uses **Tailwind CSS v4** with CSS-native configuration. There is no `tailwind.config.ts` — every token lives in `src/app/globals.css`.

```css
@import "tailwindcss";
@import "shadcn/tailwind.css";
@import "../platforms/smart-tv/styles/tv.css";

@custom-variant dark (&:is(.dark *));
@custom-variant touch-ui (&:is(html[data-touch-ui="touch"] *));
@custom-variant pointer-ui (&:is(html:not([data-touch-ui="touch"]) *));

@plugin "tailwindcss-animate";
@plugin "@tailwindcss/typography";
```

### Custom Variants

| Variant | Applies when | Use for |
|---------|--------------|---------|
| `dark:` | `.dark` on an ancestor | Dark theme overrides |
| `touch-ui:` | `html[data-touch-ui="touch"]` | Touch-sized hit areas (set by `src/platforms/mobile/touch-ui-script.ts`) |
| `pointer-ui:` | `html` without the touch flag | Hover-dependent affordances |

Prefer `touch-ui:` / `pointer-ui:` over viewport breakpoints when the real question is "is this a touch device", since a small desktop window is not a touch device.

### Theme Tokens

Two families are exposed through `@theme`:

- **`neo-*` accents** — flat brand colours: `bg-neo-yellow`, `text-neo-red`, `border-neo-border`, plus `neo-blue`, `neo-green`, `neo-orange`, `neo-cyan`, `neo-muted`, `neo-bg`, `neo-surface`, `neo-text`.
- **Semantic shadcn tokens** — `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`.

Both are backed by CSS custom properties defined in `:root` and remapped under `.dark`, so the accents are **not fixed hex values across themes**:

| Token | Light | Dark |
|-------|-------|------|
| `--neo-yellow` | `#ffcc00` | `#a855f7` (purple) |
| `--neo-red` | `#e63b2e` | `#fb7185` |
| `--neo-cyan` | `#06b6d4` | `#facc15` |
| `--neo-border` | `#1a1a1a` | `#e4e4e7` |
| `--neo-bg` | `#f5f0e8` | `#09090b` |

This is deliberate: dark mode is a separate palette, not a darkened copy of light mode. Never hardcode `#ffcc00` — a component that does will stay yellow when the rest of the app turns purple.

### Fonts

| Token | Family | Use |
|-------|--------|-----|
| `font-headline` | Space Grotesk | Headings, buttons, labels |
| `font-body` | Inter | Body copy |
| `font-sans` / `font-mono` | Geist Sans / Geist Mono | Defaults, code |

## Component API

Interactive primitives in `src/components/ui/` use `cva` (Class Variance Authority) so state styling is declared once. `Button` is the reference implementation.

### `Button` variants

| Variant | Appearance |
|---------|-----------|
| `default` | Primary solid fill |
| `neo` | Neo-brutalist bordered surface |
| `neo-base` | Base surface variant |
| `neo-yellow` | Solid accent fill, `rounded-md` |
| `neo-red` | Destructive accent fill, `rounded-md` |
| `neo-outline` | Transparent with border, inverts on hover |
| `neo-ghost` | Transparent with faint hover |
| `none` | Unstyled — opt out entirely |

Sizes: `default`, `sm`, `lg`, `icon`, `neo-lg`, `none`. Defaults are `variant="default"` and `size="default"`.

Use `variant="none"` / `size="none"` rather than fighting the base classes with overrides when you need a genuinely custom element.

### Writing Standardized Components

Do not rebuild hover, border, and focus states by hand when a variant exists.

**Incorrect — hardcoded hex and hand-rolled states:**
```tsx
<button className="bg-[#ffcc00] border-2 border-black text-black hover:bg-black hover:text-white transition-colors py-4">
  Join Room
</button>
```

**Correct — variant plus layout-only overrides:**
```tsx
<Button variant="neo-yellow" size="neo-lg" className="w-full font-black uppercase tracking-widest">
  Join Room
</Button>
```

The `className` prop should carry layout and typography, not colour or border logic.

## Best Practices

1. **Routing and links.** Wrap Next.js `<Link>` in `<Button asChild>` so it inherits variant styling and focus states.
2. **Semantic colour only.** Reach for `neo-*` and shadcn tokens. A hardcoded hex is a dark-mode bug waiting to happen.
3. **Text standardization.** Keep `uppercase`, wide tracking, and heavy weight on primary actions.
4. **Border weight across breakpoints.** Keep the border weight stable; don't drop `border-2` to `border` on mobile unless space is critically constrained.
5. **TV focus states.** Smart TV surfaces are keyboard/D-pad driven and need a visible focus ring at all times — see `src/platforms/smart-tv/styles/tv.css` and [../platforms/SMART_TV.md](../platforms/SMART_TV.md).
6. **Accessibility.** Every interactive element needs an accessible name and a visible focus state. Tests query by role, so semantic elements are load-bearing, not cosmetic — see [TESTING.md](./TESTING.md).

## Related Documentation

- [OVERVIEW.md](./OVERVIEW.md) — architecture, including the player compound components
- [../CONTRIBUTING.md](../CONTRIBUTING.md) — lint and formatting rules
- [../platforms/SMART_TV.md](../platforms/SMART_TV.md) — TV-specific focus and overscan rules
