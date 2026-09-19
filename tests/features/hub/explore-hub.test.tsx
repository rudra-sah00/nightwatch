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
   * The hub is the landing surface, so it must render the same on every visit —
   * no stored "last section" to restore and no preference that could hide it. This
   * is the trap the removed Explore feed fell into: a leftover localStorage flag
   * that blanked /home with no surviving control to clear it.
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
});
