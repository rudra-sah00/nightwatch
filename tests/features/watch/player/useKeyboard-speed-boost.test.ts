/**
 * Tests for YouTube-style hold-Space-to-speed-up in the player keyboard layer.
 *
 * The contract:
 * - tap Space  → play/pause toggle (resolved on keyup)
 * - hold Space → 2x until release, then restore the user's chosen rate
 * - already ≥2x → rate untouched, and release must not pause
 * - paused      → hold falls back to the tap behaviour (starts playback)
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKeyboard } from '@/features/watch/player/hooks/useKeyboard';

vi.mock('@/lib/electron-bridge', () => ({
  checkIsDesktop: () => false,
  desktopBridge: {},
}));

const HOLD_MS = 250;
const SETTLE_MS = 70;

type FakeVideo = {
  paused: boolean;
  playbackRate: number;
  volume: number;
  muted: boolean;
  currentTime: number;
  duration: number;
  seekable: { length: number };
  buffered: { length: number };
  play: () => Promise<void>;
  pause: () => void;
};

function makeVideo(over: Partial<FakeVideo> = {}): FakeVideo {
  const v: FakeVideo = {
    paused: false,
    playbackRate: 1,
    volume: 1,
    muted: false,
    currentTime: 10,
    duration: 100,
    seekable: { length: 0 },
    buffered: { length: 0 },
    play: vi.fn(async () => {
      v.paused = false;
    }),
    pause: vi.fn(() => {
      v.paused = true;
    }),
    ...over,
  };
  return v;
}

function setup(
  video: FakeVideo,
  opts: {
    disabled?: boolean;
    isLive?: boolean;
    allowSpeedBoost?: boolean;
  } = {},
) {
  const dispatch = vi.fn();
  renderHook(() =>
    useKeyboard({
      videoRef: { current: video as unknown as HTMLVideoElement },
      containerRef: { current: null },
      dispatch,
      isFullscreen: false,
      onBack: vi.fn(),
      currentSubtitleTrack: null,
      onToggleCaptions: vi.fn(),
      hasNextEpisode: false,
      onNextEpisode: vi.fn(),
      disabled: opts.disabled ?? false,
      isLive: opts.isLive ?? false,
      allowSpeedBoost: opts.allowSpeedBoost ?? true,
    }),
  );
  return { dispatch };
}

const down = (over: Partial<KeyboardEventInit> = {}) =>
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'Space', ...over }),
    );
  });

/** Release and let the settle window elapse so the gesture actually resolves. */
const up = () =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    vi.advanceTimersByTime(SETTLE_MS + 10);
  });

/** Release without waiting — the gesture is still provisionally open. */
const upOnly = () =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
  });

