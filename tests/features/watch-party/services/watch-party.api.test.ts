import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkRoomExists,
  emitPing,
  emitSketchClear,
  emitSketchDraw,
  emitSketchRequestSync,
  emitSketchSyncState,
  getRoomDetails,
  onSketchClear,
  onSketchDraw,
  sendPartyMessage,
  updateMemberPermissions,
  updatePartyPermissions,
} from '@/features/watch-party/room/services/watch-party.api';
import type {
  RoomMember,
  SketchAction,
  WatchPartyRoom,
} from '@/features/watch-party/room/types';

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
    describe('checkRoomExists', () => {
      it('should return exists true with preview for valid room', async () => {
        const mockResponse = {
          exists: true,
          title: 'Test Movie',
          type: 'movie',
          hostName: 'Test Host',
          memberCount: 3,
        };

        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse,
        } as Response);

        const result = await checkRoomExists('ABC123');

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/rooms/ABC123/exists'),
          expect.any(Object),
        );
        expect(result.exists).toBe(true);
        expect(result.preview?.title).toBe('Test Movie');
      });

      it('should handle network errors', async () => {
        vi.mocked(global.fetch).mockRejectedValueOnce(
          new Error('Network error'),
        );
        const result = await checkRoomExists('ABC123');
        expect(result.exists).toBe(false);
        expect(result.reason).toBe('network_error');
      });
    });

    describe('getRoomDetails', () => {
      it('should fetch room details successfully', async () => {
        const mockRoom = { id: 'ABC123', title: 'Test' };
        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => mockRoom,
        } as Response);

        const result = await getRoomDetails('ABC123');
        expect(result).toEqual(mockRoom);
      });
    });
  });

  describe('Socket API functions', () => {
    const mockSocket = {
      emit: vi.fn(),
      connected: true,
    };

    beforeEach(async () => {
      const { getSocket } = await import('@/lib/socket');
      vi.mocked(getSocket).mockReturnValue(
        mockSocket as unknown as ReturnType<typeof getSocket>,
      );
      mockSocket.emit.mockClear();
    });

    it('emitPing should emit party:ping', () => {
      const callback = vi.fn();
      emitPing({ t1: 100 }, callback);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:ping',
        { t1: 100 },
        callback,
      );
    });

    it('emitSketchDraw should emit sketch:draw', () => {
      const action: SketchAction = {
        id: '1',
        type: 'line',
        color: 'red',
        strokeWidth: 2,
        videoTimestamp: 0,
        data: [],
      };
      emitSketchDraw(action);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'sketch:draw',
        action,
        undefined,
      );
    });

    it('emitSketchClear should emit sketch:clear with all type', () => {
      emitSketchClear({ type: 'all' });
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'sketch:clear',
        { type: 'all' },
        undefined,
      );
    });

    it('emitSketchClear should emit sketch:clear with self type', () => {
      emitSketchClear({ type: 'self' });
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'sketch:clear',
        { type: 'self' },
        undefined,
      );
    });

    it('emitSketchRequestSync should emit sketch:request_sync', () => {
      emitSketchRequestSync();
      expect(mockSocket.emit).toHaveBeenCalledWith('sketch:request_sync');
    });

    it('emitSketchSyncState should emit sketch:sync_state', () => {
      const elements = [{ id: '1' }];
      emitSketchSyncState('user-1', elements as unknown as SketchAction[]);
      expect(mockSocket.emit).toHaveBeenCalledWith('sketch:sync_state', {
        requesterId: 'user-1',
        elements,
      });
    });

    it('onSketchProvideSync should register listener', async () => {
      const callback = vi.fn();
      const mockSocketWithOn = {
        ...mockSocket,
        on: vi.fn(),
        off: vi.fn(),
      };
      const { getSocket } = await import('@/lib/socket');
      vi.mocked(getSocket).mockReturnValue(
        mockSocketWithOn as unknown as ReturnType<typeof getSocket>,
      );

      const { onSketchProvideSync } = await import(
        '@/features/watch-party/room/services/watch-party.api'
      );
      const cleanup = onSketchProvideSync(callback);
      expect(mockSocketWithOn.on).toHaveBeenCalledWith(
        'sketch:provide_sync',
        callback,
      );

      cleanup();
      expect(mockSocketWithOn.off).toHaveBeenCalledWith(
        'sketch:provide_sync',
        callback,
      );
    });

    it('onSketchSyncState should register listener', async () => {
      const callback = vi.fn();
      const mockSocketWithOn = {
        ...mockSocket,
        on: vi.fn(),
        off: vi.fn(),
      };
      const { getSocket } = await import('@/lib/socket');
      vi.mocked(getSocket).mockReturnValue(
        mockSocketWithOn as unknown as ReturnType<typeof getSocket>,
      );

      const { onSketchSyncState } = await import(
        '@/features/watch-party/room/services/watch-party.api'
      );
      const cleanup = onSketchSyncState(callback);
      expect(mockSocketWithOn.on).toHaveBeenCalledWith(
        'sketch:sync_state',
        callback,
      );

      cleanup();
      expect(mockSocketWithOn.off).toHaveBeenCalledWith(
        'sketch:sync_state',
        callback,
      );
    });

    it('updatePartyPermissions should emit party:update_permissions', () => {
      const perms: Partial<WatchPartyRoom['permissions']> = {
        canGuestsDraw: true,
      };
      updatePartyPermissions(perms);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:update_permissions',
        { permissions: perms },
        undefined,
      );
    });

    it('updateMemberPermissions should emit party:update_member_permissions', () => {
      const perms: Partial<NonNullable<RoomMember['permissions']>> = {
        canDraw: true,
      };
      updateMemberPermissions('user-2', perms);
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'party:update_member_permissions',
        { memberId: 'user-2', permissions: perms },
        undefined,
      );
    });

    it('should return error if socket not connected', async () => {
      const { getSocket } = await import('@/lib/socket');
      vi.mocked(getSocket).mockReturnValue(null);
      const callback = vi.fn();
      sendPartyMessage('test', callback);
      expect(callback).toHaveBeenCalledWith({
        success: false,
        error: 'Not connected',
      });
    });

    it('onSketchDraw should return no-op cleanup when socket is null', async () => {
      const { getSocket } = await import('@/lib/socket');
      vi.mocked(getSocket).mockReturnValue(null);
      const callback = vi.fn();
      const cleanup = onSketchDraw(callback);
      // Should return a cleanup function that does nothing
      expect(typeof cleanup).toBe('function');
      cleanup(); // Should not throw
    });

    it('onSketchDraw should register and unregister listener when socket exists', async () => {
      const callback = vi.fn();
      const mockSocketWithOn = {
        ...mockSocket,
        on: vi.fn(),
        off: vi.fn(),
      };
      const { getSocket } = await import('@/lib/socket');
      vi.mocked(getSocket).mockReturnValue(
        mockSocketWithOn as unknown as ReturnType<typeof getSocket>,
      );
      const cleanup = onSketchDraw(callback);
      expect(mockSocketWithOn.on).toHaveBeenCalledWith('sketch:draw', callback);
      cleanup();
      expect(mockSocketWithOn.off).toHaveBeenCalledWith(
        'sketch:draw',
        callback,
      );
    });

    it('onSketchClear should return no-op cleanup when socket is null', async () => {
      const { getSocket } = await import('@/lib/socket');
      vi.mocked(getSocket).mockReturnValue(null);
      const callback = vi.fn();
      const cleanup = onSketchClear(callback);
      expect(typeof cleanup).toBe('function');
      cleanup(); // Should not throw
    });

    it('onSketchClear should register and unregister listener when socket exists', async () => {
      const callback = vi.fn();
      const mockSocketWithOn = {
        ...mockSocket,
        on: vi.fn(),
        off: vi.fn(),
      };
      const { getSocket } = await import('@/lib/socket');
      vi.mocked(getSocket).mockReturnValue(
        mockSocketWithOn as unknown as ReturnType<typeof getSocket>,
      );
      const cleanup = onSketchClear(callback);
      expect(mockSocketWithOn.on).toHaveBeenCalledWith(
        'sketch:clear',
        callback,
      );
      cleanup();
      expect(mockSocketWithOn.off).toHaveBeenCalledWith(
        'sketch:clear',
        callback,
      );
    });
  });
});
