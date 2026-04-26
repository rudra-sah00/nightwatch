import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useClips } from '@/features/clips/hooks/use-clips';

const mockGetClips = vi.fn();
const mockDeleteClip = vi.fn();
const mockRenameClip = vi.fn();

vi.mock('@/features/clips/api', () => ({
  getClips: (...args: unknown[]) => mockGetClips(...args),
  deleteClip: (...args: unknown[]) => mockDeleteClip(...args),
  renameClip: (...args: unknown[]) => mockRenameClip(...args),
}));

describe('useClips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClips.mockResolvedValue({
      clips: [
        {
          id: 'c1',
          title: 'Clip 1',
          status: 'ready',
          duration: 60,
          createdAt: '2026-01-01',
        },
        {
          id: 'c2',
          title: 'Clip 2',
          status: 'processing',
          duration: 0,
          createdAt: '2026-01-02',
        },
      ],
      total: 2,
      page: 1,
      totalPages: 1,
    });
  });

  it('fetches clips on mount', async () => {
    const { result } = renderHook(() => useClips());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.clips).toHaveLength(2);
    expect(mockGetClips).toHaveBeenCalledWith(1, 12, undefined);
  });

  it('removes a clip optimistically', async () => {
    mockDeleteClip.mockResolvedValue(undefined);
    const { result } = renderHook(() => useClips());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.remove('c1');
    });

    expect(result.current.clips).toHaveLength(1);
    expect(result.current.clips[0].id).toBe('c2');
  });

  it('renames a clip', async () => {
    mockRenameClip.mockResolvedValue(undefined);
    const { result } = renderHook(() => useClips());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.rename('c1', 'Renamed');
    });

    expect(result.current.clips[0].title).toBe('Renamed');
  });

  it('loads more clips', async () => {
    mockGetClips.mockResolvedValueOnce({
      clips: [
        {
          id: 'c1',
          title: 'Clip 1',
          status: 'ready',
          duration: 60,
          createdAt: '2026-01-01',
        },
      ],
      total: 2,
      page: 1,
      totalPages: 2,
    });
    const { result } = renderHook(() => useClips());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasMore).toBe(true);

    mockGetClips.mockResolvedValueOnce({
      clips: [
        {
          id: 'c2',
          title: 'Clip 2',
          status: 'ready',
          duration: 30,
          createdAt: '2026-01-02',
        },
      ],
      total: 2,
      page: 2,
      totalPages: 2,
    });

    await act(async () => {
      result.current.loadMore();
    });
    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));

    expect(result.current.clips).toHaveLength(2);
    expect(result.current.hasMore).toBe(false);
  });

  it('passes filters to API', async () => {
    const filters = { search: 'test', sort: 'longest' as const };
    renderHook(() => useClips(filters));
    await waitFor(() =>
      expect(mockGetClips).toHaveBeenCalledWith(1, 12, filters),
    );
  });

  it('handles fetch error gracefully', async () => {
    mockGetClips.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useClips());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.clips).toEqual([]);
  });

  it('handles delete error gracefully', async () => {
    mockDeleteClip.mockRejectedValueOnce(new Error('Server error'));
    const { result } = renderHook(() => useClips());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await result.current.remove('c1');
    });
    expect(result.current.clips).toHaveLength(2);
  });

  it('refetches clips', async () => {
    const { result } = renderHook(() => useClips());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetClips).toHaveBeenCalledTimes(1);

    await act(async () => {
      result.current.refetch();
    });
    await waitFor(() => expect(mockGetClips).toHaveBeenCalledTimes(2));
  });
});
