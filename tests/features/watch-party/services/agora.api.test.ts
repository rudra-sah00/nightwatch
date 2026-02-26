import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getAgoraToken } from '@/features/watch-party/services/agora.api';

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_API_URL: 'http://localhost:3000',
  },
}));

describe('Agora API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should fetch agora token successfully', async () => {
    const mockResponse = {
      token: 'agora-token-123',
      appId: 'app-1',
      channel: 'room-1',
      uid: 123,
    };
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await getAgoraToken({
      channelName: 'room-1',
      guestId: 'user-1',
      guestName: 'Guest',
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('channelName=room-1'),
      expect.any(Object),
    );
    expect(result).toEqual(mockResponse);
  });

  it('should throw error on fetch failure', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal Server Error' }),
    } as Response);

    await expect(
      getAgoraToken({
        channelName: 'room-1',
        guestId: 'user-1',
        guestName: 'Guest',
      }),
    ).rejects.toThrow('Internal Server Error');
  });

  it('should throw error on network error', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));
    await expect(
      getAgoraToken({
        channelName: 'room-1',
        guestId: 'user-1',
        guestName: 'Guest',
      }),
    ).rejects.toThrow('Network error');
  });
});
