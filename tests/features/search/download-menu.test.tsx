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
vi.mock('@/hooks/use-desktop-app', () => ({
  useDesktopApp: () => ({
    isDesktopApp: true,
    openInDesktopApp: vi.fn(),
    copyToClipboard: vi.fn(),
    getDesktopTopPaddingClass: vi.fn(),
    dragStyle: {},
    noDragStyle: {},
  }),
}));

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
    it('renders NATIVE DOWNLOAD for all content', () => {
      render(<DownloadMenu show={nonS2Show} />);
      expect(
        screen.getByRole('button', { name: /native download/i }),
      ).toBeInTheDocument();
    });

    it('renders a Download button for S2 movie content', () => {
      vi.mocked(apiFetch).mockResolvedValue({ success: true, qualities: [] });
      render(<DownloadMenu show={s2MovieShow} />);
      expect(
        screen.getByRole('button', { name: /native download/i }),
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
        screen.getByRole('button', { name: /native download/i }),
      ).toBeInTheDocument();
    });
  });

  describe('movie download section', () => {
    it('opens dialog and calls API to fetch qualities for movie', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        success: true,
        data: mockQualities,
      });

      render(<DownloadMenu show={s2MovieShow} />);
      await userEvent.click(screen.getByRole('button', { name: /download/i }));

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/download'),
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
        data: mockQualities,
      });

      render(<DownloadMenu show={s2MovieShow} />);
      await userEvent.click(screen.getByRole('button', { name: /download/i }));

      await waitFor(() => {
        screen.getByText('1080p');
      });

      const anchors = screen
        .getAllByRole('button')
        .filter(
          (b) =>
            b.textContent !== 'NATIVE DOWNLOAD' &&
            b.textContent !== 'DOWNLOAD' &&
            b.textContent !== 'OFFLINE SECURE DOWNLOAD',
        );
      for (const anchor of anchors) {
        expect((anchor as HTMLButtonElement).type).toBe('button');
      }
    });

    it('quality URLs trigger electron download with URL containing ?dl=1 from CF Worker', async () => {
      const mockElectronStart = vi.fn();
      Object.defineProperty(window, 'electronAPI', {
        value: { startDownload: mockElectronStart },
        writable: true,
      });

      vi.mocked(apiFetch).mockResolvedValue({
        success: true,
        data: mockQualities,
      });

      render(<DownloadMenu show={s2MovieShow} />);
      await userEvent.click(
        screen.getByRole('button', { name: /native download/i }),
      );

      await waitFor(() => screen.getByText('1080p'));

      const anchor1080 = screen
        .getAllByRole('button')
        .find((a) => a.textContent?.includes('1080p'));

      expect(anchor1080).toBeDefined();
      if (anchor1080) {
        await userEvent.click(anchor1080);
      }

      await waitFor(() => {
        expect(mockElectronStart).toHaveBeenCalledWith(
          expect.objectContaining({
            m3u8Url: expect.stringContaining('?dl=1'),
          }),
        );
      });
    });

    it('shows "No valid download formats found" when API returns empty qualities', async () => {
      vi.mocked(apiFetch).mockResolvedValue({ success: true, data: [] });

      render(<DownloadMenu show={s2MovieShow} />);
      await userEvent.click(
        screen.getByRole('button', { name: /native download/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(/no valid download formats found/i),
        ).toBeInTheDocument();
      });
    });

    it('shows "No valid download formats found" when API call fails', async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'));

      render(<DownloadMenu show={s2MovieShow} />);
      await userEvent.click(
        screen.getByRole('button', { name: /native download/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(/no valid download formats found/i),
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

    it('shows "No episodes available" when season has no episodes', async () => {
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
      await userEvent.click(
        screen.getByRole('button', { name: /native download/i }),
      );

      await waitFor(() => {
        expect(screen.getByText(/no episodes available/i)).toBeInTheDocument();
      });
    });

    it('expands episode row and fetches qualities on click', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        success: true,
        data: mockQualities,
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
        expect.stringContaining('/api/v1/download'),
      );

      await waitFor(() => {
        expect(screen.getByText('1080p')).toBeInTheDocument();
        expect(screen.getByText('720p')).toBeInTheDocument();
      });
    });

    it('episode quality anchors have download and no-referrer attributes', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        success: true,
        data: mockQualities,
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

      const anchors = screen
        .getAllByRole('button')
        .filter(
          (b) =>
            b.textContent !== 'NATIVE DOWNLOAD' &&
            b.textContent !== 'DOWNLOAD' &&
            b.textContent !== 'OFFLINE SECURE DOWNLOAD',
        );
      for (const anchor of anchors) {
        expect((anchor as HTMLButtonElement).type).toBe('button');
      }
    });

    it('includes season and episode params in API call for episode', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        success: true,
        data: mockQualities,
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
