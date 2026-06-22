import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockUseFocusable = vi.fn(() => ({
  ref: { current: null },
  focused: false,
}));

vi.mock('@noriginmedia/norigin-spatial-navigation', () => ({
  useFocusable: () => mockUseFocusable(),
  FocusContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
  },
  init: vi.fn(),
  setKeyMap: vi.fn(),
}));

import { TvButton } from '@/platforms/smart-tv/components/TvButton';

describe('TvButton', () => {
  it('renders with label text', () => {
    render(<TvButton label="Play" />);
    expect(screen.getByText('Play')).toBeInTheDocument();
  });

  it('renders with icon when provided', () => {
    render(<TvButton label="Play" icon="play_arrow" />);
    expect(screen.getByText('play_arrow')).toBeInTheDocument();
  });

  it('renders without icon when not provided', () => {
    const { container } = render(<TvButton label="Play" />);
    expect(
      container.querySelector('.material-symbols-outlined'),
    ).not.toBeInTheDocument();
  });

  it('applies focused styles when focused', () => {
    mockUseFocusable.mockReturnValue({ ref: { current: null }, focused: true });
    render(<TvButton label="Focused" />);
    expect(screen.getByRole('button')).toHaveClass('bg-indigo-500');
  });
});
