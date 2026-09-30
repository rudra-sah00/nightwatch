/**
 * Regression tests for PLAYER_AUDIT H1 — the native MP4 load watchdog fired even after
 * the video had loaded successfully.
 *
 * `useMp4` arms a 20 s timer on Capacitor platforms so an unplayable stream (a CF Worker
 * response AVPlayer cannot decode, say) triggers `onStreamExpired()` and gets retried.
 * The timer was only ever cleared by the effect cleanup, and the effect's deps are
 * `[streamUrl, videoRef, dispatch]` — none of which change while playback continues.
 * `handleLoadedMetadata` did not clear it.
 *
 * So on iOS, Android and Android TV, *every* successful MP4 playback fired the watchdog
 * 20 seconds in: a full stream refetch and engine remount mid-view. Given NetMirror
 * "server 2" serves progressive MP4, that covered a large share of mobile VOD.
 */
import { act, renderHook } from '@testing-library/react';
import type { Dispatch } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from 'vitest';
import type { PlayerAction } from '@/features/watch/player/context/types';
import { useMp4 } from '@/features/watch/player/hooks/useMp4';

const STREAM = 'https://cdn.example.com/movie.mp4';
/** Matches WATCHDOG_MS in useMp4. */
const WATCHDOG_MS = 20000;

/** Pretends we are running inside the Capacitor WebView, which arms the watchdog. */
function setNative(isNative: boolean) {
  (
    window as unknown as {
      Capacitor?: { isNativePlatform: () => boolean };
    }
  ).Capacitor = { isNativePlatform: () => isNative };
}

describe('useMp4 native load watchdog (PLAYER_AUDIT H1)', () => {
  let dispatch: Dispatch<PlayerAction>;
  let onStreamExpired: Mock<() => void>;
  let videoRef: { current: HTMLVideoElement };

  beforeEach(() => {
    vi.useFakeTimers();
    dispatch = vi.fn() as unknown as Dispatch<PlayerAction>;
    onStreamExpired = vi.fn<() => void>();
    const video = document.createElement('video');
    // happy-dom does not implement playback; the hook calls play() on metadata.
    video.play = vi.fn().mockResolvedValue(undefined);
    videoRef = { current: video };
    setNative(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    (window as unknown as { Capacitor?: unknown }).Capacitor = undefined;
  });

  function mount() {
    return renderHook(() =>
      useMp4({ videoRef, streamUrl: STREAM, dispatch, onStreamExpired }),
    );
  }

  /** The defect: a successful load must disarm the watchdog. */
  it('does not expire the stream after a successful load', () => {
    mount();

    act(() => {
      videoRef.current.dispatchEvent(new Event('loadedmetadata'));
    });
    act(() => {
      vi.advanceTimersByTime(WATCHDOG_MS + 1000);
    });

    expect(onStreamExpired).not.toHaveBeenCalled();
  });

  /** The watchdog must still do its job when metadata never arrives. */
  it('still expires the stream when metadata never arrives', () => {
    mount();

    act(() => {
      vi.advanceTimersByTime(WATCHDOG_MS + 1);
    });

    expect(onStreamExpired).toHaveBeenCalledTimes(1);
  });

  it('does not expire before the watchdog interval elapses', () => {
    mount();

    act(() => {
      vi.advanceTimersByTime(WATCHDOG_MS - 1);
    });

    expect(onStreamExpired).not.toHaveBeenCalled();
  });

  /**
   * With no `onStreamExpired` to retry through, the watchdog surfaces an error instead.
   * That branch must also stop firing once the video has loaded.
   */
  it('does not raise a load error after a successful load', () => {
    const noExpiry = renderHook(() =>
      useMp4({ videoRef, streamUrl: STREAM, dispatch }),
    );

    act(() => {
      videoRef.current.dispatchEvent(new Event('loadedmetadata'));
    });
    act(() => {
      vi.advanceTimersByTime(WATCHDOG_MS + 1000);
    });

    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Video failed to load' }),
    );
    noExpiry.unmount();
  });

  /** On the web the watchdog is not armed at all, loaded or not. */
  it('is not armed on non-native platforms', () => {
    setNative(false);
    mount();

    act(() => {
      vi.advanceTimersByTime(WATCHDOG_MS + 1000);
    });

    expect(onStreamExpired).not.toHaveBeenCalled();
  });
});

/**
 * Regression tests for PLAYER_AUDIT H12 — rapid quality switching orphaned `loadedmetadata`
 * listeners.
 *
 * Each `setQuality` added a fresh listener that removed itself from inside, so switching twice
 * before the first fired left both attached and both ran. The earlier one restored the position
 * captured before the first switch, so the playhead jumped to the wrong place — and on open-GOP
 * content that extra seek is another chance at a decode error. The main effect's cleanup could
 * not help; it has no reference to those closures.
 */
describe('useMp4 quality switching (PLAYER_AUDIT H12)', () => {
  const QUALITIES = [
    { quality: '1080p', url: 'https://cdn.example.com/1080.mp4' },
    { quality: '720p', url: 'https://cdn.example.com/720.mp4' },
    { quality: '480p', url: 'https://cdn.example.com/480.mp4' },
  ];

  function mountWithQualities() {
    const video = document.createElement('video');
    video.play = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(video, 'paused', {
      configurable: true,
      value: false,
    });
    const writes: number[] = [];
    let current = 300;
    Object.defineProperty(video, 'currentTime', {
      configurable: true,
      get: () => current,
      set: (t: number) => {
        current = t;
        writes.push(t);
      },
    });
    const ref = { current: video };
    const hook = renderHook(() =>
      useMp4({
        videoRef: ref,
        streamUrl: STREAM,
        dispatch: vi.fn() as unknown as Dispatch<PlayerAction>,
        manualQualities: QUALITIES,
      }),
    );
    return { video, writes, hook };
  }

  it('restores the position once when two switches race', () => {
    const { video, writes, hook } = mountWithQualities();

    act(() => {
      hook.result.current.setQuality(1);
      hook.result.current.setQuality(2);
    });
    act(() => {
      video.dispatchEvent(new Event('loadedmetadata'));
    });

    // Two orphaned listeners both restored, one from a stale captured position.
    expect(writes).toHaveLength(1);
  });

  it('leaves no restore listener attached after it has fired', () => {
    const { video, writes, hook } = mountWithQualities();

    act(() => {
      hook.result.current.setQuality(1);
    });
    act(() => {
      video.dispatchEvent(new Event('loadedmetadata'));
    });
    const afterFirst = writes.length;
    act(() => {
      video.dispatchEvent(new Event('loadedmetadata'));
    });

    expect(writes).toHaveLength(afterFirst);
  });

  it('does not restore after unmount', () => {
    const { video, writes, hook } = mountWithQualities();

    act(() => {
      hook.result.current.setQuality(1);
    });
    hook.unmount();
    act(() => {
      video.dispatchEvent(new Event('loadedmetadata'));
    });

    expect(writes).toEqual([]);
  });
});
