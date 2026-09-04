import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MusicTrack } from '@/features/music/types';

const mockPathname = vi.fn(() => '/home');
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

vi.mock('@/lib/haptics', () => ({
  hapticMedium: vi.fn(),
  hapticLight: vi.fn(),
  hapticSuccess: vi.fn(),
}));

const storeState = {
  currentTrack: null as MusicTrack | null,
  isPlaying: false,
  expanded: false,
  isRemoteControlling: false,
  remoteTrack: null as MusicTrack | null,
  remoteIsPlaying: false,
  setExpanded: vi.fn(),
  stop: vi.fn(),
  setRemoteControlling: vi.fn(),
};

vi.mock('@/features/music/store/use-music-store', () => ({
  useMusicStore: (selector: (s: typeof storeState) => unknown) =>
    selector(storeState),
}));

import { FloatingDisc } from '@/features/music/components/FloatingDisc';
import { DEFAULT_LONG_PRESS_MS } from '@/hooks/use-long-press';

const track = { id: 't1', title: 'Dune Theme', image: '/a.jpg' } as MusicTrack;

beforeEach(() => {
  vi.useFakeTimers();
  mockPathname.mockReturnValue('/home');
  Object.assign(storeState, {
    currentTrack: track,
    isPlaying: true,
    isRemoteControlling: false,
    remoteTrack: null,
    remoteIsPlaying: false,
  });
  storeState.setExpanded.mockClear();
  storeState.stop.mockClear();
  storeState.setRemoteControlling.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

const disc = () => screen.getByRole('button');

describe('FloatingDisc — visibility', () => {
  it('renders when a track is loaded', () => {
    render(<FloatingDisc />);
    expect(disc()).toBeInTheDocument();
  });

  it('renders nothing without a track', () => {
    storeState.currentTrack = null;
    render(<FloatingDisc />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it.each(['/music', '/watch/1', '/live/1', '/watch-party/1', '/clip/1'])(
    'stays hidden on %s',
    (path) => {
      mockPathname.mockReturnValue(path);
      render(<FloatingDisc />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    },
  );
});

describe('FloatingDisc — tap opens the player', () => {
  it('expands on a short press', () => {
    render(<FloatingDisc />);
    const el = disc();

    act(() => fireEvent.pointerDown(el));
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => fireEvent.pointerUp(el));
    act(() => fireEvent.click(el));

    expect(storeState.setExpanded).toHaveBeenCalledWith(true);
    expect(storeState.stop).not.toHaveBeenCalled();
  });
});

describe('FloatingDisc — hold closes the player', () => {
  it('stops playback entirely rather than pausing', () => {
    render(<FloatingDisc />);
    const el = disc();

    act(() => fireEvent.pointerDown(el));
    act(() => {
      vi.advanceTimersByTime(DEFAULT_LONG_PRESS_MS);
    });

    expect(storeState.stop).toHaveBeenCalledTimes(1);
  });

  it('does not also open the player', () => {
    render(<FloatingDisc />);
    const el = disc();

    act(() => fireEvent.pointerDown(el));
    act(() => {
      vi.advanceTimersByTime(DEFAULT_LONG_PRESS_MS);
    });
    act(() => fireEvent.click(el));

    expect(storeState.setExpanded).not.toHaveBeenCalled();
  });

  it('shows hold feedback while pressing', () => {
    render(<FloatingDisc />);
    const el = disc();

    act(() => fireEvent.pointerDown(el));
    expect(el.className).toContain('scale-90');

    act(() => fireEvent.pointerUp(el));
    expect(el.className).not.toContain('scale-90');
  });

  it('aborts when released early', () => {
    render(<FloatingDisc />);
    const el = disc();

    act(() => fireEvent.pointerDown(el));
    act(() => {
      vi.advanceTimersByTime(DEFAULT_LONG_PRESS_MS - 100);
    });
    act(() => fireEvent.pointerUp(el));
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(storeState.stop).not.toHaveBeenCalled();
  });

  it('stops the other device too when controlling remotely', () => {
    // Clearing locally alone would leave the other device playing on.
    const dispatched: string[] = [];
    const listener = (e: Event) =>
      dispatched.push(String((e as CustomEvent).detail));
    window.addEventListener('music:remote-command', listener);

    Object.assign(storeState, {
      isRemoteControlling: true,
      remoteTrack: track,
      remoteIsPlaying: true,
    });
    render(<FloatingDisc />);
    const el = disc();

    act(() => fireEvent.pointerDown(el));
    act(() => {
      vi.advanceTimersByTime(DEFAULT_LONG_PRESS_MS);
    });

    expect(dispatched).toEqual(['stop']);
    expect(storeState.setRemoteControlling).toHaveBeenCalledWith(
      false,
      null,
      false,
      0,
      0,
      [],
    );
    expect(storeState.stop).toHaveBeenCalledTimes(1);

    window.removeEventListener('music:remote-command', listener);
  });
});

describe('FloatingDisc — keyboard and labelling', () => {
  it('closes on Delete, since a hold is not reachable by keyboard', () => {
    render(<FloatingDisc />);
    fireEvent.keyDown(disc(), { key: 'Delete' });
    expect(storeState.stop).toHaveBeenCalledTimes(1);
  });

  it('closes on Backspace', () => {
    render(<FloatingDisc />);
    fireEvent.keyDown(disc(), { key: 'Backspace' });
    expect(storeState.stop).toHaveBeenCalledTimes(1);
  });

  it('ignores unrelated keys', () => {
    render(<FloatingDisc />);
    fireEvent.keyDown(disc(), { key: 'a' });
    expect(storeState.stop).not.toHaveBeenCalled();
  });

  it('advertises the shortcut and both gestures', () => {
    render(<FloatingDisc />);
    const el = disc();
    expect(el).toHaveAttribute('aria-keyshortcuts', 'Delete');
    expect(el).toHaveAttribute('title', 'disc.holdToClose');
    expect(el).toHaveAttribute(
      'aria-label',
      expect.stringContaining('disc.nowPlaying'),
    );
  });

  it('leaves the artwork out of the accessible name', () => {
    // The button is already labelled; an alt would just repeat it. An empty alt
    // also removes the img role, which is the point.
    const { container } = render(<FloatingDisc />);
    expect(container.querySelector('img')).toHaveAttribute('alt', '');
  });
});
