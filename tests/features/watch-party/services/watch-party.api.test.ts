import type { Socket } from 'socket.io-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/features/watch-party/room/services/watch-party.api';
import type {
  InteractionPayload,
  PartyCreatePayload,
  PartyEvent,
  PartyJoinRequestPayload,
  PartySyncPayload,
} from '@/features/watch-party/room/types';
import { getSocket } from '@/lib/socket';

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_API_URL: 'http://localhost:3000',
  },
}));

vi.mock('@/lib/socket', () => ({
  getSocket: vi.fn(),
}));

describe('Watch Party API Service', () => {
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

    it('getTrendingSounds should fetch sounds', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response);
      const result = await api.getTrendingSounds();
      expect(result.results).toEqual([]);
    });

    it('searchSounds should fetch sounds', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      } as Response);
      const result = await api.searchSounds('test');
      expect(result.results).toEqual([]);
    });
  });

  describe('Socket Emits', () => {
    const mockSocket = { emit: vi.fn(), connected: true };
    beforeEach(() => {
      vi.mocked(getSocket).mockReturnValue(mockSocket as unknown as Socket);
    });

    it('should test all emit functions', () => {
      api.emitPing({ t1: 1 });
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:ping',
        expect.any(Object),
        undefined,
      );

      api.emitPartyEvent({
        eventType: 'play',
        videoTime: 0,
      } as PartyEvent);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:event',
        expect.any(Object),
        undefined,
      );

      api.createPartyRoom(
        {
          title: 'T',
          type: 'movie',
          contentId: 'c1',
          streamUrl: 's1',
        } as PartyCreatePayload,
        vi.fn(),
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:create',
        expect.any(Object),
        expect.any(Function),
      );

      api.sendPartyMessage('Hello');
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:send_message',
        expect.any(Object),
        undefined,
      );

      api.getPartyMessages(vi.fn());
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:get_messages',
        expect.any(Object),
        expect.any(Function),
      );

      api.emitTypingStart();
      expect(mockSocket.emit).toHaveBeenCalledWith('party:typing_start');

      api.emitTypingStop();
      expect(mockSocket.emit).toHaveBeenCalledWith('party:typing_stop');

      api.emitPartyInteraction({
        type: 'emoji',
        value: 'smile',
        userId: 'u1',
        timestamp: 0,
      } as InteractionPayload);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:interaction',
        expect.any(Object),
        undefined,
      );

      api.requestJoinPartyRoom(
        { roomId: 'ABC', name: 'G' } as PartyJoinRequestPayload,
        vi.fn(),
      );
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:join_request',
        expect.any(Object),
        expect.any(Function),
      );

      api.approveJoinRequest('u1', vi.fn());
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:approve_request',
        expect.any(Object),
        expect.any(Function),
      );

      api.rejectJoinRequest('u1', vi.fn());
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:reject_request',
        expect.any(Object),
        expect.any(Function),
      );

      api.kickMember('u1', vi.fn());
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:kick_member',
        expect.any(Object),
        expect.any(Function),
      );

      api.leavePartyRoom(vi.fn());
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:leave',
        expect.any(Function),
      );

      api.syncPartyState({
        isPlaying: true,
        currentTime: 0,
      } as PartySyncPayload);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:sync',
        expect.any(Object),
        undefined,
      );

      api.requestPartyState(vi.fn());
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:request_state',
        expect.any(Object),
        expect.any(Function),
      );

      api.getPartyRoom('ABC', vi.fn());
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:get_room',
        expect.any(Object),
        expect.any(Function),
      );

      api.updatePartyContent({ title: 'T', type: 'movie' }, vi.fn());
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:update_content',
        expect.any(Object),
        expect.any(Function),
      );

      api.getPartyStreamToken(vi.fn());
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:get_stream_token',
        expect.any(Object),
        expect.any(Function),
      );

      api.fetchPendingRequests('ABC', vi.fn());
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:fetch_pending',
        expect.any(Object),
        expect.any(Function),
      );

      api.updatePartyPermissions({ canGuestsDraw: true });
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:update_permissions',
        expect.any(Object),
        undefined,
      );

      api.updateMemberPermissions('u1', { canDraw: true });
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:update_member_permissions',
        expect.any(Object),
        undefined,
      );

      api.emitSketchDraw({
        id: '1',
        type: 'line',
        color: 'r',
        strokeWidth: 1,
        videoTimestamp: 0,
        data: [],
      });
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'sketch:draw',
        expect.any(Object),
        undefined,
      );

      api.emitSketchClear({ type: 'all' });
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'sketch:clear',
        expect.any(Object),
        undefined,
      );

      api.emitSketchRequestSync();
      expect(mockSocket.emit).toHaveBeenCalledWith('sketch:request_sync');

      api.emitSketchSyncState('u1', []);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'sketch:sync_state',
        expect.any(Object),
      );

      api.emitSketchUndo({ actionId: '1' });
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'sketch:undo',
        expect.any(Object),
        undefined,
      );

      api.updatePartyTheme({ theme: 'dark', customColor: 'r' });
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:update_theme',
        expect.any(Object),
        undefined,
      );
    });
  });

  describe('Socket Listeners', () => {
    const mockSocket = { on: vi.fn(), off: vi.fn(), connected: true };
    beforeEach(() => {
      vi.mocked(getSocket).mockReturnValue(mockSocket as unknown as Socket);
    });

    it('should test all listener functions', () => {
      const cb = vi.fn();

      const listeners = [
        api.onPartyStateUpdate,
        api.onPartyMemberJoined,
        api.onPartyMemberLeft,
        api.onPartyClosed,
        api.onPartyContentUpdated,
        api.onPartyAdminRequest,
        api.onPartyJoinApproved,
        api.onPartyJoinRejected,
        api.onPartyKicked,
        api.onPartyMemberRejected,
        api.onPartyMessage,
        api.onUserTyping,
        api.onPartyHostDisconnected,
        api.onPartyHostReconnected,
        api.onPartyInteraction,
        api.onPartyPermissionsUpdated,
        api.onPartyMemberPermissionsUpdated,
        api.onSketchDraw,
        api.onSketchClear,
        api.onSketchProvideSync,
        api.onSketchSyncState,
        api.onSketchUndo,
        api.onPartyThemeUpdated,
      ];

      for (const listener of listeners) {
        const cleanup = (listener as unknown as (cb: unknown) => () => void)(
          cb,
        );
        expect(mockSocket.on).toHaveBeenCalled();
        cleanup();
        expect(mockSocket.off).toHaveBeenCalled();
      }
    });

    it('should handle null socket in listeners', () => {
      vi.mocked(getSocket).mockReturnValue(null);
      const cleanup = api.onPartyStateUpdate(vi.fn());
      expect(typeof cleanup).toBe('function');
      cleanup();
    });
  });
});
