import type { GestureRecognizer } from '@mediapipe/tasks-vision';
import { renderHook } from '@testing-library/react';
import type { ICameraVideoTrack } from 'agora-rtc-sdk-ng';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from 'vitest';
import type { useGestureDetection as useGestureDetectionType } from '@/features/watch-party/hooks/useGestureDetection';
import type { InteractionPayload } from '@/features/watch-party/types';

// Mock requestAnimationFrame
const mockRequestAnimationFrame = vi.fn((cb) => {
  return setTimeout(cb, 16);
});
const mockCancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id);
});
vi.stubGlobal('requestAnimationFrame', mockRequestAnimationFrame);
vi.stubGlobal('cancelAnimationFrame', mockCancelAnimationFrame);

describe('useGestureDetection', () => {
  let mockVideoTrack: ICameraVideoTrack;
  let mockRecognizer: { recognizeForVideo: Mock; close: Mock };
  let useGestureDetection: typeof useGestureDetectionType;
  let emitPartyInteraction: (
    payload: Omit<InteractionPayload, 'userId' | 'userName' | 'timestamp'>,
  ) => void;
  const originalCreateElement = document.createElement;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Setup dependency mocks
    mockRecognizer = {
      recognizeForVideo: vi.fn().mockReturnValue({ gestures: [] }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.doMock('@/features/watch-party/api', () => ({
      emitPartyInteraction: vi.fn(),
    }));

    vi.doMock('@mediapipe/tasks-vision', () => ({
      GestureRecognizer: {
        createFromOptions: vi
          .fn()
          .mockImplementation(() => Promise.resolve(mockRecognizer)),
      },
      FilesetResolver: {
        forVisionTasks: vi
          .fn()
          .mockImplementation(() => Promise.resolve({ vision: true })),
      },
    }));

    // Re-import modules after reset
    const api = await import('@/features/watch-party/api');
    emitPartyInteraction = api.emitPartyInteraction;

    const hookModule = await import(
      '@/features/watch-party/hooks/useGestureDetection'
    );
    useGestureDetection = hookModule.useGestureDetection;

    mockVideoTrack = {
      kind: 'video',
      getMediaStreamTrack: vi.fn().mockReturnValue({
        getSettings: vi.fn().mockReturnValue({ width: 640, height: 480 }),
      }),
    } as unknown as ICameraVideoTrack;

    // Mock video element and play
    const mockVideoElement = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      srcObject: null,
      width: 0,
      height: 0,
    };

    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'video')
        return mockVideoElement as unknown as HTMLVideoElement;
      return originalCreateElement.call(document, tag);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const flushPromises = async () => {
    for (let i = 0; i < 20; i++) {
      await vi.advanceTimersByTimeAsync(0);
    }
  };

  it('should not initialize loop if videoTrack is null', () => {
    renderHook(() => useGestureDetection(null));
    expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
  });

  it('should initialize and start loop if videoTrack is present', async () => {
    renderHook(() => useGestureDetection(mockVideoTrack));
    await flushPromises();
    await vi.advanceTimersByTimeAsync(16);
    await flushPromises();
    expect(mockRecognizer.recognizeForVideo).toHaveBeenCalled();
  });

  it('should trigger reaction for valid gesture', async () => {
    mockRecognizer.recognizeForVideo.mockReturnValue({
      gestures: [[{ categoryName: 'Thumb_Up', score: 0.9 }]],
    });

    renderHook(() => useGestureDetection(mockVideoTrack));
    await flushPromises();
    await vi.advanceTimersByTimeAsync(16);
    await flushPromises();

    expect(emitPartyInteraction).toHaveBeenCalledWith({
      type: 'emoji',
      value: '👍',
    });
  });

  it('should respect 2-second cooldown', async () => {
    mockRecognizer.recognizeForVideo.mockReturnValue({
      gestures: [[{ categoryName: 'Thumb_Up', score: 0.9 }]],
    });

    renderHook(() => useGestureDetection(mockVideoTrack));
    await flushPromises();
    await vi.advanceTimersByTimeAsync(16);
    await flushPromises();

    expect(emitPartyInteraction).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(16);
    await flushPromises();
    expect(emitPartyInteraction).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000);
    await flushPromises();
    expect(emitPartyInteraction).toHaveBeenCalledTimes(2);
  });

  it('should map various gestures correctly', async () => {
    const gestures = [
      { name: 'Victory', emoji: '✌️' },
      { name: 'Thumb_Down', emoji: '👎' },
      { name: 'Open_Palm', emoji: '👋' },
      { name: 'Closed_Fist', emoji: '👊' },
      { name: 'ILoveYou', emoji: '🤟' },
    ];

    for (const g of gestures) {
      mockRecognizer.recognizeForVideo.mockReturnValue({
        gestures: [[{ categoryName: g.name, score: 0.9 }]],
      });

      // We need a fresh hook for each gesture since we are testing the loop
      const { unmount } = renderHook(() => useGestureDetection(mockVideoTrack));
      await flushPromises();
      await vi.advanceTimersByTimeAsync(16);
      await flushPromises();

      expect(emitPartyInteraction).toHaveBeenCalledWith({
        type: 'emoji',
        value: g.emoji,
      });
      unmount();
      vi.clearAllMocks();
    }
  });

  it('should use a singleton FilesetResolver across multiple mounts within one test', async () => {
    const { FilesetResolver } = await import('@mediapipe/tasks-vision');

    renderHook(() => useGestureDetection(mockVideoTrack));
    await flushPromises();

    renderHook(() => useGestureDetection(mockVideoTrack));
    await flushPromises();

    expect(FilesetResolver.forVisionTasks).toHaveBeenCalledTimes(1);
  });

  it('should not start prediction if hook unmounts during initialization', async () => {
    let resolveInit: (val: unknown) => void = () => {};
    const initPromise = new Promise((resolve) => {
      resolveInit = resolve;
    });

    const { GestureRecognizer } = await import('@mediapipe/tasks-vision');
    vi.mocked(GestureRecognizer.createFromOptions).mockReturnValueOnce(
      initPromise as Promise<unknown> as Promise<GestureRecognizer>,
    );

    const { unmount } = renderHook(() => useGestureDetection(mockVideoTrack));

    unmount();

    resolveInit({
      recognizeForVideo: vi.fn(),
      close: vi.fn(),
    });
    await flushPromises();

    expect(mockRequestAnimationFrame).not.toHaveBeenCalled();
  });
});
