/**
 * What the keys do, as one list.
 *
 * The room has seven bindings spread across five hooks — `use-avatar-controls`
 * (`WASD`, Shift), `use-sit-interaction` (`E`), `use-dance-menu` (`R`),
 * `use-view-mode-hotkey` (`V`), `use-chat-focus-hotkey` (`Enter`) — plus mouse
 * look, and until now nothing told anybody they existed. The only hints in the room
 * were the sit prompt and a dance toast that appears *after* you have been refused.
 *
 * Kept here rather than inline in the card so the same list can be asserted
 * against: `controls.test.ts` checks it stays in step with the keys the hooks
 * actually read, and that none of them collide with the video player underneath —
 * which stays mounted and keyboard-live beneath the scene, so a clash would fire
 * both actions.
 *
 * English, hardcoded, like every other string under `theatre/`. Worth naming as
 * debt: this is the most text-heavy thing in the feature and the app ships 14
 * locales. Translating it means translating the sit prompt and the dance toasts
 * with it, or the room ends up half-translated, which reads worse than not at all.
 */

export interface ControlRow {
  /** Keycaps to draw, in order. */
  keys: readonly string[];
  /** What it does. Sentence case, no trailing full stop. */
  label: string;
  /** The catch, when there is one. */
  note?: string;
}

export const CONTROLS: readonly ControlRow[] = [
  { keys: ['W', 'A', 'S', 'D'], label: 'Walk', note: 'Arrow keys work too' },
  { keys: ['Shift'], label: 'Run' },
  { keys: ['Mouse'], label: 'Look around' },
  {
    keys: ['E'],
    label: 'Sit down, or stand up',
    note: 'Stand near a free seat',
  },
  {
    keys: ['R'],
    label: 'Hold for the dance wheel, release to pick',
    note: 'Standing, with room to move',
  },
  {
    keys: ['Enter'],
    label: 'Chat',
    note: 'Enter sends, Escape goes back',
  },
  { keys: ['V'], label: 'Switch view', note: '2D, 3D, screen focus' },
  { keys: ['H'], label: 'This card' },
] as const;

/** Every key the card claims, flattened — for the collision test. */
export function claimedKeys(): string[] {
  return CONTROLS.flatMap((row) => [...row.keys]);
}
