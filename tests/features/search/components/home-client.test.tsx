import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HomeClient } from '@/features/search/components/HomeClient';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/features/search/hooks/use-search-input', () => ({
  useSearchInput: () => ({
    containerRef: { current: null },
    query: '',
    setQuery: vi.fn(),
    suggestion: '',
    handleFocus: vi.fn(),
    handleBlur: vi.fn(),
    handleSearch: vi.fn(),
    handleManualSearch: vi.fn(),
  }),
}));

describe('HomeClient', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the search hero', () => {
    render(<HomeClient />);

    expect(screen.getByText('home.headline1')).toBeInTheDocument();
  });

  /**
   * HomeClient used to return null when `nightwatch:exploreOnHome` was "true", so the
   * Explore feed could take over /home. Explore is gone and the preference toggle with
   * it — but the key survives in the localStorage of anyone who switched it on. If that
   * gate came back, those users would get a blank home page with no way to clear it,
   * since the control that set it no longer exists.
   */
  it('renders regardless of a stale exploreOnHome preference', () => {
    localStorage.setItem('nightwatch:exploreOnHome', 'true');

    render(<HomeClient />);

    expect(screen.getByText('home.headline1')).toBeInTheDocument();
  });
});
