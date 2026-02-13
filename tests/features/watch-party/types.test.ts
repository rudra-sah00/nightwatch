import { describe, expect, it } from 'vitest';
import type {
  ChatMessage,
  PartyCreatePayload,
  PartySyncPayload,
  RoomMember,
  RoomPreview,
  RoomState,
  WatchPartyRoom,
} from '@/features/watch-party/types';

describe('RoomMember Type', () => {
  it('creates valid room member', () => {
    const member: RoomMember = {
      id: 'user-1',
      name: 'John Doe',
      isHost: true,
      joinedAt: Date.now(),
    };

    expect(member.id).toBe('user-1');
    expect(member.isHost).toBe(true);
  });

  it('creates non-host member', () => {
    const member: RoomMember = {
      id: 'user-2',
      name: 'Jane Smith',
      isHost: false,
      joinedAt: Date.now(),
    };

    expect(member.isHost).toBe(false);
  });
});

describe('RoomState Type', () => {
  it('creates valid room state', () => {
    const state: RoomState = {
      currentTime: 120.5,
      isPlaying: true,
      lastUpdated: Date.now(),
      playbackRate: 1,
    };

    expect(state.currentTime).toBe(120.5);
    expect(state.isPlaying).toBe(true);
  });

  it('creates paused state', () => {
    const state: RoomState = {
      currentTime: 300,
      isPlaying: false,
      lastUpdated: Date.now(),
      playbackRate: 1,
    };

    expect(state.isPlaying).toBe(false);
  });
});

describe('WatchPartyRoom Type', () => {
  it('creates valid movie watch party room', () => {
    const room: WatchPartyRoom = {
      id: 'room-1',
      hostId: 'user-1',
      contentId: 'movie-123',
      title: 'The Dark Knight',
      type: 'movie',
      streamUrl: 'https://example.com/stream.m3u8',
      posterUrl: 'https://example.com/poster.jpg',
      members: [],
      pendingMembers: [],
      state: {
        currentTime: 0,
        isPlaying: false,
        lastUpdated: Date.now(),
        playbackRate: 1,
      },
      createdAt: Date.now(),
    };

    expect(room.type).toBe('movie');
    expect(room.season).toBeUndefined();
    expect(room.episode).toBeUndefined();
  });

  it('creates valid series watch party room', () => {
    const room: WatchPartyRoom = {
      id: 'room-2',
      hostId: 'user-1',
      contentId: 'series-456',
      title: 'Breaking Bad',
      type: 'series',
      season: 1,
      episode: 1,
      streamUrl: 'https://example.com/stream.m3u8',
      members: [],
      pendingMembers: [],
      state: {
        currentTime: 0,
        isPlaying: false,
        lastUpdated: Date.now(),
        playbackRate: 1,
      },
      createdAt: Date.now(),
    };

    expect(room.type).toBe('series');
    expect(room.season).toBe(1);
    expect(room.episode).toBe(1);
  });

  it('includes subtitle tracks', () => {
    const room: WatchPartyRoom = {
      id: 'room-3',
      hostId: 'user-1',
      contentId: 'movie-123',
      title: 'Test Movie',
      type: 'movie',
      streamUrl: 'https://example.com/stream.m3u8',
      subtitleTracks: [
        {
          id: 'sub-1',
          label: 'English',
          language: 'en',
          src: 'https://example.com/en.vtt',
        },
        {
          id: 'sub-2',
          label: 'Spanish',
          language: 'es',
          src: 'https://example.com/es.vtt',
        },
      ],
      members: [],
      pendingMembers: [],
      state: {
        currentTime: 0,
        isPlaying: false,
        lastUpdated: Date.now(),
        playbackRate: 1,
      },
      createdAt: Date.now(),
    };

    expect(room.subtitleTracks).toHaveLength(2);
    expect(room.subtitleTracks?.[0].language).toBe('en');
  });
});

describe('RoomPreview Type', () => {
  it('creates valid room preview', () => {
    const preview: RoomPreview = {
      id: 'room-1',
      title: 'The Dark Knight',
      type: 'movie',
      hostName: 'John Doe',
      memberCount: 3,
    };

    expect(preview.id).toBe('room-1');
    expect(preview.memberCount).toBe(3);
  });

  it('creates series room preview', () => {
    const preview: RoomPreview = {
      id: 'room-2',
      title: 'Breaking Bad',
      type: 'series',
      season: 1,
      episode: 1,
      hostName: 'Jane Smith',
      memberCount: 10,
    };

    expect(preview.type).toBe('series');
    expect(preview.season).toBe(1);
  });
});

describe('ChatMessage Type', () => {
  it('creates valid chat message', () => {
    const message: ChatMessage = {
      id: 'msg-1',
      roomId: 'room-1',
      userId: 'user-1',
      userName: 'John Doe',
      content: 'Hello everyone!',
      isSystem: false,
      timestamp: Date.now(),
    };

    expect(message.content).toBe('Hello everyone!');
    expect(message.userName).toBe('John Doe');
  });
});

describe('PartyCreatePayload Type', () => {
  it('creates movie party payload', () => {
    const payload: PartyCreatePayload = {
      contentId: 'movie-123',
      title: 'The Dark Knight',
      type: 'movie',
      streamUrl: 'https://example.com/stream.m3u8',
      posterUrl: 'https://example.com/poster.jpg',
    };

    expect(payload.type).toBe('movie');
    expect(payload.contentId).toBe('movie-123');
  });

  it('creates series party payload', () => {
    const payload: PartyCreatePayload = {
      contentId: 'series-456',
      title: 'Breaking Bad',
      type: 'series',
      season: 1,
      episode: 1,
      streamUrl: 'https://example.com/stream.m3u8',
    };

    expect(payload.season).toBe(1);
    expect(payload.episode).toBe(1);
  });
});

describe('PartySyncPayload Type', () => {
  it('creates sync payload', () => {
    const payload: PartySyncPayload = {
      currentTime: 125.5,
      isPlaying: true,
    };

    expect(payload.currentTime).toBe(125.5);
    expect(payload.isPlaying).toBe(true);
  });

  it('creates pause sync payload', () => {
    const payload: PartySyncPayload = {
      currentTime: 300,
      isPlaying: false,
    };

    expect(payload.isPlaying).toBe(false);
  });
});
