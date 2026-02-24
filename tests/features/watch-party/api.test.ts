import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkRoomExists,
  createPartyRoom,
  emitPartyEvent,
  emitPing,
  emitTypingStart,
  emitTypingStop,
  getRoomDetails,
  getTrendingSounds,
  requestJoinPartyRoom,
  searchSounds,
  sendPartyMessage,
  syncPartyState,
} from '@/features/watch-party/api';
import type {
  PartyCreatePayload,
  PartyEvent,
  PartySyncPayload,
} from '@/features/watch-party/types';

vi.mock('@/lib/env', () => import('./__mocks__/lib-env'));
vi.mock('@/lib/socket', () => import('./__mocks__/lib-socket'));

describe('Watch Party API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

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
        expect.objectContaining({ credentials: 'include' }),
      );
      expect(result.exists).toBe(true);
      expect(result.preview).toBeDefined();
      expect(result.preview?.title).toBe('Test Movie');
      expect(result.preview?.hostName).toBe('Test Host');
    });

    it('should return exists false for non-existent room', async () => {
      const mockResponse = {
        exists: false,
        reason: 'not_found',
        message: 'Room not found',
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await checkRoomExists('INVALID');

      expect(result.exists).toBe(false);
      expect(result.reason).toBe('not_found');
      expect(result.message).toBe('Room not found');
    });

    it('should handle network errors', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await checkRoomExists('ABC123');

      expect(result.exists).toBe(false);
      expect(result.reason).toBe('network_error');
      expect(result.message).toContain('Unable to check room status');
    });

    it('should handle rooms with many members', async () => {
      const mockResponse = {
        exists: true,
        title: 'Big Room',
        type: 'series',
        season: 1,
        episode: 5,
        hostName: 'Host',
        memberCount: 50,
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await checkRoomExists('BIG123');

      expect(result.exists).toBe(true);
      expect(result.preview?.memberCount).toBe(50);
    });

    it('should convert room ID to uppercase in preview', async () => {
      const mockResponse = {
        exists: true,
        title: 'Test',
        type: 'movie',
        hostName: 'Host',
        memberCount: 1,
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await checkRoomExists('abc123');

      expect(result.preview?.id).toBe('ABC123');
    });

    it('should handle series with season and episode', async () => {
      const mockResponse = {
        exists: true,
        title: 'Test Series',
        type: 'series',
        season: 2,
        episode: 8,
        hostName: 'Host',
        memberCount: 5,
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await checkRoomExists('SER123');

      expect(result.preview?.type).toBe('series');
      expect(result.preview?.season).toBe(2);
      expect(result.preview?.episode).toBe(8);
    });

    it('should return memberCount from response', async () => {
      const mockResponse = {
        exists: true,
        title: 'Test',
        type: 'movie',
        hostName: 'Host',
        memberCount: 3,
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await checkRoomExists('TEST123');

      expect(result.preview?.memberCount).toBe(3);
    });
  });

  describe('getRoomDetails', () => {
    it('should fetch room details successfully', async () => {
      const mockRoom = {
        id: 'ABC123',
        title: 'Test Movie',
        hostId: 'user123',
        members: [],
        createdAt: '2024-01-01',
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRoom,
      } as Response);

      const result = await getRoomDetails('ABC123');

      expect(result).toEqual(mockRoom);
    });

    it('should return null for non-existent room', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const result = await getRoomDetails('INVALID');

      expect(result).toBeNull();
    });

    it('should return null on error response', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await getRoomDetails('ABC123');

      expect(result).toBeNull();
    });
  });
});

interface MockSocket {
  emit: ReturnType<typeof vi.fn>;
  connected: boolean;
}

