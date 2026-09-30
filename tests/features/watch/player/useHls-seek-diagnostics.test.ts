/**
 * Tests for the seek-storm diagnostics added to `video_error` (SEEKING.md §7).
 *
 * The argument in SEEKING.md is that the decode errors are largely produced by our own
 * seek storms rather than by the content alone. These fields are what decide it in the
 * field, on the paths a local test cannot reach — the scrub drag, and the watch-party
 * guest running drift correction:
 *
 * - `seeksInLastSecond` should be 1 for a deliberate gesture. Measured at 2 per keypress
 *   before `a4a8fba6`; the scrub bar still commits a seek per pointermove.
 * - `msSinceLastSeek` / `followedSeek` separate seek-induced failures from the
 *   backgrounded-tab decoder rebuild, which arrives with no recent seek at all.
 * - `secondsSincePlaybackStart` catches D2's resume-on-load seek.
 * - `isWatchPartyGuest` tests D4, which is invisible in the single-viewer case.
 * - `reloadDecoderRecoveries` should approach 0 once D5 stops learning by failing.
 */
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type EventHandler = (...args: unknown[]) => void;

const { mockHls, eventHandlers, MockHlsClass } = vi.hoisted(() => {
  const eventHandlers = new Map<string, EventHandler[]>();
  const mockHls = {
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    startLoad: vi.fn(),
    stopLoad: vi.fn(),
    recoverMediaError: vi.fn(),
    swapAudioCodec: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn((event: string, handler: EventHandler) => {
      const handlers = eventHandlers.get(event) || [];
      handlers.push(handler);
      eventHandlers.set(event, handlers);
    }),
    levels: [{ height: 1080, bitrate: 5000000 }],
    currentLevel: -1,
    audioTrack: -1,
    audioTracks: [] as unknown[],
  };
  const MockHlsClass = vi.fn(function MockHls() {
    return mockHls;
  });
  Object.defineProperty(MockHlsClass, 'isSupported', {
    value: vi.fn(() => true),
    configurable: true,
  });
  Object.defineProperty(MockHlsClass, 'Events', {
    value: {
      MANIFEST_PARSED: 'hlsManifestParsed',
      FRAG_LOADED: 'hlsFragLoaded',
      AUDIO_TRACK_SWITCHED: 'hlsAudioTrackSwitched',
      AUDIO_TRACKS_UPDATED: 'hlsAudioTracksUpdated',
      LEVEL_SWITCHED: 'hlsLevelSwitched',
      ERROR: 'hlsError',
    },
    configurable: true,
  });
  Object.defineProperty(MockHlsClass, 'ErrorTypes', {
    value: {
      NETWORK_ERROR: 'networkError',
      MEDIA_ERROR: 'mediaError',
      OTHER_ERROR: 'otherError',
    },
    configurable: true,
  });
  Object.defineProperty(MockHlsClass, 'ErrorDetails', {
    value: {
      FRAG_LOAD_ERROR: 'fragLoadError',
      LEVEL_LOAD_ERROR: 'levelLoadError',
      MANIFEST_LOAD_ERROR: 'manifestLoadError',
      BUFFER_STALLED_ERROR: 'bufferStalledError',
    },
    configurable: true,
  });
  return { mockHls, eventHandlers, MockHlsClass };
});

const { mockTrackEvent } = vi.hoisted(() => ({
  mockTrackEvent: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  reportError: vi.fn(),
  trackEvent: mockTrackEvent,
}));

vi.mock('hls.js', () => ({ default: MockHlsClass }));

import { useHls } from '@/features/watch/player/hooks/useHls';

function triggerEvent(eventName: string, data?: unknown) {
  for (const handler of eventHandlers.get(eventName) || []) {
    handler(eventName, data);
  }
}

function createVideoRef() {
  const video = document.createElement('video');
  video.canPlayType = vi.fn(() => '') as unknown as typeof video.canPlayType;
  return { current: video };
}

/** The last `video_error` payload sent to analytics. */
function lastVideoError(): Record<string, unknown> {
  const calls = mockTrackEvent.mock.calls.filter((c) => c[0] === 'video_error');
  expect(calls.length).toBeGreaterThan(0);
  return calls.at(-1)?.[1] as Record<string, unknown>;
}

/** A fatal media error, the shape that drives the recovery path. */
function fatalMediaError() {
  act(() => {
    triggerEvent('hlsError', {
      fatal: true,
      type: 'mediaError',
      details: 'bufferStalledError',
    });
  });
}

