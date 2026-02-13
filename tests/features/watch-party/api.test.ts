import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkRoomExists, getRoomDetails } from '@/features/watch-party/api';

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
        'http://localhost:4000/api/rooms/ABC123/exists',
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

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:4000/api/rooms/ABC123',
        {
          credentials: 'include',
        },
      );
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

    it('should send credentials with request', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      await getRoomDetails('ABC123');

      const fetchCall = vi.mocked(global.fetch).mock.calls[0];
      expect(fetchCall[1]).toEqual({ credentials: 'include' });
    });
  });
});
