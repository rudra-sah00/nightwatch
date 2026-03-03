import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DownloadMenu } from '@/features/search/components/download-menu';
import {
  ContentType,
  type Episode,
  type ShowDetails,
} from '@/features/search/types';
import { apiFetch } from '@/lib/fetch';

vi.mock('@/lib/fetch', () => import('./__mocks__/lib-fetch'));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const s2MovieShow: ShowDetails = {
  id: 's2:tt123::movie',
  title: 'Inception',
  contentType: ContentType.Movie,
  posterUrl: '',
  posterHdUrl: '',
  seasons: [],
  episodes: [],
};

const nonS2Show: ShowDetails = {
  id: 'tt9998887',
  title: 'Some Show',
  contentType: ContentType.Movie,
  posterUrl: '',
  posterHdUrl: '',
  seasons: [],
  episodes: [],
};

const s2SeriesShow: ShowDetails = {
  id: 's2:tt456::series',
  title: 'Breaking Bad',
  contentType: ContentType.Series,
  posterUrl: '',
  posterHdUrl: '',
  seasons: [],
  episodes: [],
};

const mockEpisodes: Episode[] = [
  {
    episodeId: 'ep1',
    seriesId: 's2:tt456::series',
    episodeNumber: 1,
    seasonNumber: 1,
    title: 'Pilot',
    thumbnailUrl: '',
  },
  {
    episodeId: 'ep2',
    seriesId: 's2:tt456::series',
    episodeNumber: 2,
    seasonNumber: 1,
    title: "Cat's in the Bag",
    thumbnailUrl: '',
  },
];

