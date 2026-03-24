import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGestureDetection } from '@/features/watch-party/interactions/hooks/useGestureDetection';

// Mock MediaPipe
vi.mock('@mediapipe/tasks-vision', () => ({
  GestureRecognizer: { createFromOptions: vi.fn() },
  FaceLandmarker: { createFromOptions: vi.fn() },
  FilesetResolver: { forVisionTasks: vi.fn().mockResolvedValue({}) },
}));

// Mock requestAnimationFrame
vi.stubGlobal('requestAnimationFrame', (cb: TimerHandler) =>
  setTimeout(cb, 16),
);
vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));

describe('useGestureDetection', () => {
  const mockRtmSendMessage = vi.fn();
  const mockVideoTrack = {
    getMediaStreamTrack: () => ({
      getSettings: () => ({ width: 640, height: 480 }),
    }),
  } as unknown as import('agora-rtc-sdk-ng').ICameraVideoTrack;

  const mockRecognizer = {
    recognizeForVideo: vi.fn(),
    close: vi.fn(),
  };
  const mockLandmarker = {
    detectForVideo: vi.fn(),
    close: vi.fn(),
  };

  const defaultOptions = {
    rtmSendMessage: mockRtmSendMessage,
    userId: 'user-1',
    userName: 'User 1',
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    const { GestureRecognizer, FaceLandmarker } = await import(
      '@mediapipe/tasks-vision'
    );
    vi.mocked(GestureRecognizer.createFromOptions).mockResolvedValue(
      mockRecognizer as unknown as import('@mediapipe/tasks-vision').GestureRecognizer,
    );
    vi.mocked(FaceLandmarker.createFromOptions).mockResolvedValue(
      mockLandmarker as unknown as import('@mediapipe/tasks-vision').FaceLandmarker,
    );

    // Mock video element play
    vi.spyOn(HTMLVideoElement.prototype, 'play').mockResolvedValue(undefined);
  });

  const flushPromises = async () => {
    for (let i = 0; i < 10; i++) await vi.advanceTimersByTimeAsync(1);
  };

  it('triggers RTM interaction for valid gesture', async () => {
    mockRecognizer.recognizeForVideo.mockReturnValue({
      gestures: [[{ categoryName: 'Thumb_Up', score: 0.9 }]],
    });
    mockLandmarker.detectForVideo.mockReturnValue({ faceBlendshapes: [] });

    renderHook(() => useGestureDetection(mockVideoTrack, defaultOptions));

    await flushPromises();
    // Advance timers to trigger the prediction loop
    await vi.advanceTimersByTimeAsync(32);
    await flushPromises();

    expect(mockRtmSendMessage).toHaveBeenCalledWith({
      type: 'INTERACTION',
      kind: 'emoji',
      emoji: '👍',
      userId: 'user-1',
      userName: 'User 1',
    });
  });

  it('triggers RTM interaction for smile', async () => {
    mockRecognizer.recognizeForVideo.mockReturnValue({ gestures: [] });
    mockLandmarker.detectForVideo.mockReturnValue({
      faceBlendshapes: [
        {
          categories: [
            { categoryName: 'mouthSmileLeft', score: 0.8 },
            { categoryName: 'mouthSmileRight', score: 0.8 },
          ],
        },
      ],
    });

    renderHook(() => useGestureDetection(mockVideoTrack, defaultOptions));

    await flushPromises();
    await vi.advanceTimersByTimeAsync(32);
    await flushPromises();

    expect(mockRtmSendMessage).toHaveBeenCalledWith({
      type: 'INTERACTION',
      kind: 'emoji',
      emoji: '😊',
      userId: 'user-1',
      userName: 'User 1',
    });
  });

  it('respects 2-second cooldown', async () => {
    mockRecognizer.recognizeForVideo.mockReturnValue({
      gestures: [[{ categoryName: 'Thumb_Up', score: 0.9 }]],
    });

    renderHook(() => useGestureDetection(mockVideoTrack, defaultOptions));

    await flushPromises();
    await vi.advanceTimersByTimeAsync(32);
    await flushPromises();
    expect(mockRtmSendMessage).toHaveBeenCalledTimes(1);

    // Immediate next frame shouldn't trigger
    await vi.advanceTimersByTimeAsync(16);
    await flushPromises();
    expect(mockRtmSendMessage).toHaveBeenCalledTimes(1);

    // After 2 seconds, it should trigger again
    await vi.advanceTimersByTimeAsync(2100);
    await flushPromises();
    expect(mockRtmSendMessage).toHaveBeenCalledTimes(2);
  });
});
