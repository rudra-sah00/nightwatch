import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/watch-party/room/services/watch-party.api';
import type {
  PartyCreatePayload,
  PartyJoinRequestPayload,
} from '@/features/watch-party/room/types';

describe('Watch Party API Service (REST & RTM Bridge)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe('REST API functions', () => {
    it('checkRoomExists should handle success', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          exists: true,
          title: 'Test',
          hostName: 'Host',
          memberCount: 1,
        }),
      } as Response);
      const result = await api.checkRoomExists('ABC');
      expect(result.exists).toBe(true);
    });

    it('getRoomDetails should handle success', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'ABC' }),
      } as Response);
      const result = await api.getRoomDetails('ABC');
      expect(result?.id).toBe('ABC');
    });

    it('createPartyRoom should send POST request', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ room: { id: 'ABC' } }),
      } as Response);

      const result = await api.createPartyRoom('ABC', {
        title: 'T',
        type: 'movie',
        contentId: 'c1',
        streamUrl: 's1',
      } as PartyCreatePayload);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rooms/ABC/create'),
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result.room?.id).toBe('ABC');
    });

    it('requestJoinPartyRoom should send POST request', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'pending' }),
      } as Response);

      const result = await api.requestJoinPartyRoom('ABC', {
        roomId: 'ABC',
        name: 'Guest',
      } as PartyJoinRequestPayload);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rooms/ABC/join'),
        expect.any(Object),
      );
      expect(result.status).toBe('pending');
    });

    it('approveJoinRequest should handle success', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);
      const result = await api.approveJoinRequest('ABC', 'u1');
      expect(result.success).toBe(true);
    });

    it('rejectJoinRequest should handle success', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);
      const result = await api.rejectJoinRequest('ABC', 'u1');
      expect(result.success).toBe(true);
    });

    it('kickMember should handle success', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);
      const result = await api.kickMember('ABC', 'u1');
      expect(result.success).toBe(true);
    });

    it('leavePartyRoom should handle success', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);
      const result = await api.leavePartyRoom('ABC');
      expect(result.success).toBe(true);
    });

    it('getTrendingSounds should fetch sounds', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response);
      const result = await api.getTrendingSounds();
      expect(result.results).toEqual([]);
    });
  });

  describe('RTM Bridge Listeners', () => {
    it('should allow subscribing to RTM messages', () => {
      const cb = vi.fn();
      const cleanup = api.onSketchDraw(cb);

      // Simulate incoming RTM message
      api.dispatchRtmMessage({
        type: 'SKETCH_DRAW',
        action: { id: '1' },
      });

      expect(cb).toHaveBeenCalledWith({ id: '1' });

      cleanup();
      api.dispatchRtmMessage({
        type: 'SKETCH_DRAW',
        action: { id: '2' },
      });
      // Should not be called after cleanup
      expect(cb).not.toHaveBeenCalledWith({ id: '2' });
    });

    it('onPartyInteraction should receive all INTERACTION messages', () => {
      const cb = vi.fn();
      api.onPartyInteraction(cb);

      api.dispatchRtmMessage({
        type: 'INTERACTION',
        kind: 'emoji',
        emoji: '🔥',
      });

      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ emoji: '🔥' }));
    });
  });
});