const mockQualities = [
  { quality: '1080p', url: 'http://localhost:8787/abc/url1080?dl=1' },
  { quality: '720p', url: 'http://localhost:8787/abc/url720?dl=1' },
  { quality: '480p', url: 'http://localhost:8787/abc/url480?dl=1' },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('DownloadMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('visibility', () => {
    it('renders nothing for non-S2 content', () => {
      const { container } = render(<DownloadMenu show={nonS2Show} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders a Download button for S2 movie content', () => {
      vi.mocked(apiFetch).mockResolvedValue({ success: true, qualities: [] });
      render(<DownloadMenu show={s2MovieShow} />);
      expect(
        screen.getByRole('button', { name: /download/i }),
      ).toBeInTheDocument();
    });

    it('renders a Download button for S2 series content', () => {
      render(
        <DownloadMenu
          show={s2SeriesShow}
          selectedSeason={{ seasonNumber: 1, seasonId: 's1', episodeCount: 2 }}
          episodes={mockEpisodes}
        />,
      );
      expect(
        screen.getByRole('button', { name: /download/i }),
      ).toBeInTheDocument();
    });
  });

  describe('movie download section', () => {
    it('opens dialog and calls API to fetch qualities for movie', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        success: true,
        qualities: mockQualities,
      });

      render(<DownloadMenu show={s2MovieShow} />);
      await userEvent.click(screen.getByRole('button', { name: /download/i }));

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/video/download-links'),
      );

      await waitFor(() => {
        expect(screen.getByText('1080p')).toBeInTheDocument();
        expect(screen.getByText('720p')).toBeInTheDocument();
        expect(screen.getByText('480p')).toBeInTheDocument();
      });
    });

    it('quality anchors have download and no-referrer attributes', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        success: true,
        qualities: mockQualities,
      });

      render(<DownloadMenu show={s2MovieShow} />);
      await userEvent.click(screen.getByRole('button', { name: /download/i }));

      await waitFor(() => {
        screen.getByText('1080p');
      });

      const anchors = screen.getAllByRole('link');
      for (const anchor of anchors) {
        expect(anchor).toHaveAttribute('download');
        expect(anchor).toHaveAttribute('referrerpolicy', 'no-referrer');
      }
    });

    it('quality URLs include ?dl=1 from CF Worker', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        success: true,
        qualities: mockQualities,
      });

      render(<DownloadMenu show={s2MovieShow} />);
      await userEvent.click(screen.getByRole('button', { name: /download/i }));

      await waitFor(() => screen.getByText('1080p'));

      const anchor1080 = screen
        .getAllByRole('link')
        .find((a) => a.textContent?.includes('1080p'));
      expect(anchor1080).toHaveAttribute(
        'href',
        expect.stringContaining('?dl=1'),
      );
    });

    it('shows "No download links available" when API returns empty qualities', async () => {
      vi.mocked(apiFetch).mockResolvedValue({ success: true, qualities: [] });

      render(<DownloadMenu show={s2MovieShow} />);
      await userEvent.click(screen.getByRole('button', { name: /download/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/no download links available/i),
        ).toBeInTheDocument();
      });
    });

    it('shows "No download links available" when API call fails', async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'));

      render(<DownloadMenu show={s2MovieShow} />);
      await userEvent.click(screen.getByRole('button', { name: /download/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/no download links available/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('series download section', () => {
    it('shows episode list without any ZIP/bulk section', async () => {
      render(
        <DownloadMenu
          show={s2SeriesShow}
          selectedSeason={{ seasonNumber: 1, seasonId: 's1', episodeCount: 2 }}
          episodes={mockEpisodes}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: /download/i }));

      await waitFor(() => {
        expect(screen.getByText('Pilot')).toBeInTheDocument();
        expect(screen.getByText("Cat's in the Bag")).toBeInTheDocument();
      });

      // No ZIP-related text should appear
      expect(screen.queryByText(/zip/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/download full season/i),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/packaged into a single/i),
      ).not.toBeInTheDocument();
    });

    it('shows "No episodes found" when season has no episodes', async () => {
      render(
        <DownloadMenu
          show={s2SeriesShow}
          selectedSeason={{
            seasonNumber: 99,
            seasonId: 's99',
            episodeCount: 0,
          }}
          episodes={mockEpisodes}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: /download/i }));

      await waitFor(() => {
        expect(screen.getByText(/no episodes found/i)).toBeInTheDocument();
      });
    });

    it('expands episode row and fetches qualities on click', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        success: true,
        qualities: mockQualities,
      });

      render(
        <DownloadMenu
          show={s2SeriesShow}
          selectedSeason={{ seasonNumber: 1, seasonId: 's1', episodeCount: 2 }}
          episodes={[mockEpisodes[0]]}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: /download/i }));

      // Wait for episode row to appear
      await waitFor(() => screen.getByText('Pilot'));

      // Click the episode row to expand
      await userEvent.click(screen.getByText('Pilot'));

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/video/download-links'),
      );

      await waitFor(() => {
        expect(screen.getByText('1080p')).toBeInTheDocument();
        expect(screen.getByText('720p')).toBeInTheDocument();
      });
    });

    it('episode quality anchors have download and no-referrer attributes', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        success: true,
        qualities: mockQualities,
      });

      render(
        <DownloadMenu
          show={s2SeriesShow}
          selectedSeason={{ seasonNumber: 1, seasonId: 's1', episodeCount: 2 }}
          episodes={[mockEpisodes[0]]}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: /download/i }));
      await waitFor(() => screen.getByText('Pilot'));
      await userEvent.click(screen.getByText('Pilot'));

      await waitFor(() => screen.getByText('1080p'));

      const anchors = screen.getAllByRole('link');
      for (const anchor of anchors) {
        expect(anchor).toHaveAttribute('download');
        expect(anchor).toHaveAttribute('referrerpolicy', 'no-referrer');
      }
    });

    it('includes season and episode params in API call for episode', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        success: true,
        qualities: mockQualities,
      });

      render(
        <DownloadMenu
          show={s2SeriesShow}
          selectedSeason={{ seasonNumber: 1, seasonId: 's1', episodeCount: 2 }}
          episodes={[mockEpisodes[0]]}
        />,
      );
      await userEvent.click(screen.getByRole('button', { name: /download/i }));
      await waitFor(() => screen.getByText('Pilot'));
      await userEvent.click(screen.getByText('Pilot'));

      await waitFor(() => {
        expect(vi.mocked(apiFetch).mock.calls[0][0]).toContain('season=1');
        expect(vi.mocked(apiFetch).mock.calls[0][0]).toContain('episode=1');
      });
    });
  });
});
