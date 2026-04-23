import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCallToken } from '@/features/friends/call/call.service';
import { apiFetch } from '@/lib/fetch';

vi.mock('@/lib/fetch', () => import('../__mocks__/lib-fetch'));

describe('call.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchCallToken', () => {
    it('calls the correct endpoint with encoded channel name', async () => {
      const mockResponse = { token: 'tok123', appId: 'app1', uid: 42 };
      vi.mocked(apiFetch).mockResolvedValueOnce(mockResponse);

      const result = await fetchCallToken('dm-abc-def');

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/agora/call-token?channelName=dm-abc-def',
      );
      expect(result).toEqual(mockResponse);
    });

    it('encodes special characters in channel name', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({
        token: 't',
        appId: 'a',
        uid: 1,
      });

      await fetchCallToken('dm channel+test');

      expect(apiFetch).toHaveBeenCalledWith(
        '/api/agora/call-token?channelName=dm%20channel%2Btest',
      );
    });

    it('propagates errors from apiFetch', async () => {
      vi.mocked(apiFetch).mockRejectedValueOnce(new Error('403 Forbidden'));

      await expect(fetchCallToken('dm-test')).rejects.toThrow('403 Forbidden');
    });
  });
});
