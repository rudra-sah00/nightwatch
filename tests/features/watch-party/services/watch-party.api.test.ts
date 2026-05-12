import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/watch-party/room/services/watch-party.api';
import type {
  ChatMessage,
  PartyCreatePayload,
  PartyJoinRequestPayload,
} from '@/features/watch-party/room/types';
import type {
  RTMMessage,
  RtmInteraction,
  RtmSketchDraw,
} from '@/features/watch-party/room/types/rtm-messages';

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

    it('requestPartyState should handle success and failure', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ isPlaying: true }),
        } as Response)
        .mockRejectedValueOnce(new Error('fail'));
      const r1 = await api.requestPartyState('ABC');
      expect(r1.state).toEqual({ isPlaying: true });
      const r2 = await api.requestPartyState('ABC');
      expect(r2.error).toBe('fail');
    });

    it('syncPartyState should handle success and failure', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        } as Response)
        .mockRejectedValueOnce(new Error('fail'));
      const r1 = await api.syncPartyState('ABC', { currentTime: 1 });
      expect(r1.success).toBe(true);
      const r2 = await api.syncPartyState('ABC', { currentTime: 1 });
      expect(r2.error).toBe('fail');
    });

    it('getPartyRoom should handle success and failure', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'ABC' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => null,
        } as Response)
        .mockRejectedValueOnce(new Error('fail'));
      const r1 = await api.getPartyRoom('ABC');
      expect(r1.room?.id).toBe('ABC');
      const r2 = await api.getPartyRoom('ABC');
      expect(r2.error).toBe('Not found');
      const r3 = await api.getPartyRoom('ABC');
      expect(r3.error).toBe('Not found'); // Network errors become "Not found"
    });

    it('updatePartyContent should handle success and failure', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ room: { id: 'ABC' } }),
        } as Response)
        .mockRejectedValueOnce(new Error('fail'));
      const r1 = await api.updatePartyContent('ABC', {
        title: '1',
        type: 'movie',
      });
      expect(r1.room?.id).toBe('ABC');
      const r2 = await api.updatePartyContent('ABC', {
        title: '1',
        type: 'movie',
      });
      expect(r2.error).toBe('fail');
    });

    it('getPartyStreamToken should handle success and failure', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ token: 't1' }),
        } as Response)
        .mockRejectedValueOnce(new Error('fail'));
      const r1 = await api.getPartyStreamToken('ABC');
      expect(r1.token).toBe('t1');
      const r2 = await api.getPartyStreamToken('ABC');
      expect(r2.error).toBe('fail');
    });

    it('fetchPendingRequests should handle success and failure', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ pendingMembers: [] }),
        } as Response)
        .mockRejectedValueOnce(new Error('fail'));
      const r1 = await api.fetchPendingRequests('ABC');
      expect(r1.pendingMembers).toEqual([]);
      const r2 = await api.fetchPendingRequests('ABC');
      expect(r2.error).toBe('fail');
    });

    it('updatePartyPermissions should handle success and failure', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ permissions: {} }),
        } as Response)
        .mockRejectedValueOnce(new Error('fail'));
      const r1 = await api.updatePartyPermissions('ABC', {});
      expect(r1.permissions).toBeDefined();
      const r2 = await api.updatePartyPermissions('ABC', {});
      expect(r2.error).toBe('fail');
    });

    it('updateMemberPermissions should handle success and failure', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ permissions: {} }),
        } as Response)
        .mockRejectedValueOnce(new Error('fail'));
      const r1 = await api.updateMemberPermissions('ABC', 'U1', {});
      expect(r1.permissions).toBeDefined();
      const r2 = await api.updateMemberPermissions('ABC', 'U1', {});
      expect(r2.error).toBe('fail');
    });

    it('sendPartyMessage should handle success and failure', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: { id: 'M1' } as ChatMessage }),
        } as Response)
        .mockRejectedValueOnce(new Error('fail'));
      const r1 = await api.sendPartyMessage('ABC', 'hi');
      expect(r1.message?.id).toBe('M1');
      const r2 = await api.sendPartyMessage('ABC', 'hi');
      expect(r2.error).toBe('fail');
    });

    it('getPartyMessages should handle success and failure', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ messages: [] }),
        } as Response)
        .mockRejectedValueOnce(new Error('fail'));
      const r1 = await api.getPartyMessages('ABC');
      expect(r1.messages).toEqual([]);
      const r2 = await api.getPartyMessages('ABC');
      expect(r2.error).toBe('fail');
    });

    it('searchSounds should handle success', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response);
      const r1 = await api.searchSounds('meme');
      expect(r1.results).toEqual([]);
    });

    // Error blocks for existing endpoints
    it('checkRoomExists should handle false and exceptions', async () => {
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ exists: false, reason: 'r1' }),
        } as Response)
        .mockRejectedValueOnce(new Error('fail'));
      const r1 = await api.checkRoomExists('ABC');
      expect(r1.exists).toBe(false);
      const r2 = await api.checkRoomExists('ABC');
      expect(r2.exists).toBe(false);
    });

    it('createPartyRoom should handle exceptions', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('fail'));
      const r1 = await api.createPartyRoom(
        'ABC',
        {} as unknown as PartyCreatePayload,
      );
      expect(r1.error).toBe('fail');
    });

    it('requestJoinPartyRoom should handle exceptions', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('fail'));
      const r1 = await api.requestJoinPartyRoom(
        'ABC',
        {} as unknown as PartyJoinRequestPayload,
      );
      expect(r1.error).toBe('fail');
    });

    it('approveJoinRequest should handle exceptions', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('fail'));
      const r1 = await api.approveJoinRequest('ABC', 'u1');
      expect(r1.error).toBe('fail');
    });

    it('rejectJoinRequest should handle exceptions', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('fail'));
      const r1 = await api.rejectJoinRequest('ABC', 'u1');
      expect(r1.error).toBe('fail');
    });

    it('kickMember should handle exceptions', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('fail'));
      const r1 = await api.kickMember('ABC', 'u1');
      expect(r1.error).toBe('fail');
    });

    it('leavePartyRoom should handle exceptions', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('fail'));
      const r1 = await api.leavePartyRoom('ABC');
      expect(r1.error).toBe('fail');
    });
  });

  describe('RTM Bridge Listeners', () => {
    it('should allow subscribing to RTM messages', () => {
      const cb = vi.fn();
      const cleanup = api.onSketchDraw(cb);

      // Simulate incoming RTM message
      api.dispatchRtmMessage({
        type: 'SKETCH_DRAW',
        action: { id: '1' } as unknown as RtmSketchDraw['action'], // This is fine for a partial mock as it's cast to RtmSketchDraw anyway
      } as RtmSketchDraw);

      expect(cb).toHaveBeenCalledWith({ id: '1' });

      cleanup();
      api.dispatchRtmMessage({
        type: 'SKETCH_DRAW',
        action: { id: '2' } as unknown as RtmSketchDraw['action'],
      } as RtmSketchDraw);
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
        userId: 'u1',
      } as unknown as RtmInteraction);

      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ emoji: '🔥' }));
    });

    it('should support remaining sketch listeners', () => {
      const cbClear = vi.fn();
      const cbUndo = vi.fn();
      const cbReq = vi.fn();
      const cbSync = vi.fn();

      api.onSketchClear(cbClear);
      api.onSketchUndo(cbUndo);
      api.onSketchProvideSync(cbReq);
      api.onSketchSyncState(cbSync);

      api.dispatchRtmMessage({
        type: 'SKETCH_CLEAR',
        userId: 'u1',
        mode: 'all',
      } as RTMMessage);
      expect(cbClear).toHaveBeenCalledWith({ userId: 'u1', type: 'all' });

      api.dispatchRtmMessage({
        type: 'SKETCH_UNDO',
        userId: 'u1',
        actionId: 'a1',
      } as RTMMessage);
      expect(cbUndo).toHaveBeenCalledWith({ userId: 'u1', actionId: 'a1' });

      api.dispatchRtmMessage({
        type: 'SKETCH_REQUEST_SYNC',
        requesterId: 'r1',
      } as RTMMessage);
      expect(cbReq).toHaveBeenCalledWith({ requesterId: 'r1' });

      api.dispatchRtmMessage({
        type: 'SKETCH_SYNC_STATE',
        elements: [],
        targetId: 't1',
      } as RTMMessage);
      expect(cbSync).toHaveBeenCalledWith({ elements: [] });
    });
  });
});
