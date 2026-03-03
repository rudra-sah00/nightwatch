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

    act(() => {
      triggerEvent('hlsError', {
        fatal: false,
        type: 'networkError',
        response: { code: 401 },
      });
    });

    expect(mockHls.destroy).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith({
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
});
