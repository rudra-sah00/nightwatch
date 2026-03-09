import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { S2AudioTrack } from '@/features/watch/player/hooks/s2/useS2AudioTracks';
import { useWatchPartyVideoArea } from '@/features/watch-party/hooks/use-watch-party-video-area';
import type { WatchPartyRoom } from '@/features/watch-party/room/types';

// Capture the latest useS2AudioTracks call arguments for assertion
let _latestS2Props: Record<string, unknown> = {};
const mockHandleAudioTrackChange = vi.fn();

vi.mock('@/features/watch/player/hooks/s2/useS2AudioTracks', () => ({
  useS2AudioTracks: vi.fn((props) => {
    _latestS2Props = props;
    return {
      audioTracks: [] as S2AudioTrack[],
      handleAudioTrackChange: mockHandleAudioTrackChange,
    };
  }),
}));

function makeRoom(overrides: Partial<WatchPartyRoom> = {}): WatchPartyRoom {
  return {
    id: 'room-1',
    hostId: 'host-1',
    contentId: 'content-123',
    title: 'Test Movie',
    type: 'movie',
    streamUrl: 'https://example.com/stream.mp4',
    posterUrl: 'https://example.com/poster.jpg',
    members: [],
    pendingMembers: [],
    state: {
      currentTime: 0,
      isPlaying: false,
      playbackRate: 1,
      lastUpdated: 0,
    },
    permissions: {
      canGuestsDraw: false,
      canGuestsPlaySounds: false,
      canGuestsChat: true,
    },
    createdAt: Date.now(),
    ...overrides,
  };
}

