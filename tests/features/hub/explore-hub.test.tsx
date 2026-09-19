import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExploreHub } from '@/features/hub/components/ExploreHub';
import { hubDestinationsFor } from '@/features/hub/lib/destinations';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// TvPageGate defaults to the web tree and only upgrades once TV detection confirms,
// which never happens under test.
vi.mock('@/platforms/smart-tv/components/TvPageGate', () => ({
  TvPageGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('ExploreHub', () => {
  it('asks the user what to explore', () => {
    render(<ExploreHub />);

    expect(screen.getByText('hub.title')).toBeInTheDocument();
  });

  it('renders one link per web destination, pointing at its route', () => {
    render(<ExploreHub />);

    const links = screen.getAllByRole('link');
    const destinations = hubDestinationsFor('web');

    expect(links).toHaveLength(destinations.length);
    expect(links.map((l) => l.getAttribute('href'))).toEqual(
      destinations.map((d) => d.href),
    );
  });

  it('labels every tile', () => {
    render(<ExploreHub />);

    for (const { labelKey } of hubDestinationsFor('web')) {
      expect(screen.getByText(labelKey)).toBeInTheDocument();
    }
  });

  /**
   * /home is the hub itself, so there is nothing behind it to continue to — a choice
   * is the only way forward. The escape hatch belongs to the gate, which covers a
   * route the user actually asked for.
   */
  it('offers no continue escape hatch', () => {
    render(<ExploreHub />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText('hub.continue')).not.toBeInTheDocument();
  });

  /**
   * The hub is the landing surface, so it must render the same on every visit — no
   * stored "last section" to restore and no preference that could hide it. This is the
   * trap the removed Explore feed fell into: a leftover localStorage flag that blanked
   * /home with no surviving control to clear it.
   */
  it('renders identically regardless of stored state', () => {
    localStorage.setItem('nightwatch:exploreOnHome', 'true');
    localStorage.setItem('nightwatch:hub', 'music');

    const { unmount } = render(<ExploreHub />);
    const first = screen
      .getAllByRole('link')
      .map((l) => l.getAttribute('href'));
    unmount();

    localStorage.clear();
    render(<ExploreHub />);
    const second = screen
      .getAllByRole('link')
      .map((l) => l.getAttribute('href'));

    expect(second).toEqual(first);
  });

  it('exposes the grid as a labelled navigation landmark', () => {
    render(<ExploreHub />);

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  /**
   * The hub owns the viewport: it must cover the left sidebar, navbar and right
   * sidebar rendered by the (main) layout, not sit inside the content column. Leaving
   * the app's own navigation visible would offer a second, contradictory answer to
   * the question the hub is asking.
   */
  describe('full-viewport presentation', () => {
    it('is fixed over the whole viewport above the layout chrome', () => {
      render(<ExploreHub />);

      const dialog = screen.getByRole('dialog');

      expect(dialog.className).toContain('fixed');
      expect(dialog.className).toContain('inset-0');
      expect(dialog.className).toContain('z-[10300]');
    });

    it('paints an opaque background so nothing shows through', () => {
      render(<ExploreHub />);

      expect(screen.getByRole('dialog').className).toContain('bg-background');
    });

    it('locks body scroll while mounted and restores it after', () => {
      const { unmount } = render(<ExploreHub />);

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).not.toBe('hidden');
    });
  });

  /**
   * Tiles change border and ring on hover/focus but must not move. A transform on a
   * grid this size shifts layout under the pointer.
   */
  it('does not animate tiles on hover or focus', () => {
    render(<ExploreHub />);

    for (const link of screen.getAllByRole('link')) {
      expect(link.className).not.toMatch(/hover:-?translate/);
      expect(link.className).not.toMatch(/focus-visible:-?translate/);
      expect(link.className).not.toMatch(/hover:scale/);
    }
  });
});
