import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock playVideo ──────────────────────────────────────────────────────────
const { mockPlayVideo } = vi.hoisted(() => ({ mockPlayVideo: vi.fn() }));
vi.mock('@/features/search/api', () => ({
  playVideo: mockPlayVideo,
}));

import type { PlayResponse } from '@/features/search/types';
import {
  type S2AudioTrack,
  useS2AudioTracks,
} from '@/features/watch/player/hooks/s2/useS2AudioTracks';

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

  // ── No-op for S1 ───────────────────────────────────────────────────────────

  it('returns empty tracks and does not call playVideo for s1', () => {
    const { result } = renderHook(() =>
      useS2AudioTracks({ ...BASE_PROPS, server: 's1' }),
    );

    expect(result.current.audioTracks).toHaveLength(0);
    expect(mockPlayVideo).not.toHaveBeenCalled();
  });

  // ── skipDiscovery ─────────────────────────────────────────────────────────

  it('does not call playVideo when skipDiscovery is true', () => {
    renderHook(() => useS2AudioTracks({ ...BASE_PROPS, skipDiscovery: true }));

    expect(mockPlayVideo).not.toHaveBeenCalled();
  });

  // ── Discovery ─────────────────────────────────────────────────────────────

  it('calls playVideo once on mount and populates audioTracks', async () => {
    mockPlayVideo.mockResolvedValue(makePlayResponse());

    const { result } = renderHook(() => useS2AudioTracks({ ...BASE_PROPS }));

    await waitFor(() => {
      expect(result.current.audioTracks).toHaveLength(2);
    });

    expect(mockPlayVideo).toHaveBeenCalledOnce();
    expect(result.current.audioTracks[0]).toMatchObject({
      id: 's2:en::123',
      label: 'English',
      language: 'en',
      streamUrl: 's2:en::123',
    });
  });

  it('calls onDiscovered with the full play response after discovery', async () => {
    const onDiscovered = vi.fn();
    const response = makePlayResponse();
    mockPlayVideo.mockResolvedValue(response);

    renderHook(() => useS2AudioTracks({ ...BASE_PROPS, onDiscovered }));

    await waitFor(() => {
      expect(onDiscovered).toHaveBeenCalledWith(response);
    });
  });

  it('gracefully handles playVideo rejection (non-critical)', async () => {
    mockPlayVideo.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useS2AudioTracks({ ...BASE_PROPS }));

    // Should stay empty — audio tracks are non-critical
    await vi.waitFor(() => expect(mockPlayVideo).toHaveBeenCalled());
    expect(result.current.audioTracks).toHaveLength(0);
  });

  // ── onBeforeDiscovery ─────────────────────────────────────────────────────

  it('calls onBeforeDiscovery before playVideo is invoked', async () => {
    const callOrder: string[] = [];
    const onBeforeDiscovery = vi.fn(() => callOrder.push('before'));
    mockPlayVideo.mockImplementation(async () => {
      callOrder.push('play');
      return makePlayResponse();
    });

    renderHook(() => useS2AudioTracks({ ...BASE_PROPS, onBeforeDiscovery }));

    await waitFor(() => expect(callOrder).toHaveLength(2));

    expect(callOrder).toEqual(['before', 'play']);
    expect(onBeforeDiscovery).toHaveBeenCalledOnce();
  });

  it('does NOT call onBeforeDiscovery when skipDiscovery is true', () => {
    const onBeforeDiscovery = vi.fn();
    renderHook(() =>
      useS2AudioTracks({
        ...BASE_PROPS,
        skipDiscovery: true,
        onBeforeDiscovery,
      }),
    );

    expect(mockPlayVideo).not.toHaveBeenCalled();
    expect(onBeforeDiscovery).not.toHaveBeenCalled();
  });

  it('does NOT call onBeforeDiscovery for s1 server', () => {
    const onBeforeDiscovery = vi.fn();
    renderHook(() =>
      useS2AudioTracks({ ...BASE_PROPS, server: 's1', onBeforeDiscovery }),
    );

    expect(mockPlayVideo).not.toHaveBeenCalled();
    expect(onBeforeDiscovery).not.toHaveBeenCalled();
  });

  // ── initialTracks sync ────────────────────────────────────────────────────

  it('seeds state from initialTracks immediately without calling playVideo', () => {
    const initialTracks: S2AudioTrack[] = [
      {
        id: 's2:en::123',
        label: 'English',
        language: 'en',
        streamUrl: 's2:en::123',
      },
    ];

    const { result } = renderHook(() =>
      useS2AudioTracks({ ...BASE_PROPS, skipDiscovery: true, initialTracks }),
    );

    expect(result.current.audioTracks).toHaveLength(1);
    expect(mockPlayVideo).not.toHaveBeenCalled();
  });

  it('syncs initialTracks into state when they arrive asynchronously', async () => {
    const { result, rerender } = renderHook(
      ({ tracks }: { tracks?: S2AudioTrack[] }) =>
        useS2AudioTracks({
          ...BASE_PROPS,
          skipDiscovery: true,
          initialTracks: tracks,
        }),
      { initialProps: { tracks: undefined as S2AudioTrack[] | undefined } },
    );

    expect(result.current.audioTracks).toHaveLength(0);

    const tracks: S2AudioTrack[] = [
      {
        id: 's2:en::123',
        label: 'English',
        language: 'en',
        streamUrl: 's2:en::123',
      },
      {
        id: 's2:ru::456',
        label: 'Russian',
        language: 'ru',
        streamUrl: 's2:ru::456',
      },
    ];

    act(() => {
      rerender({ tracks });
    });

    await waitFor(() => {
      expect(result.current.audioTracks).toHaveLength(2);
    });
  });

  // ── Track selection ───────────────────────────────────────────────────────

  it('calls onRefetch for s2: content-ID dubs', async () => {
    const onRefetch = vi.fn();
    mockPlayVideo.mockResolvedValue(makePlayResponse());

    const { result } = renderHook(() =>
      useS2AudioTracks({ ...BASE_PROPS, onRefetch }),
    );

    await waitFor(() => expect(result.current.audioTracks).toHaveLength(2));

    act(() => {
      result.current.handleAudioTrackChange('s2:ru::456');
    });

    expect(onRefetch).toHaveBeenCalledWith('s2:ru::456');
    expect(BASE_PROPS.onStreamChange).not.toHaveBeenCalled();
  });

  it('calls onStreamChange for legacy direct MP4 URL dubs', async () => {
    const onStreamChange = vi.fn();
    const response = makePlayResponse({
      audioTracks: [
        {
          language: 'en',
          label: 'English',
          streamUrl: 'https://cdn.example.com/en.mp4',
        },
        {
          language: 'ru',
          label: 'Russian',
          streamUrl: 'https://cdn.example.com/ru.mp4',
        },
      ],
    });
    mockPlayVideo.mockResolvedValue(response);

    const { result } = renderHook(() =>
      useS2AudioTracks({ ...BASE_PROPS, onStreamChange }),
    );

    await waitFor(() => expect(result.current.audioTracks).toHaveLength(2));

    act(() => {
      result.current.handleAudioTrackChange('https://cdn.example.com/ru.mp4');
    });

    expect(onStreamChange).toHaveBeenCalledWith(
      'https://cdn.example.com/ru.mp4',
    );
    expect(BASE_PROPS.onRefetch).not.toHaveBeenCalled();
  });

  it('does nothing when an unknown trackId is selected', async () => {
    const onRefetch = vi.fn();
    const onStreamChange = vi.fn();
    mockPlayVideo.mockResolvedValue(makePlayResponse());

    const { result } = renderHook(() =>
      useS2AudioTracks({ ...BASE_PROPS, onRefetch, onStreamChange }),
    );

    await waitFor(() => expect(result.current.audioTracks).toHaveLength(2));

    act(() => {
      result.current.handleAudioTrackChange('unknown-id');
    });

    expect(onRefetch).not.toHaveBeenCalled();
    expect(onStreamChange).not.toHaveBeenCalled();
  });

  // ── Series support ────────────────────────────────────────────────────────

  it('passes season and episode to playVideo for series content', async () => {
    mockPlayVideo.mockResolvedValue(makePlayResponse());

    renderHook(() =>
      useS2AudioTracks({
        ...BASE_PROPS,
        type: 'series',
        seriesId: 's2:series::999',
        season: '2',
        episode: '3',
      }),
    );

    await waitFor(() => expect(mockPlayVideo).toHaveBeenCalled());

    expect(mockPlayVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'series',
        season: 2,
        episode: 3,
      }),
    );
  });
});
