import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Track all registered event handlers per hls instance
type EventHandler = (...args: unknown[]) => void;

// vi.hoisted ensures these are available before vi.mock factories run
const { mockHls, eventHandlers, MockHlsClass } = vi.hoisted(() => {
  const eventHandlers = new Map<string, EventHandler[]>();

  const mockHls = {
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    startLoad: vi.fn(),
    recoverMediaError: vi.fn(),
    swapAudioCodec: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn((event: string, handler: EventHandler) => {
      const handlers = eventHandlers.get(event) || [];
      handlers.push(handler);
      eventHandlers.set(event, handlers);
    }),
    levels: [
      { height: 1080, bitrate: 5000000 },
      { height: 720, bitrate: 2500000 },
    ],
    currentLevel: -1,
    audioTrack: -1,
    audioTracks: [] as unknown[],
  };

  // Use a proper function so `new MockHlsClass()` works correctly
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

  return {
    mockHls,
    eventHandlers,
    MockHlsClass,
  };
});

const { mockReportError, mockTrackEvent } = vi.hoisted(() => ({
  mockReportError: vi.fn(),
  mockTrackEvent: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  reportError: mockReportError,
  trackEvent: mockTrackEvent,
}));

vi.mock('hls.js', () => ({
  default: MockHlsClass,
}));

// Import AFTER mocks are set up
import { useHls } from '@/features/watch/player/hooks/useHls';

function triggerEvent(eventName: string, data?: unknown) {
  const handlers = eventHandlers.get(eventName) || [];
  for (const handler of handlers) {
    handler(eventName, data);
  }
}

function createVideoRef() {
  const video = document.createElement('video');
  // Add canPlayType stub
  video.canPlayType = vi.fn(() => '') as unknown as typeof video.canPlayType;
  return { current: video };
}

