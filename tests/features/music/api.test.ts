import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/fetch', () => ({ apiFetch: vi.fn() }));

import {
  getArtistAlbums,
  getLyrics,
  getRadioStations,
  getTopPodcasts,
} from '@/features/music/api';
import { apiFetch } from '@/lib/fetch';

const mockApiFetch = vi.mocked(apiFetch);

describe('Music API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTopPodcasts', () => {
    it('should fetch from /api/music/podcasts', async () => {
      const mockData = [{ id: 'p1', title: 'Pod', image: 'img' }];
      mockApiFetch.mockResolvedValueOnce(mockData);

      const result = await getTopPodcasts();

      expect(mockApiFetch).toHaveBeenCalledWith('/api/music/podcasts');
      expect(result).toEqual(mockData);
    });
  });

  describe('getRadioStations', () => {
    it('should fetch without language param', async () => {
      const mockData = [
        { id: 'r1', title: 'Station', image: 'img', language: 'en' },
      ];
      mockApiFetch.mockResolvedValueOnce(mockData);

      const result = await getRadioStations();

      expect(mockApiFetch).toHaveBeenCalledWith('/api/music/radio');
      expect(result).toEqual(mockData);
    });

    it('should append language query param when provided', async () => {
      mockApiFetch.mockResolvedValueOnce([]);

      await getRadioStations('hindi');

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/music/radio?language=hindi',
      );
    });

    it('should encode special characters in language param', async () => {
      mockApiFetch.mockResolvedValueOnce([]);

      await getRadioStations('hip hop');

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/music/radio?language=hip%20hop',
      );
    });
  });

  describe('getArtistAlbums', () => {
    it('should fetch with default page 1', async () => {
      mockApiFetch.mockResolvedValueOnce([]);

      await getArtistAlbums('a1');

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/music/artist/a1/albums?page=1',
      );
    });

    it('should fetch with specified page', async () => {
      mockApiFetch.mockResolvedValueOnce([]);

      await getArtistAlbums('a1', 3);

      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/music/artist/a1/albums?page=3',
      );
    });
  });

  describe('getLyrics', () => {
    it('should fetch lyrics by songId', async () => {
      const mockLyrics = {
        lyrics: 'La la la',
        synced: false,
        copyright: '© 2026',
      };
      mockApiFetch.mockResolvedValueOnce(mockLyrics);

      const result = await getLyrics('s1');

      expect(mockApiFetch).toHaveBeenCalledWith('/api/music/lyrics/s1');
      expect(result).toEqual(mockLyrics);
    });
  });
});
