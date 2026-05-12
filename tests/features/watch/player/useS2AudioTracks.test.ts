import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useS2AudioTracks } from '@/features/watch/player/hooks/useS2AudioTracks';
import type { PlayResponse } from '@/types/content';

// ── Mock playVideo ──────────────────────────────────────────────────────────
const { mockPlayVideo } = vi.hoisted(() => ({ mockPlayVideo: vi.fn() }));
vi.mock('@/features/watch/api', () => ({
  playVideo: mockPlayVideo,
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

const BASE_PROPS = {
  server: 's2' as const,
  type: 'movie' as const,
  title: 'Test Movie',
  movieId: 's2:movie::123',
  onStreamChange: vi.fn(),
  onRefetch: vi.fn(),
};

function makePlayResponse(overrides: Partial<PlayResponse> = {}): PlayResponse {
  return {
    success: true,
    type: 'movie',
    title: 'Test Movie',
    movieId: 's2:movie::123',
    masterPlaylistUrl: 'https://cdn.example.com/movie.mp4',
    audioTracks: [
      { language: 'en', label: 'English', streamUrl: 's2:en::123' },
      { language: 'ru', label: 'Russian', streamUrl: 's2:ru::456' },
    ],
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useS2AudioTracks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty tracks for s1', () => {
    const { result } = renderHook(() =>
      useS2AudioTracks({ ...BASE_PROPS, server: 's2' }),
    );
    expect(result.current.audioTracks).toHaveLength(0);
  });

  it('calls playVideo once and populates audioTracks', async () => {
    mockPlayVideo.mockResolvedValue(makePlayResponse());
    const { result } = renderHook(() => useS2AudioTracks({ ...BASE_PROPS }));
    await waitFor(() => expect(result.current.audioTracks).toHaveLength(2));
    expect(mockPlayVideo).toHaveBeenCalledOnce();
  });

  it('handles playVideo rejection', async () => {
    mockPlayVideo.mockRejectedValue(new Error('error'));
    const { result } = renderHook(() => useS2AudioTracks({ ...BASE_PROPS }));
    await waitFor(() => expect(mockPlayVideo).toHaveBeenCalled());
    expect(result.current.audioTracks).toHaveLength(0);
  });

  it('handles success: false in playVideo', async () => {
    mockPlayVideo.mockResolvedValue({ success: false });
    const { result } = renderHook(() => useS2AudioTracks({ ...BASE_PROPS }));
    await waitFor(() => expect(mockPlayVideo).toHaveBeenCalled());
    expect(result.current.audioTracks).toHaveLength(0);
  });

  it('seeds state from initialTracks', () => {
    const tracks = [{ id: '1', label: 'T1', language: 'en', streamUrl: 'u1' }];
    const { result } = renderHook(() =>
      useS2AudioTracks({
        ...BASE_PROPS,
        skipDiscovery: true,
        initialTracks: tracks,
      }),
    );
    expect(result.current.audioTracks).toHaveLength(1);
  });

  it('handles empty initialTracks', () => {
    const { result } = renderHook(() =>
      useS2AudioTracks({
        ...BASE_PROPS,
        skipDiscovery: true,
        initialTracks: [],
      }),
    );
    expect(result.current.audioTracks).toHaveLength(0);
  });

  it('responds to track change for content-id', async () => {
    const onRefetch = vi.fn();
    mockPlayVideo.mockResolvedValue(makePlayResponse());
    const { result } = renderHook(() =>
      useS2AudioTracks({ ...BASE_PROPS, onRefetch }),
    );
    await waitFor(() => expect(result.current.audioTracks).toHaveLength(2));
    act(() => result.current.handleAudioTrackChange('s2:ru::456'));
    expect(onRefetch).toHaveBeenCalledWith('s2:ru::456');
  });

  it('responds to track change for direct url', async () => {
    const onStreamChange = vi.fn();
    mockPlayVideo.mockResolvedValue(
      makePlayResponse({
        audioTracks: [
          { language: 'en', label: 'E', streamUrl: 'http://cdn.mp4' },
        ],
      }),
    );
    const { result } = renderHook(() =>
      useS2AudioTracks({ ...BASE_PROPS, onStreamChange }),
    );
    await waitFor(() => expect(result.current.audioTracks).toHaveLength(1));
    act(() => result.current.handleAudioTrackChange('http://cdn.mp4'));
    expect(onStreamChange).toHaveBeenCalledWith('http://cdn.mp4');
  });
});