describe('useHls', () => {
  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers.clear();
    // Re-set the on() implementation after clearAllMocks
    mockHls.on.mockImplementation((event: string, handler: EventHandler) => {
      const handlers = eventHandlers.get(event) || [];
      handlers.push(handler);
      eventHandlers.set(event, handlers);
    });
    // Reset mutable properties
    mockHls.currentLevel = -1;
    mockHls.audioTrack = -1;
    mockHls.audioTracks = [];
    mockHls.levels = [
      { height: 1080, bitrate: 5000000 },
      { height: 720, bitrate: 2500000 },
    ];
    // Re-set constructor implementation after clearAllMocks
    MockHlsClass.mockImplementation(function MockHls() {
      return mockHls;
    });
  });

  it('should not initialize when streamUrl is null', () => {
    const videoRef = createVideoRef();

    renderHook(() =>
      useHls({
        videoRef,
        streamUrl: null,
        dispatch: mockDispatch,
      }),
    );

    expect(MockHlsClass).not.toHaveBeenCalled();
  });

  it('should not initialize when videoRef is null', () => {
    renderHook(() =>
      useHls({
        videoRef: { current: null },
        streamUrl: 'https://example.com/stream.m3u8',
        dispatch: mockDispatch,
      }),
    );

    expect(MockHlsClass).not.toHaveBeenCalled();
  });

  it('should initialize HLS and load source', async () => {
    const videoRef = createVideoRef();

    renderHook(() =>
      useHls({
        videoRef,
        streamUrl: 'https://example.com/stream.m3u8',
        dispatch: mockDispatch,
      }),
    );

    // Wait for async import to resolve
    await vi.waitFor(() => {
      expect(mockHls.loadSource).toHaveBeenCalledWith(
        'https://example.com/stream.m3u8',
      );
    });

    expect(mockHls.attachMedia).toHaveBeenCalledWith(videoRef.current);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_ERROR',
      error: null,
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_LOADING',
      isLoading: true,
    });
  });

  it('should dispatch qualities on MANIFEST_PARSED', async () => {
    const videoRef = createVideoRef();

    renderHook(() =>
      useHls({
        videoRef,
        streamUrl: 'https://example.com/stream.m3u8',
        dispatch: mockDispatch,
      }),
    );

    await vi.waitFor(() => {
      expect(eventHandlers.has('hlsManifestParsed')).toBe(true);
    });

    act(() => {
      triggerEvent('hlsManifestParsed', {
        levels: [
          { height: 1080, bitrate: 5000000 },
          { height: 720, bitrate: 2500000 },
        ],
        audioTracks: [],
      });
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_LOADING',
      isLoading: false,
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_QUALITIES',
      qualities: expect.arrayContaining([
        expect.objectContaining({ height: 1080 }),
        expect.objectContaining({ height: 720 }),
      ]),
    });
  });

  it('should dispatch audio tracks on MANIFEST_PARSED', async () => {
    const videoRef = createVideoRef();

    renderHook(() =>
      useHls({
        videoRef,
        streamUrl: 'https://example.com/stream.m3u8',
        dispatch: mockDispatch,
      }),
    );

    await vi.waitFor(() => {
      expect(eventHandlers.has('hlsManifestParsed')).toBe(true);
    });

    act(() => {
      triggerEvent('hlsManifestParsed', {
        levels: [],
        audioTracks: [
          { name: 'English', lang: 'en', default: true },
          { name: 'Spanish', lang: 'es', default: false },
        ],
      });
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_AUDIO_TRACKS',
      audioTracks: [
        { id: '0', label: 'English', language: 'en', isDefault: true },
        { id: '1', label: 'Spanish', language: 'es', isDefault: false },
      ],
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_CURRENT_AUDIO_TRACK',
      trackId: '0',
    });
  });

  it('should handle AUDIO_TRACK_SWITCHED event', async () => {
    const videoRef = createVideoRef();

    renderHook(() =>
      useHls({
        videoRef,
        streamUrl: 'https://example.com/stream.m3u8',
        dispatch: mockDispatch,
      }),
    );

    await vi.waitFor(() => {
      expect(eventHandlers.has('hlsAudioTrackSwitched')).toBe(true);
    });

    act(() => {
      triggerEvent('hlsAudioTrackSwitched', { id: 1 });
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_CURRENT_AUDIO_TRACK',
      trackId: '1',
    });
  });

  it('should handle AUDIO_TRACKS_UPDATED event', async () => {
    const videoRef = createVideoRef();

    renderHook(() =>
      useHls({
        videoRef,
        streamUrl: 'https://example.com/stream.m3u8',
        dispatch: mockDispatch,
      }),
    );

    await vi.waitFor(() => {
      expect(eventHandlers.has('hlsAudioTracksUpdated')).toBe(true);
    });

    act(() => {
      triggerEvent('hlsAudioTracksUpdated', {
        audioTracks: [{ name: 'French', lang: 'fr', default: false }],
      });
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_AUDIO_TRACKS',
      audioTracks: [
        { id: '0', label: 'French', language: 'fr', isDefault: true },
      ],
    });
  });

  it('should handle LEVEL_SWITCHED event', async () => {
    const videoRef = createVideoRef();

    renderHook(() =>
      useHls({
        videoRef,
        streamUrl: 'https://example.com/stream.m3u8',
        dispatch: mockDispatch,
      }),
    );

    await vi.waitFor(() => {
      expect(eventHandlers.has('hlsLevelSwitched')).toBe(true);
    });

    act(() => {
      triggerEvent('hlsLevelSwitched', { level: 0 });
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_CURRENT_QUALITY',
      quality: '1080p',
    });
  });

  it('should ignore LEVEL_SWITCHED event if level is not found', async () => {
    const videoRef = createVideoRef();

    renderHook(() =>
      useHls({
        videoRef,
        streamUrl: 'https://example.com/stream.m3u8',
        dispatch: mockDispatch,
      }),
    );

    await vi.waitFor(() => {
      expect(eventHandlers.has('hlsLevelSwitched')).toBe(true);
    });

    mockDispatch.mockClear();

    act(() => {
      triggerEvent('hlsLevelSwitched', { level: 999 }); // Invalid index
    });

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_CURRENT_QUALITY' }),
    );
  });

  it('should handle MEDIA_ERROR with recoverMediaError', async () => {
    const videoRef = createVideoRef();

    renderHook(() =>
      useHls({
        videoRef,
        streamUrl: 'https://example.com/stream.m3u8',
        dispatch: mockDispatch,
      }),
    );

    await vi.waitFor(() => {
      expect(eventHandlers.has('hlsError')).toBe(true);
    });

    act(() => {
      triggerEvent('hlsError', {
        fatal: true,
        type: 'mediaError',
        details: 'bufferStalledError',
      });
    });

    expect(mockHls.recoverMediaError).toHaveBeenCalled();
  });

  /**
   * These streams are open-GOP — segments begin on non-IDR frames, which Chrome promotes
   * to keyframes for MSE random access. That leaves sub-frame holes at fragment joins, and
   * hls.js's default 0.1s tolerance is tight enough that a seek lands in one and stalls
   * rather than nudging over it. The live branch already carried 0.5 for this reason while
   * VOD sat on the default.
   */
  describe('VOD gap handling on seek', () => {
    const configFor = async (isLive: boolean) => {
      const videoRef = createVideoRef();
      renderHook(() =>
        useHls({
          videoRef,
          streamUrl: 'https://example.com/stream.m3u8',
          dispatch: mockDispatch,
          isLive,
        }),
      );
      await vi.waitFor(() => {
        expect(MockHlsClass).toHaveBeenCalled();
      });
      const calls = MockHlsClass.mock.calls as unknown as unknown[][];
      return (calls.at(-1)?.[0] ?? {}) as Record<string, unknown>;
    };

    it('tolerates buffer holes wide enough to nudge over', async () => {
      expect((await configFor(false)).maxBufferHole).toBe(0.5);
    });

    it('prefetches the next fragment so a forward seek finds data in flight', async () => {
      expect((await configFor(false)).startFragPrefetch).toBe(true);
    });

    it('matches the live branch, which already handled this', async () => {
      const vod = await configFor(false);
      const live = await configFor(true);
      expect(vod.maxBufferHole).toBe(live.maxBufferHole);
      expect(vod.startFragPrefetch).toBe(live.startFragPrefetch);
    });
  });

  /**
   * `recoverMediaError()` rebuilds the MediaSource and reloads from `currentTime`,
   * refilling the whole buffer. Uncapped, a decode error that survives the rebuild loops
   * forever and each cycle re-requests every segment — the request flood observed in
   * production alongside `mediaSourceRequiresReset`.
   */
  describe('fatal MEDIA_ERROR recovery budget', () => {
    const renderPlayer = (streamUrl = 'https://example.com/stream.m3u8') => {
      const videoRef = createVideoRef();
      const hook = renderHook(
        ({ url }: { url: string }) =>
          useHls({ videoRef, streamUrl: url, dispatch: mockDispatch }),
        { initialProps: { url: streamUrl } },
      );
      return hook;
    };

    const raiseMediaError = () =>
      act(() => {
        triggerEvent('hlsError', {
          fatal: true,
          type: 'mediaError',
          details: 'mediaSourceRequiresReset',
        });
      });

    const waitForHandler = async () =>
      await vi.waitFor(() => {
        expect(eventHandlers.has('hlsError')).toBe(true);
      });

    it('rebuilds the MediaSource on the first failure', async () => {
      renderPlayer();
      await waitForHandler();

      raiseMediaError();

      expect(mockHls.recoverMediaError).toHaveBeenCalledTimes(1);
      expect(mockHls.swapAudioCodec).not.toHaveBeenCalled();
      expect(mockHls.destroy).not.toHaveBeenCalled();
    });

    /**
     * A decode error surviving one rebuild is usually an audio codec the SourceBuffer
     * cannot accept, so hls.js's documented escalation is to swap codec before retrying.
     */
    it('swaps the audio codec on the second failure', async () => {
      renderPlayer();
      await waitForHandler();

      raiseMediaError();
      raiseMediaError();

      expect(mockHls.swapAudioCodec).toHaveBeenCalledTimes(1);
      expect(mockHls.recoverMediaError).toHaveBeenCalledTimes(2);
      expect(mockHls.destroy).not.toHaveBeenCalled();
    });

    it('gives up after the budget instead of looping', async () => {
      renderPlayer();
      await waitForHandler();

      raiseMediaError();
      raiseMediaError();
      raiseMediaError();

      // Third failure must not trigger a third rebuild.
      expect(mockHls.recoverMediaError).toHaveBeenCalledTimes(2);
      expect(mockHls.destroy).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_ERROR',
        error: 'Playback failed — the media could not be decoded.',
      });
    });

    it('does not keep rebuilding once it has given up', async () => {
      renderPlayer();
      await waitForHandler();

      for (let i = 0; i < 6; i++) {
        raiseMediaError();
      }

      expect(mockHls.recoverMediaError).toHaveBeenCalledTimes(2);
    });

    /**
     * Only the `default:` branch used to report, so fatal MEDIA_ERROR and NETWORK_ERROR
     * — the two that actually happen in the field — never reached analytics. A lone
     * console line cannot show whether a failure is platform, title or session specific.
     */
    it('reports every fatal media error to analytics', async () => {
      renderPlayer();
      await waitForHandler();

      raiseMediaError();

      await vi.waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          'video_error',
          expect.objectContaining({
            type: 'mediaError',
            details: 'mediaSourceRequiresReset',
            action: 'recover-1',
            fatal: true,
          }),
        );
      });
      expect(mockReportError).toHaveBeenCalled();
    });

    it('distinguishes a recovery attempt from giving up', async () => {
      renderPlayer();
      await waitForHandler();

      raiseMediaError();
      raiseMediaError();
      raiseMediaError();

      await vi.waitFor(() => {
        const actions = mockTrackEvent.mock.calls.map(
          ([, params]) => params?.action,
        );
        expect(actions).toContain('recover-1');
        expect(actions).toContain('recover-2');
        expect(actions).toContain('gave-up');
      });
    });

    /**
     * `video.error` is why hls.js escalated to fatal at all, and it was the one field the
     * original log omitted — without it the three known causes are indistinguishable.
     */
    it('captures the diagnostics needed to tell the causes apart', async () => {
      renderPlayer();
      await waitForHandler();

      raiseMediaError();

      await vi.waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith(
          'video_error',
          expect.objectContaining({
            audioTrack: expect.anything(),
            currentLevel: expect.anything(),
            videoReadyState: expect.anything(),
            currentTime: expect.anything(),
            restoredFromBfcache: false,
          }),
        );
      });
      const params = mockTrackEvent.mock.calls.at(-1)?.[1] as Record<
        string,
        unknown
      >;
      expect(params).toHaveProperty('mediaErrorCode');
      expect(params).toHaveProperty('visibility');
    });

    /**
     * The macOS signature: Chrome disables the video track when the tab is hidden, then
     * fails to rebuild the VideoToolbox decoder on return because these streams use open
     * GOPs with no usable H.264 parameter sets. `recoverMediaError()` re-appends at the
     * same non-IDR frame, so it fails identically — only a fresh player recovers. Verified
     * against chrome://media-internals on 2026-09-20.
     */
    describe('unrecoverable platform decode failure', () => {
      const raiseDecodeReset = (videoRef: { current: HTMLVideoElement }) => {
        Object.defineProperty(videoRef.current, 'error', {
          configurable: true,
          value: { code: 3 }, // MEDIA_ERR_DECODE
        });
        act(() => {
          triggerEvent('hlsError', {
            fatal: true,
            type: 'mediaError',
            details: 'mediaSourceRequiresReset',
          });
        });
      };

      it('reloads immediately instead of burning rebuild attempts', async () => {
        const onStreamExpired = vi.fn();
        const videoRef = createVideoRef();
        renderHook(() =>
          useHls({
            videoRef,
            streamUrl: 'https://example.com/stream.m3u8',
            dispatch: mockDispatch,
            onStreamExpired,
          }),
        );
        await vi.waitFor(() => {
          expect(eventHandlers.has('hlsError')).toBe(true);
        });

        raiseDecodeReset(videoRef);

        expect(onStreamExpired).toHaveBeenCalledTimes(1);
        expect(mockHls.recoverMediaError).not.toHaveBeenCalled();
        expect(mockHls.destroy).toHaveBeenCalled();
      });

      /**
       * The saved-progress restore keys on metadata and socket state, not streamUrl, so it
       * does not re-run for a refetch. Without carrying the playhead ourselves, recovering
       * 33 minutes in would restart the episode.
       */
      it('carries the playhead across the reload', async () => {
        const onStreamExpired = vi.fn();
        const videoRef = createVideoRef();
        const { rerender } = renderHook(
          ({ url }: { url: string }) =>
            useHls({
              videoRef,
              streamUrl: url,
              dispatch: mockDispatch,
              onStreamExpired,
            }),
          { initialProps: { url: 'https://example.com/a.m3u8' } },
        );
        await vi.waitFor(() => {
          expect(eventHandlers.has('hlsError')).toBe(true);
        });

        Object.defineProperty(videoRef.current, 'currentTime', {
          configurable: true,
          writable: true,
          value: 1970.9,
        });
        raiseDecodeReset(videoRef);
        expect(onStreamExpired).toHaveBeenCalled();

        // The refetch hands down a new URL, remounting the engine.
        eventHandlers.clear();
        rerender({ url: 'https://example.com/b.m3u8' });
        await vi.waitFor(() => {
          expect(eventHandlers.has('hlsManifestParsed')).toBe(true);
        });
        act(() => {
          triggerEvent('hlsManifestParsed', { levels: mockHls.levels });
        });

        expect(videoRef.current.currentTime).toBeCloseTo(1970.9, 1);
      });

      it('still reports the failure so it stays visible in analytics', async () => {
        const videoRef = createVideoRef();
        renderHook(() =>
          useHls({
            videoRef,
            streamUrl: 'https://example.com/stream.m3u8',
            dispatch: mockDispatch,
            onStreamExpired: vi.fn(),
          }),
        );
        await vi.waitFor(() => {
          expect(eventHandlers.has('hlsError')).toBe(true);
        });

        raiseDecodeReset(videoRef);

        await vi.waitFor(() => {
          expect(mockTrackEvent).toHaveBeenCalledWith(
            'video_error',
            expect.objectContaining({ action: 'reload-decoder' }),
          );
        });
      });

      /** With no reload available (TV surfaces omit it) the rebuild path must still run. */
      it('falls back to rebuilding when no reload callback exists', async () => {
        const videoRef = createVideoRef();
        renderHook(() =>
          useHls({
            videoRef,
            streamUrl: 'https://example.com/stream.m3u8',
            dispatch: mockDispatch,
          }),
        );
        await vi.waitFor(() => {
          expect(eventHandlers.has('hlsError')).toBe(true);
        });

        raiseDecodeReset(videoRef);

        expect(mockHls.recoverMediaError).toHaveBeenCalledTimes(1);
      });
    });

    /** Exhausting the rebuild budget should reload rather than strand the viewer. */
    it('reloads once the rebuild budget is spent', async () => {
      const onStreamExpired = vi.fn();
      const videoRef = createVideoRef();
      renderHook(() =>
        useHls({
          videoRef,
          streamUrl: 'https://example.com/stream.m3u8',
          dispatch: mockDispatch,
          onStreamExpired,
        }),
      );
      await vi.waitFor(() => {
        expect(eventHandlers.has('hlsError')).toBe(true);
      });

      // bufferStalledError has no video.error, so it takes the rebuild path.
      for (let i = 0; i < 3; i++) {
        act(() => {
          triggerEvent('hlsError', {
            fatal: true,
            type: 'mediaError',
            details: 'bufferStalledError',
          });
        });
      }

      expect(mockHls.recoverMediaError).toHaveBeenCalledTimes(2);
      expect(onStreamExpired).toHaveBeenCalledTimes(1);
    });

    /** A new title must start with a full budget, not inherit the previous one. */
    it('resets the budget when a new source loads', async () => {
      const { rerender } = renderPlayer();
      await waitForHandler();

      raiseMediaError();
      raiseMediaError();
      raiseMediaError();
      expect(mockHls.recoverMediaError).toHaveBeenCalledTimes(2);

      mockHls.recoverMediaError.mockClear();
      eventHandlers.clear();
      rerender({ url: 'https://example.com/other.m3u8' });
      await waitForHandler();

      raiseMediaError();

      expect(mockHls.recoverMediaError).toHaveBeenCalledTimes(1);
    });
  });

  it('should retry on fatal NETWORK_ERROR', async () => {
    const videoRef = createVideoRef();

    renderHook(() =>
      useHls({
        videoRef,
        streamUrl: 'https://example.com/stream.m3u8',
        dispatch: mockDispatch,
      }),
    );

    await vi.waitFor(() => {
      expect(eventHandlers.has('hlsError')).toBe(true);
    });

    mockHls.startLoad.mockClear();

    act(() => {
      triggerEvent('hlsError', {
        fatal: true,
        type: 'networkError',
        details: 'bufferStalledError', // NOT a session-expired detail
      });
    });

    expect(mockHls.startLoad).toHaveBeenCalled();
  });

  it('should handle 401 session expired with onStreamExpired callback', async () => {
    const onStreamExpired = vi.fn();
    const videoRef = createVideoRef();

    renderHook(() =>
      useHls({
        videoRef,
        streamUrl: 'https://example.com/stream.m3u8',
        dispatch: mockDispatch,
        onStreamExpired,
      }),
    );

    await vi.waitFor(() => {
      expect(eventHandlers.has('hlsError')).toBe(true);
    });

    // First 3 unauthorized responses are treated as transient during refresh.
    for (let i = 0; i < 3; i += 1) {
      act(() => {
        triggerEvent('hlsError', {
          fatal: false,
          type: 'networkError',
          response: { code: 401 },
        });
      });
    }

    expect(mockHls.startLoad).toHaveBeenCalledTimes(3);
    expect(mockHls.destroy).not.toHaveBeenCalled();
    expect(onStreamExpired).not.toHaveBeenCalled();

    // 4th unauthorized response is treated as expired session.
    act(() => {
      triggerEvent('hlsError', {
        fatal: false,
        type: 'networkError',
        response: { code: 401 },
      });
    });

    expect(mockHls.destroy).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_LOADING',
      isLoading: true,
    });
    expect(onStreamExpired).toHaveBeenCalled();
  });

  it('should handle 401 session expired without onStreamExpired callback', async () => {
    const videoRef = createVideoRef();

    renderHook(() =>
      useHls({
        videoRef,
        streamUrl: 'https://example.com/stream.m3u8',
        dispatch: mockDispatch,
      }),
    );

    await vi.waitFor(() => {
      expect(eventHandlers.has('hlsError')).toBe(true);
    });

    // First 3 unauthorized responses retry the load.
    for (let i = 0; i < 3; i += 1) {
      act(() => {
        triggerEvent('hlsError', {
          fatal: false,
          type: 'networkError',
          response: { code: 401 },
        });
      });
    }

    expect(mockHls.startLoad).toHaveBeenCalledTimes(3);
    expect(mockHls.destroy).not.toHaveBeenCalled();

    // 4th unauthorized response surfaces expired-session UI error.
    act(() => {
      triggerEvent('hlsError', {
        fatal: false,
        type: 'networkError',
        response: { code: 401 },
      });
    });

    expect(mockHls.destroy).not.toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_ERROR',
      error: 'Stream session expired. Please start playback again.',
    });
  });

  it('should keep retrying livestream 401s without forcing buffering when already playing', async () => {
    const videoRef = createVideoRef();
    Object.defineProperty(videoRef.current, 'paused', {
      configurable: true,
      get: () => false,
    });
    Object.defineProperty(videoRef.current, 'readyState', {
      configurable: true,
      get: () => 4,
    });

    renderHook(() =>
      useHls({
        videoRef,
        streamUrl: 'https://example.com/stream.m3u8',
        dispatch: mockDispatch,
        isLive: true,
      }),
    );

    await vi.waitFor(() => {
      expect(eventHandlers.has('hlsError')).toBe(true);
    });

    act(() => {
      triggerEvent('hlsError', {
        fatal: false,
        type: 'networkError',
        response: { code: 401 },
      });
    });

    expect(mockHls.startLoad).toHaveBeenCalled();
    expect(mockHls.destroy).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalledWith({
      type: 'SET_BUFFERING',
      isBuffering: true,
    });
    expect(mockDispatch).not.toHaveBeenCalledWith({
      type: 'SET_ERROR',
      error: 'Stream session expired. Please start playback again.',
    });
  });

  it('should handle native HLS (Safari) when Hls is not supported', async () => {
    // Temporarily make isSupported return false (use the existing mock)
    (
      (MockHlsClass as unknown as Record<string, unknown>)
        .isSupported as ReturnType<typeof vi.fn>
    ).mockReturnValue(false);

    const videoRef = createVideoRef();
    // Make canPlayType return 'maybe' for HLS
    videoRef.current.canPlayType = vi.fn((type: string) =>
      type === 'application/vnd.apple.mpegurl' ? 'maybe' : '',
    ) as unknown as typeof videoRef.current.canPlayType;

    renderHook(() =>
      useHls({
        videoRef,
        streamUrl: 'https://example.com/stream.m3u8',
        dispatch: mockDispatch,
      }),
    );

    // Wait for the async import('hls.js') to resolve and native path to execute
    await vi.waitFor(() => {
      expect(videoRef.current.src).toContain('stream.m3u8');
    });

    // Simulate loadedmetadata event
    act(() => {
      videoRef.current.dispatchEvent(new Event('loadedmetadata'));
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_LOADING',
      isLoading: false,
    });

    // Restore isSupported for subsequent tests
    (
      (MockHlsClass as unknown as Record<string, unknown>)
        .isSupported as ReturnType<typeof vi.fn>
    ).mockReturnValue(true);
  });

  it('should dispatch error and destroy on unknown fatal error', async () => {
    const videoRef = createVideoRef();

    renderHook(() =>
      useHls({
        videoRef,
        streamUrl: 'https://example.com/stream.m3u8',
        dispatch: mockDispatch,
      }),
    );

    await vi.waitFor(() => {
      expect(eventHandlers.has('hlsError')).toBe(true);
    });

    act(() => {
      triggerEvent('hlsError', {
        fatal: true,
        type: 'otherError',
        details: 'unknown',
      });
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'SET_ERROR',
      error: 'Playback error occurred',
    });
    expect(mockHls.destroy).toHaveBeenCalled();
  });

  it('should ignore non-fatal errors that are not network load errors', async () => {
    const videoRef = createVideoRef();

    renderHook(() =>
      useHls({
        videoRef,
        streamUrl: 'https://example.com/stream.m3u8',
        dispatch: mockDispatch,
      }),
    );

    await vi.waitFor(() => {
      expect(eventHandlers.has('hlsError')).toBe(true);
    });

    mockDispatch.mockClear();

    act(() => {
      triggerEvent('hlsError', {
        fatal: false,
        type: 'mediaError',
        details: 'bufferStalledError',
      });
    });

    // Non-fatal non-network error should not trigger any error handling
    expect(mockHls.startLoad).not.toHaveBeenCalled();
  });

  describe('setQuality', () => {
    it('should set quality level on HLS instance', async () => {
      const videoRef = createVideoRef();

      const { result } = renderHook(() =>
        useHls({
          videoRef,
          streamUrl: 'https://example.com/stream.m3u8',
          dispatch: mockDispatch,
        }),
      );

      await vi.waitFor(() => {
        expect(mockHls.loadSource).toHaveBeenCalled();
      });

      act(() => {
        result.current.setQuality(1);
      });

      expect(mockHls.currentLevel).toBe(1);
    });

    it('should do nothing if HLS instance is null', () => {
      const videoRef = createVideoRef();
      const { result } = renderHook(() =>
        useHls({
          videoRef,
          streamUrl: null, // HLS won't initialize
          dispatch: mockDispatch,
        }),
      );

      act(() => {
        result.current.setQuality(1);
      });

      // No error should occur
    });
  });

  describe('setAudioTrack', () => {
    it('should set audio track on HLS instance', async () => {
      const videoRef = createVideoRef();

      const { result } = renderHook(() =>
        useHls({
          videoRef,
          streamUrl: 'https://example.com/stream.m3u8',
          dispatch: mockDispatch,
        }),
      );

      await vi.waitFor(() => {
        expect(mockHls.loadSource).toHaveBeenCalled();
      });

      act(() => {
        result.current.setAudioTrack('1');
      });

      expect(mockHls.audioTrack).toBe(1);
    });

    it('should not set invalid audio track', async () => {
      const videoRef = createVideoRef();

      const { result } = renderHook(() =>
        useHls({
          videoRef,
          streamUrl: 'https://example.com/stream.m3u8',
          dispatch: mockDispatch,
        }),
      );

      await vi.waitFor(() => {
        expect(mockHls.loadSource).toHaveBeenCalled();
      });

      mockHls.audioTrack = -1; // Reset

      act(() => {
        result.current.setAudioTrack('invalid');
      });

      expect(mockHls.audioTrack).toBe(-1); // Unchanged
    });

    it('should not set negative audio track', async () => {
      const videoRef = createVideoRef();

      const { result } = renderHook(() =>
        useHls({
          videoRef,
          streamUrl: 'https://example.com/stream.m3u8',
          dispatch: mockDispatch,
        }),
      );

      await vi.waitFor(() => {
        expect(mockHls.loadSource).toHaveBeenCalled();
      });

      mockHls.audioTrack = -1;

      act(() => {
        result.current.setAudioTrack('-5');
      });

      expect(mockHls.audioTrack).toBe(-1);
    });

    it('should do nothing if HLS instance is null', () => {
      const videoRef = createVideoRef();
      const { result } = renderHook(() =>
        useHls({
          videoRef,
          streamUrl: null, // HLS won't initialize
          dispatch: mockDispatch,
        }),
      );

      act(() => {
        result.current.setAudioTrack('1');
      });

      // No error should occur
    });
  });

  describe('cleanup', () => {
    it('should destroy HLS instance on unmount', async () => {
      const videoRef = createVideoRef();

      const { unmount } = renderHook(() =>
        useHls({
          videoRef,
          streamUrl: 'https://example.com/stream.m3u8',
          dispatch: mockDispatch,
        }),
      );

      await vi.waitFor(() => {
        expect(mockHls.loadSource).toHaveBeenCalled();
      });

      unmount();

      expect(mockHls.destroy).toHaveBeenCalled();
    });
  });

  describe('duplicate resolution handling', () => {
    it('should label quality with bitrate when duplicate resolutions exist', async () => {
      const videoRef = createVideoRef();

      renderHook(() =>
        useHls({
          videoRef,
          streamUrl: 'https://example.com/stream.m3u8',
          dispatch: mockDispatch,
        }),
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('hlsManifestParsed')).toBe(true);
      });

      act(() => {
        triggerEvent('hlsManifestParsed', {
          levels: [
            { height: 1080, bitrate: 5000000 },
            { height: 1080, bitrate: 8000000 },
          ],
          audioTracks: [],
        });
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_QUALITIES',
        qualities: [
          { label: '1080p (5.0 Mbps)', height: 1080, bandwidth: 5000000 },
          { label: '1080p (8.0 Mbps)', height: 1080, bandwidth: 8000000 },
        ],
      });
    });
  });

  describe('audio track fallback labels', () => {
    it('should use lang when name is missing', async () => {
      const videoRef = createVideoRef();

      renderHook(() =>
        useHls({
          videoRef,
          streamUrl: 'https://example.com/stream.m3u8',
          dispatch: mockDispatch,
        }),
      );

      await vi.waitFor(() => {
        expect(eventHandlers.has('hlsManifestParsed')).toBe(true);
      });

      act(() => {
        triggerEvent('hlsManifestParsed', {
          levels: [],
          audioTracks: [
            { name: '', lang: 'ja', default: false },
            { name: '', lang: '', default: false },
          ],
        });
      });

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_AUDIO_TRACKS',
        audioTracks: [
          { id: '0', label: 'ja', language: 'ja', isDefault: true },
          { id: '1', label: 'Audio 2', language: 'unknown', isDefault: false },
        ],
      });
    });
  });
  describe('native HLS (Safari) edge cases', () => {
    it('should handle native stalled and playing events', async () => {
      (
        MockHlsClass as unknown as {
          isSupported: { mockReturnValue: (v: boolean) => void };
        }
      ).isSupported.mockReturnValue(false);
      const videoRef = createVideoRef();
      videoRef.current.canPlayType = vi.fn((type: string) =>
        type === 'application/vnd.apple.mpegurl' ? 'maybe' : '',
      ) as unknown as typeof videoRef.current.canPlayType;

      renderHook(() =>
        useHls({
          videoRef,
          streamUrl: 'https://example.com/stream.m3u8',
          dispatch: mockDispatch,
        }),
      );

      await vi.waitFor(() => {
        expect(videoRef.current.src).toContain('stream.m3u8');
      });

      // Simulate stalled
      act(() => {
        videoRef.current.dispatchEvent(new Event('stalled'));
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_BUFFERING',
        isBuffering: true,
      });

      // Simulate playing
      act(() => {
        videoRef.current.dispatchEvent(new Event('playing'));
      });
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'SET_BUFFERING',
        isBuffering: false,
      });

      (
        MockHlsClass as unknown as {
          isSupported: { mockReturnValue: (v: boolean) => void };
        }
      ).isSupported.mockReturnValue(true);
    });

    it('should handle native error event and trigger refetch if expired', async () => {
      (
        MockHlsClass as unknown as {
          isSupported: { mockReturnValue: (v: boolean) => void };
        }
      ).isSupported.mockReturnValue(false);
      const onStreamExpired = vi.fn();
      const videoRef = createVideoRef();
      videoRef.current.canPlayType = vi.fn((type: string) =>
        type === 'application/vnd.apple.mpegurl' ? 'maybe' : '',
      ) as unknown as typeof videoRef.current.canPlayType;

      renderHook(() =>
        useHls({
          videoRef,
          streamUrl: 'https://example.com/stream.m3u8',
          dispatch: mockDispatch,
          onStreamExpired,
        }),
      );

      await vi.waitFor(() => {
        expect(videoRef.current.src).toContain('stream.m3u8');
      });

      // Mock MediaError
      Object.defineProperty(videoRef.current, 'error', {
        value: { code: 2 }, // MEDIA_ERR_NETWORK (simplified)
        configurable: true,
      });

      // Note: In JSDOM MediaError.MEDIA_ERR_NETWORK is 2
      // Some environments might need it specifically defined
      global.MediaError = {
        MEDIA_ERR_ABORTED: 1,
        MEDIA_ERR_NETWORK: 2,
        MEDIA_ERR_DECODE: 3,
        MEDIA_ERR_SRC_NOT_SUPPORTED: 4,
      } as unknown as typeof MediaError;

      act(() => {
        videoRef.current.dispatchEvent(new Event('error'));
      });

      expect(onStreamExpired).toHaveBeenCalled();
      (
        MockHlsClass as unknown as {
          isSupported: { mockReturnValue: (v: boolean) => void };
        }
      ).isSupported.mockReturnValue(true);
    });
  });
});
