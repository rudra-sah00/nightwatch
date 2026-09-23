/**
 * What the keys do, as one list.
 *
 * The room has six keyboard bindings spread across five hooks —
 * `use-avatar-controls` (`WASD`, Shift), `use-sit-interaction` (`E`),
 * `use-dance-menu` (`R`), `use-view-mode-hotkey` (`V`), `use-chat-focus-hotkey`
 * (`Enter`) — plus mouse look, and until now nothing told anybody they existed. The
 * only hints in the room were the sit prompt and a dance toast that appears *after*
 * you have been refused.
 *
 * Kept here rather than inline in `ControlsHint` so the same list can be asserted
 * against: `controls.test.ts` checks it stays in step with the keys the hooks
 * actually read, and that none of them collide with the video player underneath —
 * which stays mounted and keyboard-live beneath the scene, so a clash would fire
 * both actions.
 *
 * Labels are ONE WORD each, because this renders as a single borderless line over a
 * film and anything longer wraps into the picture. The caveats that used to sit here
 * as sub-notes ("stand near a free seat", "standing, with room to move") are already
 * delivered where they matter: `SitPrompt` names the seat requirement as you
 * approach one, and `useDanceMenu` toasts the actual reason when it refuses.
 *
 * English, hardcoded, like every other string under `theatre/`. Worth naming as
 * debt: the app ships 14 locales, and translating this means translating the sit
 * prompt and the dance toasts with it, or the room ends up half-translated, which
 * reads worse than not at all.
 */

export interface ControlRow {
  /** Keycaps to draw, in order. */
  keys: readonly string[];
  /** What it does. One word, sentence case. */
  label: string;
}

export const CONTROLS: readonly ControlRow[] = [
  { keys: ['W', 'A', 'S', 'D'], label: 'Walk' },
  { keys: ['Shift'], label: 'Run' },
  { keys: ['Mouse'], label: 'Look' },
  { keys: ['E'], label: 'Sit' },
  { keys: ['R'], label: 'Dance' },
  { keys: ['Enter'], label: 'Chat' },
  { keys: ['V'], label: 'View' },
] as const;

/** Every key the line claims, flattened — for the collision test. */
export function claimedKeys(): string[] {
  return CONTROLS.flatMap((row) => [...row.keys]);
}
