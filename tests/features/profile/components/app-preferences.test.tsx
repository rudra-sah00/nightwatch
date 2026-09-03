import { fireEvent, render, screen } from '@testing-library/react';
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

const exploreSwitch = () =>
  screen
    .getByText('Explore on Home')
    .closest('div.flex-col')
    ?.parentElement?.querySelector('[role="switch"]') as HTMLElement;

describe('AppPreferences — Explore on Home', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the toggle, off by default', () => {
    render(<AppPreferences />);

    expect(screen.getByText('Explore on Home')).toBeInTheDocument();
    expect(exploreSwitch()).toHaveAttribute('aria-checked', 'false');
  });

  it('persists the flag that /home reads when switched on', () => {
    render(<AppPreferences />);

    fireEvent.click(exploreSwitch());

    expect(localStorage.getItem('nightwatch:exploreOnHome')).toBe('true');
    expect(exploreSwitch()).toHaveAttribute('aria-checked', 'true');
  });

  it('reflects a previously stored preference on mount', () => {
    localStorage.setItem('nightwatch:exploreOnHome', 'true');

    render(<AppPreferences />);

    expect(exploreSwitch()).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(exploreSwitch());

    expect(localStorage.getItem('nightwatch:exploreOnHome')).toBe('false');
  });
});
