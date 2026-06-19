import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteClip, getClips, renameClip } from '@/features/clips/api';
import { apiFetch } from '@/lib/fetch';

vi.mock('@/lib/fetch', () => import('./__mocks__/lib-fetch'));

describe('Clips API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getClips', () => {
    it('fetches with default pagination', async () => {
      const data = { clips: [], total: 0, page: 1, totalPages: 0 };
      vi.mocked(apiFetch).mockResolvedValueOnce(data);
      const result = await getClips();
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/clips?page=1&limit=12',
        undefined,
      );
      expect(result).toEqual(data);
    });

    it('fetches with custom pagination', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({
        clips: [],
        total: 0,
        page: 2,
        totalPages: 1,
      });
      await getClips(2, 10);
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/clips?page=2&limit=10',
        undefined,
      );
    });

    it('passes search filter', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({
        clips: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });
      await getClips(1, 12, { search: 'goal' });
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/clips?page=1&limit=12&search=goal',
        undefined,
      );
    });

    it('passes sort filter', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({
        clips: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });
      await getClips(1, 12, { sort: 'longest' });
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/clips?page=1&limit=12&sort=longest',
        undefined,
      );
    });

    it('passes date filters', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({
        clips: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });
      await getClips(1, 12, { dateFrom: '2026-01-01', dateTo: '2026-04-26' });
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/clips?page=1&limit=12&dateFrom=2026-01-01&dateTo=2026-04-26',
        undefined,
      );
    });

    it('passes all filters combined', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({
        clips: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });
      await getClips(1, 12, {
        search: 'test',
        sort: 'oldest',
        dateFrom: '2026-01-01',
      });
      expect(apiFetch).toHaveBeenCalledWith(
        '/api/clips?page=1&limit=12&search=test&sort=oldest&dateFrom=2026-01-01',
        undefined,
      );
    });

    it('passes request options', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce({
        clips: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });
      const signal = new AbortController().signal;
      await getClips(1, 12, undefined, { signal });
      expect(apiFetch).toHaveBeenCalledWith('/api/clips?page=1&limit=12', {
        signal,
      });
    });
  });

  describe('deleteClip', () => {
    it('sends DELETE', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(undefined);
      await deleteClip('c1');
      expect(apiFetch).toHaveBeenCalledWith('/api/clips/c1', {
        method: 'DELETE',
      });
    });
  });

  describe('renameClip', () => {
    it('sends PATCH with new title', async () => {
      vi.mocked(apiFetch).mockResolvedValueOnce(undefined);
      await renameClip('c1', 'New Title');
      expect(apiFetch).toHaveBeenCalledWith('/api/clips/c1', {
        method: 'PATCH',
        body: JSON.stringify({ title: 'New Title' }),
      });
    });
  });
});
