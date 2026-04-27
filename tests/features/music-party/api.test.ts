import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/fetch', () => ({ apiFetch: vi.fn() }));

import {
  addToMusicPartyQueue,
  createMusicParty,
  getMusicPartyRoom,
  joinMusicParty,
  leaveMusicParty,
  syncMusicPartyState,
} from '@/features/music-party/api';
import { apiFetch } from '@/lib/fetch';

const mockApiFetch = vi.mocked(apiFetch);

describe('Music Party API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMusicParty', () => {
    it('should POST with party name', async () => {
      const mockResponse = {
        room: { id: 'r1' },
        rtm: { token: 't', channelName: 'c' },
      };
      mockApiFetch.mockResolvedValueOnce(mockResponse);

      const result = await createMusicParty('Chill Vibes');

      expect(mockApiFetch).toHaveBeenCalledWith('/api/music-party/create', {
        method: 'POST',
        body: JSON.stringify({ name: 'Chill Vibes' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getMusicPartyRoom', () => {
    it('should GET room by id', async () => {
      const mockRoom = { id: 'r1', name: 'Test' };
      mockApiFetch.mockResolvedValueOnce(mockRoom);

      const result = await getMusicPartyRoom('r1');

      expect(mockApiFetch).toHaveBeenCalledWith('/api/music-party/r1');
      expect(result).toEqual(mockRoom);
    });
  });

  describe('joinMusicParty', () => {
    it('should POST with displayName', async () => {
      const mockResponse = {
        room: { id: 'r1' },
        rtm: { token: 't', channelName: 'c' },
        userId: 'u1',
      };
      mockApiFetch.mockResolvedValueOnce(mockResponse);

      const result = await joinMusicParty('r1', 'Alice');

      expect(mockApiFetch).toHaveBeenCalledWith('/api/music-party/r1/join', {
        method: 'POST',
        body: JSON.stringify({ displayName: 'Alice' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('leaveMusicParty', () => {
    it('should POST empty body to leave endpoint', async () => {
      mockApiFetch.mockResolvedValueOnce(undefined);

      await leaveMusicParty('r1');

      expect(mockApiFetch).toHaveBeenCalledWith('/api/music-party/r1/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
    });
  });

  describe('addToMusicPartyQueue', () => {
    it('should POST track data to queue endpoint', async () => {
      const track = {
        id: 't1',
        title: 'Song',
        artist: 'Artist',
        album: 'Album',
        image: 'img',
        duration: 200,
      };
      const mockRoom = { id: 'r1', queue: [track] };
      mockApiFetch.mockResolvedValueOnce(mockRoom);

      const result = await addToMusicPartyQueue('r1', track);

      expect(mockApiFetch).toHaveBeenCalledWith('/api/music-party/r1/queue', {
        method: 'POST',
        body: JSON.stringify(track),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockRoom);
    });
  });

  describe('syncMusicPartyState', () => {
    it('should POST playback state', async () => {
      const state = { isPlaying: true, progress: 42 };
      const mockRoom = { id: 'r1', isPlaying: true, progress: 42 };
      mockApiFetch.mockResolvedValueOnce(mockRoom);

      const result = await syncMusicPartyState('r1', state);

      expect(mockApiFetch).toHaveBeenCalledWith('/api/music-party/r1/state', {
        method: 'POST',
        body: JSON.stringify(state),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockRoom);
    });
  });
});
