import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  approveJoinRequest,
  checkRoomExists,
  createPartyRoom,
  getTrendingSounds,
  kickMember,
  requestJoinPartyRoom,
} from '@/features/watch-party/room/services/watch-party.api';

describe('Watch Party API (REST)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('checkRoomExists', () => {
    it('should return exists true for valid room', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          exists: true,
          title: 'Test Movie',
          type: 'movie',
        }),
      } as Response);

      const result = await checkRoomExists('ABC123');
      expect(result.exists).toBe(true);
      expect(result.preview?.title).toBe('Test Movie');
    });
  });

  describe('createPartyRoom', () => {
    it('should POST room data and return room object', async () => {
      const mockResult = { room: { id: 'R1' }, streamToken: 'T1' };
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      } as Response);

      const result = await createPartyRoom('R1', {
        contentId: 'C1',
        title: 'T',
        type: 'movie',
        streamUrl: 'url',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rooms/R1'),
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result.room?.id).toBe('R1');
    });
  });

  describe('requestJoinPartyRoom', () => {
    it('should handle pending status', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'pending' }),
      } as Response);

      const result = await requestJoinPartyRoom('R1', {
        roomId: 'R1',
        name: 'User',
      });
      expect(result.status).toBe('pending');
    });
  });

  describe('Member Management', () => {
    it('approveJoinRequest should POST to approve endpoint', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const result = await approveJoinRequest('R1', 'U1');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rooms/R1/approve'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('U1'),
        }),
      );
      expect(result.success).toBe(true);
    });

    it('kickMember should POST to kick member', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const _result = await kickMember('R1', 'U1');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rooms/R1/kick'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('U1'),
        }),
      );
    });
  });

  describe('Soundboard API', () => {
    it('getTrendingSounds should fetch sounds', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response);

      await getTrendingSounds(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/soundboard?page=1'),
        expect.any(Object),
      );
    });
  });
});
