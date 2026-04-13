import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchSports } from '../../../../src/features/livestream/api';
import { useSports } from '../../../../src/features/livestream/hooks/use-sports';

vi.mock('../../../../src/features/livestream/api', () => ({
  fetchSports: vi.fn(),
}));

describe('useSports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initially show loading and fallback sports', async () => {
    vi.mocked(fetchSports).mockImplementation(() => new Promise(() => {})); // pending forever
    const { result } = renderHook(() => useSports());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.sports).toEqual([
      { id: 'all_channels', label: 'All Channels' },
    ]);
  });

  it('should fetch and prepend All Channels onto result', async () => {
    const mockData = [{ id: 'soccer', label: 'Soccer' }];
    vi.mocked(fetchSports).mockResolvedValue(mockData);

    const { result } = renderHook(() => useSports());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sports).toEqual([
      { id: 'all_channels', label: 'All Channels' },
      { id: 'soccer', label: 'Soccer' },
    ]);
    expect(fetchSports).toHaveBeenCalledTimes(1);
  });

  it('should catch errors and keep fallback sports', async () => {
    vi.mocked(fetchSports).mockRejectedValue(new Error('Network error'));

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useSports());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.sports).toEqual([
      { id: 'all_channels', label: 'All Channels' },
    ]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
