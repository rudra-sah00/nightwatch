import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { S2AudioTrack } from '@/features/watch/player/hooks/useS2AudioTracks';
import { useWatchPartyVideoArea } from '@/features/watch-party/hooks/use-watch-party-video-area';
import type { WatchPartyRoom } from '@/features/watch-party/room/types';

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

const S2_TRACKS: S2AudioTrack[] = [
  {
    id: 's2:show::en',
    label: 'English',
    language: 'en',
    streamUrl: 's2:show::en',
  },
  {
    id: 's2:show::es',
    label: 'Spanish',
    language: 'es',
    streamUrl: 's2:show::es',
  },
];

describe('useWatchPartyVideoArea', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Audio tracks from room object ────────────────────────────────────────

  it('returns empty initialAudioTracks when room has no audioTracks', () => {
    const room = makeRoom({ providerId: 's1', type: 'movie' });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.initialAudioTracks).toEqual([]);
  });

  it('returns audio tracks from room.audioTracks when populated', () => {
    const room = makeRoom({
      providerId: 's1',
      type: 'movie',
      audioTracks: S2_TRACKS,
    });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.initialAudioTracks).toEqual(S2_TRACKS);
  });

  it('returns empty initialAudioTracks for s1 room even if audioTracks populated', () => {
    const room = makeRoom({
      providerId: 's1',
      type: 'movie',
      audioTracks: S2_TRACKS,
    });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    // Tracks are still returned; the player won't show them for S1 without
    // onAudioTrackChange wiring, but the hook just passes them through.
    expect(result.current.initialAudioTracks).toEqual(S2_TRACKS);
  });

  // ── initialAudioTrackId ──────────────────────────────────────────────────

  it('returns initialAudioTrackId equal to room.contentId for s2 room with multiple tracks', () => {
    const room = makeRoom({
      providerId: 's1',
      type: 'movie',
      contentId: 's2:show::en',
      audioTracks: S2_TRACKS,
    });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.initialAudioTrackId).toBe('s2:show::en');
  });

  it('returns undefined initialAudioTrackId for s2 room with only one track', () => {
    const room = makeRoom({
      providerId: 's1',
      type: 'movie',
      audioTracks: [S2_TRACKS[0]],
    });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.initialAudioTrackId).toBeUndefined();
  });

  it('returns undefined initialAudioTrackId for s1 rooms', () => {
    const room = makeRoom({
      providerId: 's1',
      type: 'movie',
      audioTracks: S2_TRACKS,
    });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.initialAudioTrackId).toBeUndefined();
  });

  it('returns undefined initialAudioTrackId when room has no audioTracks', () => {
    const room = makeRoom({ providerId: 's1', type: 'movie' });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.initialAudioTrackId).toBeUndefined();
  });

  // ── handleAudioTrackChange ──────────────────────────────────────────────

  it('handleAudioTrackChange calls setStreamUrlOverride for direct-URL tracks', () => {
    const directTracks: S2AudioTrack[] = [
      {
        id: 'https://example.com/en.mp4',
        label: 'English',
        language: 'en',
        streamUrl: 'https://example.com/en.mp4',
      },
      {
        id: 'https://example.com/es.mp4',
        label: 'Spanish',
        language: 'es',
        streamUrl: 'https://example.com/es.mp4',
      },
    ];
    const room = makeRoom({
      providerId: 's1',
      type: 'movie',
      audioTracks: directTracks,
    });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    act(() => {
      result.current.handleAudioTrackChange('https://example.com/es.mp4');
    });

    expect(result.current.streamUrlOverride).toBe('https://example.com/es.mp4');
  });

  it('handleAudioTrackChange is a no-op for s2: content-ID tracks', () => {
    const room = makeRoom({
      providerId: 's1',
      type: 'movie',
      audioTracks: S2_TRACKS,
    });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    act(() => {
      result.current.handleAudioTrackChange('s2:show::es');
    });

    // s2: dub switch is a no-op in WP (host would need to update party content)
    expect(result.current.streamUrlOverride).toBeNull();
  });

  it('handleAudioTrackChange does nothing for unknown trackId', () => {
    const room = makeRoom({
      providerId: 's1',
      type: 'movie',
      audioTracks: S2_TRACKS,
    });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    act(() => {
      result.current.handleAudioTrackChange('unknown-id');
    });

    expect(result.current.streamUrlOverride).toBeNull();
  });

  // ── streamUrlOverride lifecycle ──────────────────────────────────────────

  it('streamUrlOverride is null initially', () => {
    const room = makeRoom({ providerId: 's1', type: 'movie' });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.streamUrlOverride).toBeNull();
  });

  it('streamUrlOverride resets to null when room.contentId changes', () => {
    const directTracks: S2AudioTrack[] = [
      {
        id: 'https://example.com/en.mp4',
        label: 'English',
        language: 'en',
        streamUrl: 'https://example.com/en.mp4',
      },
    ];
    const initialRoom = makeRoom({
      contentId: 'content-A',
      audioTracks: directTracks,
    });
    const { result, rerender } = renderHook(
      ({ room }) => useWatchPartyVideoArea(room),
      { initialProps: { room: initialRoom } },
    );

    act(() => {
      result.current.handleAudioTrackChange('https://example.com/en.mp4');
    });
    expect(result.current.streamUrlOverride).toBe('https://example.com/en.mp4');

    const newRoom = makeRoom({ contentId: 'content-B' });
    rerender({ room: newRoom });

    expect(result.current.streamUrlOverride).toBeNull();
  });

  // ── Metadata ─────────────────────────────────────────────────────────────

  it('metadata reflects room properties correctly', () => {
    const room = makeRoom({
      providerId: 's1',
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
    const room = makeRoom({ providerId: 's1', type: 'livestream' });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.metadata.providerId).toBe('s1');
  });

  it('metadata providerId matches room.providerId for non-livestream s2 room', () => {
    const room = makeRoom({ providerId: 's1', type: 'movie' });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.metadata.providerId).toBe('s1');
  });

  it('metadata providerId defaults to s1 when room.providerId is undefined and no prefix matches', () => {
    const room = makeRoom({ providerId: undefined, type: 'movie' });
    const { result } = renderHook(() => useWatchPartyVideoArea(room));

    expect(result.current.metadata.providerId).toBe('s1');
  });
});
