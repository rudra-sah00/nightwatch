import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppPreferences } from '@/features/profile/components/app-preferences';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

// Not a desktop build, so the Electron-only rows stay out of the way.
vi.mock('@/lib/electron-bridge', () => ({
  checkIsDesktop: () => false,
  desktopBridge: {
    storeGet: vi.fn(() => Promise.resolve(undefined)),
    storeSet: vi.fn(),
    setRunOnBoot: vi.fn(),
  },
}));

vi.mock('@/providers/theme-provider', () => ({
  useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }),
}));

vi.mock('@/components/layout/language-switcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

vi.mock('@/features/profile/components/keyboard-shortcuts', () => ({
  KeyboardShortcuts: () => <div data-testid="keyboard-shortcuts" />,
}));

describe('AppPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders its remaining controls', () => {
    render(<AppPreferences />);

    expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
    expect(screen.getByTestId('keyboard-shortcuts')).toBeInTheDocument();
  });

  /**
   * The Explore feed was removed, and this switch was its only control. It wrote
   * `nightwatch:exploreOnHome`, which HomeClient read to blank itself out — so a
   * leftover `true` from before the removal would have hidden the search hero and
   * left /home empty. Neither the control nor any read of that key may come back.
   */
  describe('Explore on Home removal', () => {
    it('no longer renders the toggle', () => {
      render(<AppPreferences />);

      expect(screen.queryByText('Explore on Home')).not.toBeInTheDocument();
    });

    it('renders no switch that writes the explore preference', () => {
      render(<AppPreferences />);

      for (const el of screen.queryAllByRole('switch')) {
        el.click();
      }

      expect(localStorage.getItem('nightwatch:exploreOnHome')).toBeNull();
    });

    it('ignores a stale preference left over from before the removal', () => {
      localStorage.setItem('nightwatch:exploreOnHome', 'true');

      render(<AppPreferences />);

      // Still renders normally — the value is not read, so it cannot gate anything.
      expect(screen.getByTestId('language-switcher')).toBeInTheDocument();
      expect(screen.queryByText('Explore on Home')).not.toBeInTheDocument();
    });
  });
});
