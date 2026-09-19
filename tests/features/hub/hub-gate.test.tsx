import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetHubGateForTests,
  HubGate,
} from '@/features/hub/components/HubGate';

const { mockPathname } = vi.hoisted(() => ({
  mockPathname: { value: '/music' },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname.value,
}));

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

vi.mock('@/platforms/smart-tv/components/TvPageGate', () => ({
  TvPageGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

beforeEach(() => {
  __resetHubGateForTests();
  mockPathname.value = '/music';
});

describe('HubGate', () => {
  it('gates a route the user loaded directly', () => {
    render(<HubGate />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('hub.title')).toBeInTheDocument();
  });

  /**
   * /home renders the hub as its page content. Gating there too would stack two hubs.
   */
  it('stands down on the hub page itself', () => {
    mockPathname.value = '/home';

    render(<HubGate />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('covers the whole viewport above the layout chrome', () => {
    render(<HubGate />);

    const dialog = screen.getByRole('dialog');

    expect(dialog.className).toContain('fixed');
    expect(dialog.className).toContain('inset-0');
    expect(dialog.className).toContain('z-[10300]');
    expect(dialog.className).toContain('bg-background');
  });

  describe('once per document load', () => {
    it('closes when a destination is chosen', () => {
      render(<HubGate />);

      fireEvent.click(screen.getAllByRole('link')[0]);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    /**
     * Choosing a destination triggers a client-side navigation, which changes the
     * pathname the gate reads. It must not reappear on the very navigation it caused.
     */
    it('stays closed across the navigation the choice triggers', () => {
      const { rerender } = render(<HubGate />);

      fireEvent.click(screen.getAllByRole('link')[0]);
      mockPathname.value = '/manga';
      rerender(<HubGate />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('stays closed for later navigations in the same load', () => {
      const { unmount } = render(<HubGate />);
      fireEvent.click(screen.getAllByRole('link')[0]);
      unmount();

      mockPathname.value = '/manga';
      render(<HubGate />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    /**
     * Landing on /home counts as having been asked, so the gate must not then appear
     * when the user navigates onward within the same load.
     */
    it('treats landing on the hub page as answered for the whole load', () => {
      mockPathname.value = '/home';
      const { rerender } = render(<HubGate />);

      mockPathname.value = '/music';
      rerender(<HubGate />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('gates again after a reload', () => {
      const { unmount } = render(<HubGate />);
      fireEvent.click(screen.getAllByRole('link')[0]);
      unmount();

      // A reload creates fresh module state, which is what the flag lives in.
      __resetHubGateForTests();
      render(<HubGate />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  /**
   * Every tile navigates away from the loaded route, so without a way through, a shared
   * watch-party invite, clip link or notification tap could never be opened.
   */
  describe('deep links stay reachable', () => {
    it('offers a way through to the loaded route', () => {
      mockPathname.value = '/watch-party/abc123';

      render(<HubGate />);

      expect(
        screen.getByRole('button', { name: 'hub.continue' }),
      ).toBeInTheDocument();
    });

    it('dismisses without navigating when taken', () => {
      mockPathname.value = '/watch/some-title';

      render(<HubGate />);
      fireEvent.click(screen.getByRole('button', { name: 'hub.continue' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
