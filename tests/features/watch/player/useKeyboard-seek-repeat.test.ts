/**
 * Arrow-key seek must not machine-gun on key auto-repeat.
 *
 * Holding an arrow key makes the OS emit a `keydown` every ~15-30ms (the same
 * repeat behaviour the Space hold-to-boost logic in this hook already accounts
 * for). The seek cases had no guard, so one held key issued a 10-second seek per
 * repeat tick — tens of seeks a second.
 *
 * That is what surfaced as a playback error rather than as fast seeking. Each
 * `seeking` event makes hls.js abort the fragment loads in flight and start new
 * ones, and on this content it can also re-prime the buffer (`stopLoad()` +
 * `startLoad(t)`, see useHls). Dozens of those per second exhausts
 * `fragLoadingMaxRetry` and escalates to a fatal error, which the ERROR handler
 * reports as "Playback error occurred" — while the network panel shows segments
 * being requested and immediately cancelled.
 *
 * The contract:
 * - one physical press          → exactly one 10s seek
 * - held key (auto-repeat)      → still one seek, not one per tick
 * - separate presses            → one seek each, so tapping still works
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKeyboard } from '@/features/watch/player/hooks/useKeyboard';

vi.mock('@/lib/electron-bridge', () => ({
  checkIsDesktop: () => false,
  desktopBridge: {},
}));

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
    currentTime: 100,
    duration: 7200,
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

function setup(video: FakeVideo) {
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
      disabled: false,
      isLive: false,
      allowSpeedBoost: true,
    }),
  );
  return { dispatch };
}

const press = (code: string, over: Partial<KeyboardEventInit> = {}) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code, ...over }));
  });

/** A full keystroke: press, release, and let the release settle. */
const tap = (code: string) =>
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code }));
    vi.advanceTimersByTime(120);
  });

describe('arrow-key seek auto-repeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('seeks once for a single press', () => {
    const video = makeVideo({ currentTime: 100 });
    setup(video);

    press('ArrowRight');

    expect(video.currentTime).toBe(110);
  });

  it('ignores auto-repeat ticks while the key is held', () => {
    const video = makeVideo({ currentTime: 100 });
    setup(video);

    // One physical press, then 20 repeat ticks at the OS repeat rate.
    press('ArrowRight');
    for (let i = 0; i < 20; i++) {
      act(() => {
        vi.advanceTimersByTime(25);
      });
      press('ArrowRight', { repeat: true });
    }

    // Without the guard this lands at 100 + 21*10 = 310.
    expect(video.currentTime).toBe(110);
  });

  it('still seeks on each separate press', () => {
    const video = makeVideo({ currentTime: 100 });
    setup(video);

    // Three real keystrokes: +10, +10, −10.
    tap('ArrowRight');
    tap('ArrowRight');
    tap('ArrowLeft');

    expect(video.currentTime).toBe(110);
  });

  it('applies the same guard to J and L', () => {
    const video = makeVideo({ currentTime: 100 });
    setup(video);

    press('KeyL');
    for (let i = 0; i < 10; i++) {
      act(() => {
        vi.advanceTimersByTime(25);
      });
      press('KeyL', { repeat: true });
    }

    expect(video.currentTime).toBe(110);
  });

  /*
    Platforms that do not flag auto-repeat.

    The hook's own header notes that some platforms (X11, and some
    Electron/remote-input setups) emit a full keydown/keyup pair per repeat tick
    with `repeat` never set, so `e.repeat` alone cannot catch a held key there.
    The release settle window does: a keyup followed immediately by another
    keydown for the same key means the key was never really released.
  */
  it('treats keydown/keyup repeat pairs as one held key', () => {
    const video = makeVideo({ currentTime: 100 });
    setup(video);

    press('ArrowRight');
    for (let i = 0; i < 20; i++) {
      act(() => {
        vi.advanceTimersByTime(20);
      });
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight' }));
      press('ArrowRight');
    }

    expect(video.currentTime).toBe(110);
  });
});
