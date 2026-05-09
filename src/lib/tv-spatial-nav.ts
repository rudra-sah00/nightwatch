/**
 * TV D-pad spatial navigation engine.
 *
 * When active, arrow keys move focus between interactive elements
 * based on their spatial position on screen. Enter/Space triggers click.
 * This enables Android TV remote navigation without any UI changes.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"], [role="tab"], [role="menuitem"]';

function getRect(el: HTMLElement): DOMRect | null {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return rect;
}

function isVisible(el: HTMLElement): boolean {
  if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed')
    return false;
  const rect = getRect(el);
  if (!rect) return false;
  return (
    rect.bottom > 0 &&
    rect.top < window.innerHeight &&
    rect.right > 0 &&
    rect.left < window.innerWidth
  );
}

function getFocusables(): HTMLElement[] {
  const all = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE));
  return all.filter(isVisible);
}

type Direction = 'up' | 'down' | 'left' | 'right';

function findNext(
  current: HTMLElement,
  direction: Direction,
): HTMLElement | null {
  const focusables = getFocusables();
  const from = getRect(current);
  if (!from) return focusables[0] || null;

  const cx = from.left + from.width / 2;
  const cy = from.top + from.height / 2;

  let best: HTMLElement | null = null;
  let bestDist = Infinity;

  for (const el of focusables) {
    if (el === current) continue;
    const rect = getRect(el);
    if (!rect) continue;

    const ex = rect.left + rect.width / 2;
    const ey = rect.top + rect.height / 2;

    // Filter by direction
    let valid = false;
    switch (direction) {
      case 'up':
        valid = ey < cy - 1;
        break;
      case 'down':
        valid = ey > cy + 1;
        break;
      case 'left':
        valid = ex < cx - 1;
        break;
      case 'right':
        valid = ex > cx + 1;
        break;
    }
    if (!valid) continue;

    // Distance: weighted to prefer elements along the axis of movement
    const dx = ex - cx;
    const dy = ey - cy;
    let dist: number;
    if (direction === 'up' || direction === 'down') {
      dist = Math.abs(dy) + Math.abs(dx) * 3;
    } else {
      dist = Math.abs(dx) + Math.abs(dy) * 3;
    }

    if (dist < bestDist) {
      bestDist = dist;
      best = el;
    }
  }

  return best;
}

function handleKeyDown(e: KeyboardEvent) {
  let direction: Direction | null = null;

  switch (e.key) {
    case 'ArrowUp':
      direction = 'up';
      break;
    case 'ArrowDown':
      direction = 'down';
      break;
    case 'ArrowLeft':
      direction = 'left';
      break;
    case 'ArrowRight':
      direction = 'right';
      break;
    case 'Enter':
      // Let Enter trigger click on focused element
      if (document.activeElement && document.activeElement !== document.body) {
        (document.activeElement as HTMLElement).click();
        e.preventDefault();
      }
      return;
    default:
      return;
  }

  e.preventDefault();

  const current = document.activeElement as HTMLElement;
  const next = findNext(
    current && current !== document.body ? current : document.body,
    direction,
  );

  if (next) {
    next.focus({ preventScroll: false });
    next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

let active = false;

export function enableSpatialNav() {
  if (active) return;
  active = true;
  document.addEventListener('keydown', handleKeyDown, { capture: true });
}

export function disableSpatialNav() {
  if (!active) return;
  active = false;
  document.removeEventListener('keydown', handleKeyDown, { capture: true });
}
