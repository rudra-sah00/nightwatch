/**
 * Tests for the two-phase product tour.
 *
 * The hub refactor made `/home` an opaque full-screen surface above driver.js's
 * overlay, so the old single-phase tour highlighted layout chrome nobody could see.
 * These lock in the phase split and the selectors it depends on.
 */
import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const replace = vi.fn();
let currentPath = '/home';
let tourParam: string | null = 'true';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace,
    push: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => currentPath,
  useSearchParams: () =>
    new URLSearchParams(tourParam ? `tour=${tourParam}` : ''),
}));

const setLeftOpen = vi.fn();
const setRightOpen = vi.fn();
vi.mock('@/app/(protected)/(main)/layout', () => ({
  useSidebar: () => ({ setLeftOpen, setRightOpen }),
}));

vi.mock('@/platforms/desktop/use-desktop-app', () => ({
  useDesktopApp: () => ({ isDesktopApp: false }),
}));

let isMobileValue = false;
vi.mock('@/platforms/mobile/use-is-mobile', () => ({
  useIsMobile: () => isMobileValue,
}));

vi.mock('@/providers/theme-provider', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('driver.js/dist/driver.css', () => ({}));

/** Captures the config driver.js is constructed with. */
const driveMock = vi.fn();
const destroyMock = vi.fn();
let lastConfig: Record<string, unknown> | undefined;

vi.mock('driver.js', () => ({
  driver: (config: Record<string, unknown>) => {
    lastConfig = config;
    return { drive: driveMock, destroy: destroyMock };
  },
}));

import { GlobalTour } from '@/components/ui/global-tour';

type Step = {
  element?: string;
  popover?: { title?: string; description?: string };
};

/** The config driver.js was last constructed with. */
function config(): Record<string, unknown> {
  if (!lastConfig) throw new Error('driver.js was never constructed');
  return lastConfig;
}

function steps(): Step[] {
  return (lastConfig?.steps as Step[]) ?? [];
}

/** Render and let the 600ms delay plus the dynamic import settle. */
async function start() {
  render(<GlobalTour />);
  await act(async () => {
    vi.advanceTimersByTime(700);
  });
  // Flush the awaited dynamic import chain.
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('GlobalTour', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    lastConfig = undefined;
    currentPath = '/home';
    tourParam = 'true';
    isMobileValue = false;
    document.body.innerHTML = '';
  });

  it('does nothing without a tour param', async () => {
    tourParam = null;
    await start();
    expect(driveMock).not.toHaveBeenCalled();
  });

  it('does not run the hub phase outside /home', async () => {
    currentPath = '/music';
    tourParam = 'true';
    await start();
    expect(driveMock).not.toHaveBeenCalled();
  });

  it('runs the hub phase on /home?tour=true', async () => {
    await start();
    expect(driveMock).toHaveBeenCalledTimes(1);
  });

  it('targets hub tiles by data-tour, never by href', async () => {
    await start();
    const selectors = steps()
      .map((s) => s.element)
      .filter(Boolean) as string[];

    expect(selectors).toContain('[data-tour="hub-grid"]');
    expect(selectors).toContain('[data-tour="hub-live"]');
    expect(selectors).toContain('[data-tour="hub-movies"]');
    expect(selectors).toContain('[data-tour="hub-music"]');
    expect(selectors).toContain('[data-tour="hub-manga"]');
    expect(selectors).toContain('[data-tour="hub-ask-ai"]');
    expect(selectors).toContain('[data-tour="hub-games"]');

    // The sidebar links to the same routes and precedes the hub in DOM order, so an
    // href selector would resolve to the sidebar's hidden copy.
    expect(selectors.some((s) => s.startsWith('a[href='))).toBe(false);
  });

  it('does not highlight layout chrome during the hub phase', async () => {
    await start();
    const selectors = steps()
      .map((s) => s.element)
      .filter(Boolean) as string[];

    // All of these are behind the opaque hub surface on /home.
    expect(selectors).not.toContain('input[name="q"]');
    expect(selectors).not.toContain('aside');
    expect(selectors).not.toContain('aside:last-of-type');
  });

  it('hands over to the chrome phase on /search from the last hub step', async () => {
    await start();
    const last = steps().at(-1) as {
      popover: { onNextClick?: () => void };
    };
    expect(typeof last.popover.onNextClick).toBe('function');

    act(() => {
      last.popover.onNextClick?.();
    });
    expect(destroyMock).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/search?tour=chrome');
  });

  it('runs the chrome phase on /search?tour=chrome and reaches the search input', async () => {
    currentPath = '/search';
    tourParam = 'chrome';
    await start();

    expect(driveMock).toHaveBeenCalledTimes(1);
    const selectors = steps()
      .map((s) => s.element)
      .filter(Boolean) as string[];
    // The search input moved to the /search landing; it no longer exists on /home.
    expect(selectors).toContain('input[name="q"]');
    expect(selectors).toContain('aside');
    expect(selectors).toContain('a[href="/profile"]');
  });

  it('chrome phase does not repeat destinations already shown as hub tiles', async () => {
    currentPath = '/search';
    tourParam = 'chrome';
    await start();
    const selectors = steps()
      .map((s) => s.element)
      .filter(Boolean) as string[];

    for (const href of ['/music', '/manga', '/games', '/ask-ai', '/live']) {
      expect(selectors).not.toContain(`a[href="${href}"]`);
    }
    // But the ones absent from the hub are still covered.
    expect(selectors).toContain('a[href="/continue-watching"]');
    expect(selectors).toContain('a[href="/watchlist"]');
    expect(selectors).toContain('a[href="/library"]');
  });

  it('chrome phase waits while the hub gate is still up', async () => {
    currentPath = '/search';
    tourParam = 'chrome';
    const gate = document.createElement('div');
    gate.setAttribute('data-hub-screen', '');
    document.body.appendChild(gate);

    await start();
    expect(driveMock).not.toHaveBeenCalled();

    // Dismissing the gate lets the tour proceed.
    gate.remove();
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(driveMock).toHaveBeenCalledTimes(1);
  });

  it('abandons the chrome phase if the gate is never dismissed', async () => {
    currentPath = '/search';
    tourParam = 'chrome';
    const gate = document.createElement('div');
    gate.setAttribute('data-hub-screen', '');
    document.body.appendChild(gate);

    await start();
    await act(async () => {
      vi.advanceTimersByTime(25_000);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(driveMock).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/search');
  });

  it('labels the last hub step as a hand-off rather than Done', async () => {
    await start();
    // The next-intl test mock echoes the key back unprefixed.
    expect(config().doneBtnText).toBe('continueBtn');
  });

  it('labels the last chrome step as Done', async () => {
    currentPath = '/search';
    tourParam = 'chrome';
    await start();
    expect(config().doneBtnText).toBe('doneBtn');
  });
});
