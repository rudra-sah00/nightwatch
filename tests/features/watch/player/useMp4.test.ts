import { act, renderHook } from '@testing-library/react';
import type { Dispatch } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlayerAction } from '@/features/watch/player/context/types';
import { useMp4 } from '@/features/watch/player/hooks/useMp4';

function createVideoRef() {
  const video = document.createElement('video');
  return { current: video };
}

describe('useMp4', () => {
  const mockDispatch = vi.fn() as unknown as Dispatch<PlayerAction>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Source setup ──────────────────────────────────────────────────────────

  it('does nothing when streamUrl is null', () => {
    const videoRef = createVideoRef();
    renderHook(() =>
      useMp4({ videoRef, streamUrl: null, dispatch: mockDispatch }),
    );
    expect(videoRef.current.src).toBe('');
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('sets video.src and dispatches SET_LOADING when streamUrl is provided', () => {
    const videoRef = createVideoRef();
    renderHook(() =>
      useMp4({
        videoRef,
        streamUrl: 'https://cdn.example.com/movie.mp4',
        dispatch: mockDispatch,
      }),
    );

    expect(videoRef.current.src).toContain('movie.mp4');
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_ERROR', error: null }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_LOADING', isLoading: true }),
    );
  });

  it('clears video.src on cleanup', () => {
    const videoRef = createVideoRef();
    const { unmount } = renderHook(() =>
      useMp4({
        videoRef,
        streamUrl: 'https://cdn.example.com/movie.mp4',
        dispatch: mockDispatch,
      }),
    );
    unmount();
    expect(videoRef.current.hasAttribute('src')).toBe(false);
  });

  // ── Error handling ────────────────────────────────────────────────────────

  it('dispatches SET_ERROR on video error event', () => {
    const videoRef = createVideoRef();
    renderHook(() =>
      useMp4({
        videoRef,
        streamUrl: 'https://cdn.example.com/movie.mp4',
        dispatch: mockDispatch,
      }),
    );

    act(() => {
      videoRef.current.dispatchEvent(new Event('error'));
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SET_ERROR',
        error: 'Video playback error',
      }),
    );
  });

  it('calls onStreamExpired when video fires an error event', () => {
    const onStreamExpired = vi.fn();
    const videoRef = createVideoRef();

    renderHook(() =>
      useMp4({
        videoRef,
        streamUrl: 'https://cdn.example.com/movie.mp4',
        dispatch: mockDispatch,
        onStreamExpired,
      }),
    );

    act(() => {
      videoRef.current.dispatchEvent(new Event('error'));
    });

    expect(onStreamExpired).toHaveBeenCalledOnce();
  });

  it('does NOT call onStreamExpired when streamUrl is null', () => {
    const onStreamExpired = vi.fn();
    const videoRef = createVideoRef();

    renderHook(() =>
      useMp4({
        videoRef,
        streamUrl: null,
        dispatch: mockDispatch,
        onStreamExpired,
      }),
    );

    // No error event wired up — onStreamExpired must stay silent
    act(() => {
      videoRef.current.dispatchEvent(new Event('error'));
    });

    expect(onStreamExpired).not.toHaveBeenCalled();
  });

  it('works without onStreamExpired (no crash on error)', () => {
    const videoRef = createVideoRef();

    renderHook(() =>
      useMp4({
        videoRef,
        streamUrl: 'https://cdn.example.com/movie.mp4',
        dispatch: mockDispatch,
        // onStreamExpired intentionally omitted
      }),
    );

    expect(() => {
      act(() => {
        videoRef.current.dispatchEvent(new Event('error'));
      });
    }).not.toThrow();
  });

  // ── loadedmetadata ────────────────────────────────────────────────────────

  it('dispatches SET_LOADING false and calls play() on loadedmetadata', () => {
    const videoRef = createVideoRef();
    const playSpy = vi
      .spyOn(videoRef.current, 'play')
      .mockResolvedValue(undefined);

    renderHook(() =>
      useMp4({
        videoRef,
        streamUrl: 'https://cdn.example.com/movie.mp4',
        dispatch: mockDispatch,
      }),
    );

    act(() => {
      videoRef.current.dispatchEvent(new Event('loadedmetadata'));
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_LOADING', isLoading: false }),
    );
    expect(playSpy).toHaveBeenCalled();
  });

  // ── Quality switching ─────────────────────────────────────────────────────

  it('dispatches SET_QUALITIES when manualQualities are provided', () => {
    const videoRef = createVideoRef();
    const qualities = [
      { quality: '1080p', url: 'https://cdn.example.com/1080.mp4' },
      { quality: '720p', url: 'https://cdn.example.com/720.mp4' },
    ];

    renderHook(() =>
      useMp4({
        videoRef,
        streamUrl: 'https://cdn.example.com/1080.mp4',
        dispatch: mockDispatch,
        manualQualities: qualities,
      }),
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SET_QUALITIES',
        qualities: expect.arrayContaining([
          expect.objectContaining({ label: '1080p' }),
          expect.objectContaining({ label: '720p' }),
        ]),
      }),
    );
  });

  it('setQuality swaps video.src and preserves currentTime', () => {
    const videoRef = createVideoRef();
    // Simulate playback position
    Object.defineProperty(videoRef.current, 'currentTime', {
      writable: true,
      value: 42,
    });
    const playSpy = vi
      .spyOn(videoRef.current, 'play')
      .mockResolvedValue(undefined);

    const qualities = [
      { quality: '1080p', url: 'https://cdn.example.com/1080.mp4' },
      { quality: '720p', url: 'https://cdn.example.com/720.mp4' },
    ];

    const { result } = renderHook(() =>
      useMp4({
        videoRef,
        streamUrl: 'https://cdn.example.com/1080.mp4',
        dispatch: mockDispatch,
        manualQualities: qualities,
      }),
    );

    // Simulate video was playing
    Object.defineProperty(videoRef.current, 'paused', {
      value: false,
      configurable: true,
    });

    act(() => {
      result.current.setQuality?.(1); // switch to 720p
    });

    expect(videoRef.current.src).toContain('720.mp4');
    expect(videoRef.current.currentTime).toBe(42);
    expect(playSpy).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_CURRENT_QUALITY', quality: '720p' }),
    );
  });

  it('sets initial quality from streamUrl if no exact match found', () => {
    const videoRef = createVideoRef();
    const qualities = [
      { quality: '1080p', url: '1080.mp4' },
      { quality: '720p', url: '720.mp4' },
    ];

    renderHook(() =>
      useMp4({
        videoRef,
        streamUrl: 'https://example.com/720.mp4?token=123',
        dispatch: mockDispatch,
        manualQualities: qualities,
      }),
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_CURRENT_QUALITY', quality: '720p' }),
    );
  });

  it('sets first quality as default if no quality matches streamUrl', () => {
    const videoRef = createVideoRef();
    const qualities = [{ quality: '1080p', url: '1080.mp4' }];

    renderHook(() =>
      useMp4({
        videoRef,
        streamUrl: 'https://example.com/other.mp4',
        dispatch: mockDispatch,
        manualQualities: qualities,
      }),
    );

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SET_CURRENT_QUALITY',
        quality: '1080p',
      }),
    );
  });
});
