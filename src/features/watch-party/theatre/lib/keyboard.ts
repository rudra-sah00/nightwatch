/**
 * Shared "is the user typing?" test for every theatre keyboard shortcut.
 *
 * The theatre binds single letters — `WASD` to walk, `E` to sit, `R` to dance,
 * `V` to change view — on `window`. Watch party chat sits on top of the scene,
 * so without a guard a message like "were you sad?" walks your avatar across
 * the room, seats you, and opens the dance wheel.
 *
 * Four hooks each had their own copy of this check and each tested only
 * `event.target`. That misses the case people actually hit: clicking the chat
 * panel rather than the field itself. The click lands on a paragraph of
 * messages, focus stays on `<body>`, and every subsequent keystroke is read as a
 * shortcut while the user believes they are typing. So focus is checked as well
 * as the event target, and the whole chat surface counts, not just its input.
 */

/** Elements that natively consume text input. */
function isEditable(el: HTMLElement): boolean {
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return el.isContentEditable;
}

/**
 * Marks a region as chat UI. Anything inside it swallows theatre shortcuts.
 * Applied to the floating chat root in `chat/components/FloatingChat.tsx`.
 */
export const CHAT_SURFACE_ATTR = 'data-wp-chat-surface';

const CHAT_SURFACE_SELECTOR = `[${CHAT_SURFACE_ATTR}]`;

/**
 * True when a keystroke belongs to the user's text entry rather than the scene.
 *
 * Pass the raw `event.target`. Returns true when the target is an editable
 * element, when it sits inside a chat surface, or when focus currently rests in
 * either of those even though the event itself landed elsewhere.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (target instanceof HTMLElement) {
    if (isEditable(target)) return true;
    if (target.closest(CHAT_SURFACE_SELECTOR)) return true;
  }

  // Guard against non-DOM environments (tests, SSR) before touching `document`.
  if (typeof document === 'undefined') return false;

  const active = document.activeElement;
  if (active instanceof HTMLElement) {
    if (isEditable(active)) return true;
    if (active.closest(CHAT_SURFACE_SELECTOR)) return true;
  }

  return false;
}