describe('Socket.IO Functions', () => {
  const mockSocket: MockSocket = {
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

  it('emitPing should handle connected and disconnected states', async () => {
    const { getSocket } = await import('@/lib/socket');
    const callback = vi.fn();

    // Disconnected
    vi.mocked(getSocket).mockReturnValue(null);
    emitPing({ t1: 100 }, callback);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Not connected' }),
    );

    // Connected
    vi.mocked(getSocket).mockReturnValue(
      mockSocket as unknown as ReturnType<typeof getSocket>,
    );
    emitPing({ t1: 100 }, callback);
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'party:ping',
      { t1: 100 },
      callback,
    );
  });

  it('emitPartyEvent should handle connected and disconnected states', async () => {
    const { getSocket } = await import('@/lib/socket');
    const callback = vi.fn();
    const payload: PartyEvent = { eventType: 'play', videoTime: 10 };

    vi.mocked(getSocket).mockReturnValue(null);
    emitPartyEvent(payload, callback);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Not connected' }),
    );

    vi.mocked(getSocket).mockReturnValue(
      mockSocket as unknown as ReturnType<typeof getSocket>,
    );
    emitPartyEvent(payload, callback);
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'party:event',
      payload,
      callback,
    );
  });

  it('createPartyRoom should handle connected and disconnected states', async () => {
    const { getSocket } = await import('@/lib/socket');
    const callback = vi.fn();
    const payload: PartyCreatePayload = {
      contentId: '123',
      title: 'Test',
      type: 'movie',
      streamUrl: 'http://test.com',
    };

    vi.mocked(getSocket).mockReturnValue(null);
    createPartyRoom(payload, callback);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Not connected' }),
    );

    vi.mocked(getSocket).mockReturnValue(
      mockSocket as unknown as ReturnType<typeof getSocket>,
    );
    createPartyRoom(payload, callback);
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'party:create',
      payload,
      callback,
    );
  });

  it('sendPartyMessage should handle connected and disconnected states', async () => {
    const { getSocket } = await import('@/lib/socket');
    const callback = vi.fn();

    vi.mocked(getSocket).mockReturnValue(null);
    sendPartyMessage('hello', callback);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Not connected' }),
    );

    vi.mocked(getSocket).mockReturnValue(
      mockSocket as unknown as ReturnType<typeof getSocket>,
    );
    sendPartyMessage('hello', callback);
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'party:send_message',
      { content: 'hello' },
      callback,
    );
  });

  it('emitTypingStart/Stop should handle disconnected state silently', async () => {
    const { getSocket } = await import('@/lib/socket');

    vi.mocked(getSocket).mockReturnValue(null);
    emitTypingStart();
    emitTypingStop();
    expect(mockSocket.emit).not.toHaveBeenCalled();

    vi.mocked(getSocket).mockReturnValue(
      mockSocket as unknown as ReturnType<typeof getSocket>,
    );
    emitTypingStart();
    expect(mockSocket.emit).toHaveBeenCalledWith('party:typing_start');
    emitTypingStop();
    expect(mockSocket.emit).toHaveBeenCalledWith('party:typing_stop');
  });

  it('requestJoinPartyRoom should handle connected and disconnected states', async () => {
    const { getSocket } = await import('@/lib/socket');
    const callback = vi.fn();
    const payload = { roomId: 'ABC', name: 'Guest' };

    vi.mocked(getSocket).mockReturnValue(null);
    requestJoinPartyRoom(payload, callback);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Not connected' }),
    );

    vi.mocked(getSocket).mockReturnValue(
      mockSocket as unknown as ReturnType<typeof getSocket>,
    );
    requestJoinPartyRoom(payload, callback);
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'party:join_request',
      payload,
      callback,
    );
  });

  it('syncPartyState should handle connected and disconnected states', async () => {
    const { getSocket } = await import('@/lib/socket');
    const callback = vi.fn();
    const payload: PartySyncPayload = { currentTime: 10, isPlaying: true };

    vi.mocked(getSocket).mockReturnValue(null);
    syncPartyState(payload, callback);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Not connected' }),
    );

    vi.mocked(getSocket).mockReturnValue(
      mockSocket as unknown as ReturnType<typeof getSocket>,
    );
    syncPartyState(payload, callback);
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'party:sync',
      payload,
      callback,
    );
  });
});

describe('Soundboard API', () => {
  it('getTrendingSounds should fetch sounds', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response);

    await getTrendingSounds(2);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/soundboard?page=2'),
      expect.any(Object),
    );
  });

  it('searchSounds should fetch sounds with query', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [] }),
    } as Response);

    await searchSounds('test query', 3);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/soundboard/search?q=test%20query&page=3'),
      expect.any(Object),
    );
  });
});