describe('useWatchPartyVideoArea', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _latestS2Props = {};
  });

  it('uses s1 when providerId is s1 and skips s2 discovery', async () => {
    const { useS2AudioTracks } = await import(
      '@/features/watch/player/hooks/s2/useS2AudioTracks'
    );

    const room = makeRoom({ providerId: 's1' });
    renderHook(() => useWatchPartyVideoArea(room));

    expect(vi.mocked(useS2AudioTracks)).toHaveBeenCalledWith(
      expect.objectContaining({ skipDiscovery: true }),
    );
  });

  it('defaults to s1 when providerId is undefined', async () => {
    const { useS2AudioTracks } = await import(
      '@/features/watch/player/hooks/s2/useS2AudioTracks'
    );

    const room = makeRoom({ providerId: undefined });
    renderHook(() => useWatchPartyVideoArea(room));

    expect(vi.mocked(useS2AudioTracks)).toHaveBeenCalledWith(
      expect.objectContaining({ skipDiscovery: true }),
    );
  });

  it('enables s2 discovery for s2 movie room', async () => {
    const { useS2AudioTracks } = await import(
      '@/features/watch/player/hooks/s2/useS2AudioTracks'
    );

    const room = makeRoom({
      providerId: 's2',
      type: 'movie',
      contentId: 'movie-456',
    });
    renderHook(() => useWatchPartyVideoArea(room));

    expect(vi.mocked(useS2AudioTracks)).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDiscovery: false,
        server: 's2',
        type: 'movie',
        movieId: 'movie-456',
        seriesId: undefined,
      }),
    );
  });

  it('enables s2 discovery for s2 series room with season and episode', async () => {
    const { useS2AudioTracks } = await import(
      '@/features/watch/player/hooks/s2/useS2AudioTracks'
    );

    const room = makeRoom({
      providerId: 's2',
      type: 'series',
      contentId: 'series-789',
      season: 3,
      episode: 7,
    });
    renderHook(() => useWatchPartyVideoArea(room));

    expect(vi.mocked(useS2AudioTracks)).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDiscovery: false,
        server: 's2',
        type: 'series',
        seriesId: 'series-789',
        movieId: undefined,
        season: '3',
        episode: '7',
      }),
    );
  });

  it('skips discovery for s2 livestream (always skipDiscovery=true)', async () => {
    const { useS2AudioTracks } = await import(
      '@/features/watch/player/hooks/s2/useS2AudioTracks'
    );

    const room = makeRoom({ providerId: 's2', type: 'livestream' });
    renderHook(() => useWatchPartyVideoArea(room));

    expect(vi.mocked(useS2AudioTracks)).toHaveBeenCalledWith(
      expect.objectContaining({ skipDiscovery: true }),
    );
  });

  it('returns empty initialAudioTracks when useS2AudioTracks returns none', () => {
    const room = makeRoom({ providerId: 's2', type: 'movie' });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.initialAudioTracks).toEqual([]);
  });

  it('returns audio tracks from useS2AudioTracks when available', async () => {
    const { useS2AudioTracks } = await import(
      '@/features/watch/player/hooks/s2/useS2AudioTracks'
    );

    const mockTracks: S2AudioTrack[] = [
      {
        id: 'en',
        label: 'English',
        language: 'en',
        streamUrl: 'https://example.com/en.mp4',
      },
      {
        id: 'es',
        label: 'Spanish',
        language: 'es',
        streamUrl: 'https://example.com/es.mp4',
      },
    ];
    vi.mocked(useS2AudioTracks).mockReturnValue({
      audioTracks: mockTracks,
      handleAudioTrackChange: mockHandleAudioTrackChange,
    });

    const room = makeRoom({ providerId: 's2', type: 'movie' });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.initialAudioTracks).toEqual(mockTracks);
  });

  it('returns handleAudioTrackChange from useS2AudioTracks', () => {
    const room = makeRoom({ providerId: 's2', type: 'movie' });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.handleAudioTrackChange).toBe(
      mockHandleAudioTrackChange,
    );
  });

  it('streamUrlOverride is null initially', () => {
    const room = makeRoom({ providerId: 's2', type: 'movie' });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.streamUrlOverride).toBeNull();
  });

  it('streamUrlOverride updates when onStreamChange is triggered from hook', async () => {
    const { useS2AudioTracks } = await import(
      '@/features/watch/player/hooks/s2/useS2AudioTracks'
    );

    let capturedOnStreamChange: ((url: string) => void) | null = null;
    vi.mocked(useS2AudioTracks).mockImplementation((props) => {
      capturedOnStreamChange = props.onStreamChange;
      return {
        audioTracks: [],
        handleAudioTrackChange: mockHandleAudioTrackChange,
      };
    });

    const room = makeRoom({ providerId: 's2', type: 'movie' });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.streamUrlOverride).toBeNull();

    act(() => {
      capturedOnStreamChange?.('https://example.com/dub-es.mp4');
    });

    expect(result.current.streamUrlOverride).toBe(
      'https://example.com/dub-es.mp4',
    );
  });

  it('metadata reflects room properties correctly', () => {
    const room = makeRoom({
      providerId: 's2',
      type: 'series',
      title: 'Breaking Bad',
      contentId: 'bb-series',
      season: 4,
      episode: 6,
      posterUrl: 'https://example.com/bb.jpg',
    });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.metadata).toMatchObject({
      title: 'Breaking Bad',
      type: 'series',
      season: 4,
      episode: 6,
      seriesId: 'bb-series',
      posterUrl: 'https://example.com/bb.jpg',
    });
  });

  it('metadata forces providerId to s1 for livestream', () => {
    const room = makeRoom({ providerId: 's2', type: 'livestream' });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.metadata.providerId).toBe('s1');
  });

  it('metadata providerId matches room.providerId for non-livestream s2 room', () => {
    const room = makeRoom({ providerId: 's2', type: 'movie' });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.metadata.providerId).toBe('s2');
  });

  it('metadata providerId is undefined when room.providerId is undefined', () => {
    const room = makeRoom({ providerId: undefined, type: 'movie' });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.metadata.providerId).toBeUndefined();
  });

  it('streamUrlOverride resets to null when room.contentId changes', async () => {
    const { useS2AudioTracks } = await import(
      '@/features/watch/player/hooks/s2/useS2AudioTracks'
    );

    let capturedOnStreamChange: ((url: string) => void) | null = null;
    vi.mocked(useS2AudioTracks).mockImplementation((props) => {
      capturedOnStreamChange = props.onStreamChange;
      return {
        audioTracks: [],
        handleAudioTrackChange: mockHandleAudioTrackChange,
      };
    });

    const initialRoom = makeRoom({ providerId: 's2', contentId: 'content-A' });
    const { result, rerender } = renderHook(
      ({ room }) => useWatchPartyVideoArea(room),
      { initialProps: { room: initialRoom } },
    );

    // Set override to simulate host switching audio dub
    act(() => {
      capturedOnStreamChange?.('https://example.com/dub-es.mp4');
    });
    expect(result.current.streamUrlOverride).toBe(
      'https://example.com/dub-es.mp4',
    );

    // Host changes content — new contentId comes in via room prop
    const newRoom = makeRoom({ providerId: 's2', contentId: 'content-B' });
    rerender({ room: newRoom });

    // Override must be cleared so the player uses the new room.streamUrl
    expect(result.current.streamUrlOverride).toBeNull();
  });

  it('passes null season/episode to useS2AudioTracks when unset on series room', async () => {
    const { useS2AudioTracks } = await import(
      '@/features/watch/player/hooks/s2/useS2AudioTracks'
    );

    const room = makeRoom({
      providerId: 's2',
      type: 'series',
      season: undefined,
      episode: undefined,
    });
    renderHook(() => useWatchPartyVideoArea(room));

    expect(vi.mocked(useS2AudioTracks)).toHaveBeenCalledWith(
      expect.objectContaining({ season: null, episode: null }),
    );
  });
});