const hold = (ms = HOLD_MS + 50) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('hold Space to speed up', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('a quick tap toggles play/pause and never changes rate', () => {
    const video = makeVideo();
    setup(video);

    down();
    up();

    expect(video.pause).toHaveBeenCalledTimes(1);
    expect(video.playbackRate).toBe(1);
  });

  it('does not toggle play on key-down, only on release', () => {
    const video = makeVideo();
    setup(video);

    down();
    expect(video.pause).not.toHaveBeenCalled();

    up();
    expect(video.pause).toHaveBeenCalledTimes(1);
  });

  it('holding raises the rate to 2x', () => {
    const video = makeVideo();
    const { dispatch } = setup(video);

    down();
    hold();

    expect(video.playbackRate).toBe(2);
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_SPEED_BOOST',
      isSpeedBoosted: true,
    });
  });

  it('releasing restores the previous rate and does not pause', () => {
    const video = makeVideo({ playbackRate: 1.5 });
    const { dispatch } = setup(video);

    down();
    hold();
    expect(video.playbackRate).toBe(2);

    up();
    expect(video.playbackRate).toBe(1.5);
    expect(video.pause).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_SPEED_BOOST',
      isSpeedBoosted: false,
    });
  });

  it('leaves the rate alone when already at 2x, and still does not pause', () => {
    const video = makeVideo({ playbackRate: 2 });
    const { dispatch } = setup(video);

    down();
    hold();
    expect(video.playbackRate).toBe(2);

    up();
    expect(video.playbackRate).toBe(2);
    expect(video.pause).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalledWith({
      type: 'SET_SPEED_BOOST',
      isSpeedBoosted: true,
    });
  });

  it('leaves the rate alone when above 2x', () => {
    const video = makeVideo({ playbackRate: 2.5 });
    setup(video);

    down();
    hold();
    up();

    expect(video.playbackRate).toBe(2.5);
  });

  it('holding while paused starts playback instead of boosting', () => {
    const video = makeVideo({ paused: true });
    setup(video);

    down();
    hold();
    expect(video.playbackRate).toBe(1);

    up();
    expect(video.play).toHaveBeenCalledTimes(1);
  });

  it('ignores auto-repeat so a long hold boosts only once', () => {
    const video = makeVideo();
    const { dispatch } = setup(video);

    down();
    down({ repeat: true });
    down({ repeat: true });
    hold();

    const boosts = dispatch.mock.calls.filter(
      (c) => c[0].type === 'SET_SPEED_BOOST' && c[0].isSpeedBoosted,
    );
    expect(boosts).toHaveLength(1);
    expect(video.playbackRate).toBe(2);
  });

  it('restores the rate if focus is lost mid-hold (no keyup arrives)', () => {
    const video = makeVideo();
    setup(video);

    down();
    hold();
    expect(video.playbackRate).toBe(2);

    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(video.playbackRate).toBe(1);
  });

  it('restores the rate when the tab is hidden mid-hold', () => {
    const video = makeVideo();
    setup(video);

    down();
    hold();

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(video.playbackRate).toBe(1);
  });

  it('does not boost on live streams (HLS drives its own catch-up rate)', () => {
    const video = makeVideo();
    setup(video, { isLive: true });

    down();
    hold();
    expect(video.playbackRate).toBe(1);

    // Still behaves as a play/pause tap.
    up();
    expect(video.pause).toHaveBeenCalledTimes(1);
  });

  it('does not boost when disabled via allowSpeedBoost (watch party)', () => {
    const video = makeVideo();
    setup(video, { allowSpeedBoost: false });

    down();
    hold();
    expect(video.playbackRate).toBe(1);

    up();
    expect(video.pause).toHaveBeenCalledTimes(1);
  });

  it('is inert for read-only viewers (watch party guests)', () => {
    const video = makeVideo();
    setup(video, { disabled: true });

    down();
    hold();
    up();

    expect(video.playbackRate).toBe(1);
    expect(video.pause).not.toHaveBeenCalled();
    expect(video.play).not.toHaveBeenCalled();
  });

  it('ignores Space typed into a text field', () => {
    const video = makeVideo();
    setup(video);

    const input = document.createElement('input');
    document.body.appendChild(input);
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'Space', bubbles: true }),
      );
    });
    hold();

    expect(video.playbackRate).toBe(1);
    expect(video.pause).not.toHaveBeenCalled();
    input.remove();
  });

  /**
   * The bug this guards: on platforms that emit a keydown/keyup PAIR per auto-repeat
   * tick (X11, some Electron/remote-input setups) every tick used to resolve as a tap,
   * so holding Space machine-gunned play/pause and never reached the hold threshold.
   */
  it('treats repeated keydown/keyup pairs as one continuous hold', () => {
    const video = makeVideo();
    setup(video);

    // ~30ms repeat ticks, each a full down/up pair, for 600ms.
    down();
    for (let i = 0; i < 20; i++) {
      upOnly();
      act(() => {
        vi.advanceTimersByTime(30);
      });
      down();
    }

    // One continuous hold: boosted, and playback never toggled.
    expect(video.playbackRate).toBe(2);
    expect(video.pause).not.toHaveBeenCalled();
    expect(video.play).not.toHaveBeenCalled();

    up();
    expect(video.playbackRate).toBe(1);
    expect(video.pause).not.toHaveBeenCalled();
  });

  it('a keyup inside the settle window does not yet toggle play', () => {
    const video = makeVideo();
    setup(video);

    down();
    upOnly();
    expect(video.pause).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(SETTLE_MS + 10);
    });
    expect(video.pause).toHaveBeenCalledTimes(1);
  });

  it('a second hold after a release boosts again', () => {
    const video = makeVideo();
    setup(video);

    down();
    hold();
    up();
    expect(video.playbackRate).toBe(1);

    down();
    hold();
    expect(video.playbackRate).toBe(2);
    up();
    expect(video.playbackRate).toBe(1);
  });
});
