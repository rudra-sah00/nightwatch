import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEpisodePanel } from '@/features/watch/player/ui/controls/use-episode-panel';

// Mock the API calls
vi.mock('@/features/search/api', () => ({
  getSeriesEpisodes: vi.fn(),
  getShowDetails: vi.fn(),
}));

// Mock the series cache
vi.mock('@/features/watch/player/hooks/series-cache', () => ({
  getCachedSeriesData: vi.fn(() => null),
  cacheSeriesData: vi.fn(),
}));

import { getSeriesEpisodes, getShowDetails } from '@/features/search/api';
import {
  cacheSeriesData,
  getCachedSeriesData,
} from '@/features/watch/player/hooks/series-cache';

const mockShowDetails = {
  id: 's1',
  title: 'Test Show',
  contentType: 'series' as const,
  seasons: [
    { seasonNumber: 1, seasonId: 'season-1', episodeCount: 3 },
    { seasonNumber: 2, seasonId: 'season-2', episodeCount: 5 },
  ],
  episodes: [],
  posterUrl: '',
  posterHdUrl: '',
};

const mockEpisodes = [
  {
    episodeId: 'ep1',
    seriesId: 's1',
    episodeNumber: 1,
    title: 'Pilot',
    thumbnailUrl: 'https://img.example.com/ep1.jpg',
  },
  {
    episodeId: 'ep2',
    seriesId: 's1',
    episodeNumber: 2,
    title: 'Chapter Two',
    thumbnailUrl: 'https://img.example.com/ep2.jpg',
  },
];