describe('video_error seek diagnostics (SEEKING.md §7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers.clear();
    mockHls.on.mockImplementation((event: string, handler: EventHandler) => {
      const handlers = eventHandlers.get(event) || [];
      handlers.push(handler);
      eventHandlers.set(event, handlers);
    });
    mockHls.currentLevel = -1;
    mockHls.audioTrack = -1;
    mockHls.audioTracks = [];
    MockHlsClass.mockImplementation(function MockHls() {
      return mockHls;
    });
  });

  /** hls.js is loaded asynchronously, so the ERROR handler is not registered on mount. */
  async function mount(opts: { isWatchPartyGuest?: boolean } = {}) {
    const videoRef = createVideoRef();
    renderHook(() =>
      useHls({
        videoRef,
        streamUrl: 'https://example.com/stream.m3u8',
        dispatch: vi.fn(),
        ...opts,
      }),
    );
    await vi.waitFor(() => {
      expect(eventHandlers.has('hlsError')).toBe(true);
    });
    return { videoRef };
  }

  it('reports zero seeks when the failure followed no seek at all', async () => {
    await mount();

    fatalMediaError();

    const payload = lastVideoError();
    expect(payload.seeksInLastSecond).toBe(0);
    expect(payload.msSinceLastSeek).toBeNull();
    expect(payload.followedSeek).toBe(false);
  });

  /** One gesture, one seek — the number P0 is meant to produce. */
  it('reports a single seek after one seeking event', async () => {
    const { videoRef } = await mount();

    act(() => {
      videoRef.current.dispatchEvent(new Event('seeking'));
    });
    fatalMediaError();

    const payload = lastVideoError();
    expect(payload.seeksInLastSecond).toBe(1);
    expect(payload.followedSeek).toBe(true);
  });

  /** A scrub drag, which still commits a seek per pointermove. */
  it('counts a burst of seeks, which is what a storm looks like', async () => {
    const { videoRef } = await mount();

    act(() => {
      for (let i = 0; i < 40; i++) {
        videoRef.current.dispatchEvent(new Event('seeking'));
      }
    });
    fatalMediaError();

    expect(lastVideoError().seeksInLastSecond).toBe(40);
  });

  /**
   * Live is included deliberately: the re-prime `seeking` handler is VOD-only, so
   * measuring the seek rate through it would have missed the live path entirely.
   */
  it('counts seeks on the live path too', async () => {
    const videoRef = createVideoRef();
    renderHook(() =>
      useHls({
        videoRef,
        streamUrl: 'https://example.com/live.m3u8',
        dispatch: vi.fn(),
        isLive: true,
      }),
    );
    await vi.waitFor(() => {
      expect(eventHandlers.has('hlsError')).toBe(true);
    });

    act(() => {
      videoRef.current.dispatchEvent(new Event('seeking'));
    });
    fatalMediaError();

    expect(lastVideoError().seeksInLastSecond).toBe(1);
  });

  it('reports no playback start until the element has played', async () => {
    await mount();

    fatalMediaError();

    expect(lastVideoError().secondsSincePlaybackStart).toBeNull();
  });

  it('reports seconds since playback started once it has', async () => {
    const { videoRef } = await mount();

    act(() => {
      videoRef.current.dispatchEvent(new Event('playing'));
    });
    fatalMediaError();

    expect(lastVideoError().secondsSincePlaybackStart).toBe(0);
  });

  it('tags host sessions as not a watch-party guest', async () => {
    await mount();

    fatalMediaError();

    expect(lastVideoError().isWatchPartyGuest).toBe(false);
  });

  /** The field that makes D4 testable at all. */
  it('tags watch-party guest sessions', async () => {
    await mount({ isWatchPartyGuest: true });

    fatalMediaError();

    expect(lastVideoError().isWatchPartyGuest).toBe(true);
  });

  it('starts the reload-decoder recovery count at zero', async () => {
    await mount();

    fatalMediaError();

    expect(lastVideoError().reloadDecoderRecoveries).toBe(0);
  });

  /** Guards against the new fields displacing the ones already relied on. */
  it('still reports the original diagnostics', async () => {
    await mount();

    fatalMediaError();

    const payload = lastVideoError();
    expect(payload).toMatchObject({
      type: 'mediaError',
      details: 'bufferStalledError',
      fatal: true,
    });
    expect(payload).toHaveProperty('currentLevel');
    expect(payload).toHaveProperty('videoReadyState');
    expect(payload).toHaveProperty('buffered');
  });
});