describe('useEpisodePanel', () => {
  const defaultOptions = {
    seriesId: 's1',
    currentSeason: 1,
    currentEpisode: 1,
    isSeriesContent: true,
    onInteraction: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getShowDetails as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockShowDetails,
    );
    (getSeriesEpisodes as ReturnType<typeof vi.fn>).mockResolvedValue({
      episodes: mockEpisodes,
    });
    (getCachedSeriesData as ReturnType<typeof vi.fn>).mockReturnValue(null);
  });

  describe('initial state', () => {
    it('should start closed', () => {
      const { result } = renderHook(() => useEpisodePanel(defaultOptions));

      expect(result.current.isOpen).toBe(false);
      expect(result.current.episodes).toEqual([]);
      expect(result.current.seasons).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it('should set selectedSeason from currentSeason', () => {
      const { result } = renderHook(() =>
        useEpisodePanel({ ...defaultOptions, currentSeason: 3 }),
      );

      expect(result.current.selectedSeason).toBe(3);
    });
  });

  describe('toggle', () => {
    it('should open the panel on toggle', async () => {
      const { result } = renderHook(() => useEpisodePanel(defaultOptions));

      await act(async () => {
        result.current.toggle();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it('should call onInteraction(true) when opening', async () => {
      const onInteraction = vi.fn();
      const { result } = renderHook(() =>
        useEpisodePanel({ ...defaultOptions, onInteraction }),
      );

      await act(async () => {
        result.current.toggle();
      });

      expect(onInteraction).toHaveBeenCalledWith(true);
    });

    it('should close the panel on second toggle', async () => {
      const { result } = renderHook(() => useEpisodePanel(defaultOptions));

      await act(async () => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(true);

      await act(async () => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(false);
    });

    it('should call onInteraction(false) when closing', async () => {
      const onInteraction = vi.fn();
      const { result } = renderHook(() =>
        useEpisodePanel({ ...defaultOptions, onInteraction }),
      );

      await act(async () => {
        result.current.toggle();
      });

      await act(async () => {
        result.current.toggle();
      });

      expect(onInteraction).toHaveBeenLastCalledWith(false);
    });

    it('should fetch show data when opening', async () => {
      const { result } = renderHook(() => useEpisodePanel(defaultOptions));

      await act(async () => {
        result.current.toggle();
      });

      await waitFor(() => {
        expect(getShowDetails).toHaveBeenCalledWith('s1');
        expect(getSeriesEpisodes).toHaveBeenCalledWith('s1', 'season-1');
      });
    });
  });

  describe('close', () => {
    it('should close the panel', async () => {
      const { result } = renderHook(() => useEpisodePanel(defaultOptions));

      await act(async () => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.close();
      });
      expect(result.current.isOpen).toBe(false);
    });

    it('should call onInteraction(false) on close', async () => {
      const onInteraction = vi.fn();
      const { result } = renderHook(() =>
        useEpisodePanel({ ...defaultOptions, onInteraction }),
      );

      await act(async () => {
        result.current.toggle();
      });

      act(() => {
        result.current.close();
      });

      expect(onInteraction).toHaveBeenLastCalledWith(false);
    });
  });

  describe('data fetching', () => {
    it('should populate seasons after fetching', async () => {
      const { result } = renderHook(() => useEpisodePanel(defaultOptions));

      await act(async () => {
        result.current.toggle();
      });

      await waitFor(() => {
        expect(result.current.seasons).toHaveLength(2);
        expect(result.current.seasons[0].seasonNumber).toBe(1);
      });
    });

    it('should populate episodes after fetching', async () => {
      const { result } = renderHook(() => useEpisodePanel(defaultOptions));

      await act(async () => {
        result.current.toggle();
      });

      await waitFor(() => {
        expect(result.current.episodes).toHaveLength(2);
        expect(result.current.episodes[0].title).toBe('Pilot');
      });
    });

    it('should set isLoading while fetching', async () => {
      let resolveShowDetails: (v: unknown) => void;
      (getShowDetails as ReturnType<typeof vi.fn>).mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveShowDetails = resolve;
          }),
      );

      const { result } = renderHook(() => useEpisodePanel(defaultOptions));

      await act(async () => {
        result.current.toggle();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveShowDetails!(mockShowDetails);
      });
    });

    it('should use cached data when available', async () => {
      (getCachedSeriesData as ReturnType<typeof vi.fn>).mockReturnValue({
        showDetails: mockShowDetails,
        loadedSeasons: { 1: mockEpisodes },
      });

      const { result } = renderHook(() => useEpisodePanel(defaultOptions));

      await act(async () => {
        result.current.toggle();
      });

      await waitFor(() => {
        expect(result.current.episodes).toHaveLength(2);
      });

      // Should NOT call the API since we have cache
      expect(getSeriesEpisodes).not.toHaveBeenCalled();
    });

    it('should cache fetched data', async () => {
      const { result } = renderHook(() => useEpisodePanel(defaultOptions));

      await act(async () => {
        result.current.toggle();
      });

      await waitFor(() => {
        expect(cacheSeriesData).toHaveBeenCalledWith(
          's1',
          mockShowDetails,
          1,
          mockEpisodes,
        );
      });
    });

    it('should handle fetch errors gracefully', async () => {
      (getShowDetails as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error'),
      );

      const { result } = renderHook(() => useEpisodePanel(defaultOptions));

      await act(async () => {
        result.current.toggle();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Panel stays open, but episodes is empty
      expect(result.current.isOpen).toBe(true);
      expect(result.current.episodes).toEqual([]);
    });
  });

  describe('season change', () => {
    it('should update selectedSeason', async () => {
      const { result } = renderHook(() => useEpisodePanel(defaultOptions));

      await act(async () => {
        result.current.toggle();
      });

      await waitFor(() => {
        expect(result.current.seasons).toHaveLength(2);
      });

      await act(async () => {
        result.current.onSeasonChange(2);
      });

      expect(result.current.selectedSeason).toBe(2);
    });

    it('should fetch episodes for the new season', async () => {
      const { result } = renderHook(() => useEpisodePanel(defaultOptions));

      await act(async () => {
        result.current.toggle();
      });

      await waitFor(() => {
        expect(result.current.seasons).toHaveLength(2);
      });

      await act(async () => {
        result.current.onSeasonChange(2);
      });

      await waitFor(() => {
        expect(getSeriesEpisodes).toHaveBeenCalledWith('s1', 'season-2');
      });
    });
  });

  describe('non-series content', () => {
    it('should not fetch data for non-series content', async () => {
      const { result } = renderHook(() =>
        useEpisodePanel({ ...defaultOptions, isSeriesContent: false }),
      );

      await act(async () => {
        result.current.toggle();
      });

      expect(getShowDetails).not.toHaveBeenCalled();
    });

    it('should not fetch data without seriesId', async () => {
      const { result } = renderHook(() =>
        useEpisodePanel({
          ...defaultOptions,
          seriesId: undefined,
        }),
      );

      await act(async () => {
        result.current.toggle();
      });

      expect(getShowDetails).not.toHaveBeenCalled();
    });
  });

  describe('keyboard / click outside', () => {
    it('should close on Escape key', async () => {
      const { result } = renderHook(() => useEpisodePanel(defaultOptions));

      await act(async () => {
        result.current.toggle();
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe('sync with props', () => {
    it('should update selectedSeason when currentSeason prop changes', () => {
      const { result, rerender } = renderHook(
        (props) => useEpisodePanel(props),
        { initialProps: { ...defaultOptions, currentSeason: 1 } },
      );

      expect(result.current.selectedSeason).toBe(1);

      rerender({ ...defaultOptions, currentSeason: 3 });

      expect(result.current.selectedSeason).toBe(3);
    });
  });
});
