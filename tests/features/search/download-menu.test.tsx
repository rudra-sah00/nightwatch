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

const mockStartDownload = vi.fn();
vi.mock('@/lib/electron-bridge', () => ({
  isDesktop: true,
  isMobile: false,
  checkIsDesktop: () => true,
  checkIsMobile: () => false,
  desktopBridge: {
    startDownload: (...args: unknown[]) => mockStartDownload(...args),
    getDownloads: vi.fn().mockResolvedValue([]),
    onDownloadProgress: () => () => {},
    copyToClipboard: vi.fn(),
    storeGet: vi.fn().mockResolvedValue(undefined),
    storeSet: vi.fn(),
    storeDelete: vi.fn(),
    getAppVersion: vi.fn().mockResolvedValue(''),
    setNativeTheme: vi.fn(),
    setPictureInPicture: vi.fn(),
    setUnreadBadge: vi.fn(),
    setKeepAwake: vi.fn(),
    onPipModeChanged: () => () => {},
    showNotification: vi.fn(),
    onNotificationAction: () => () => {},
    onNotificationClick: () => () => {},
    setRunOnBoot: vi.fn(),
    retryConnection: vi.fn(),
    onMediaCommand: () => () => {},
    toggleFullscreen: vi.fn(),
    onFullscreenChanged: () => () => {},
    onWindowBlur: () => () => {},
    onWindowFocus: () => () => {},
    onWindowFullscreenChanged: () => () => {},
    updateDiscordPresence: vi.fn(),
    cancelDownload: vi.fn(),
    pauseDownload: vi.fn(),
    resumeDownload: vi.fn(),
    startLiveBridge: vi.fn(),
    stopLiveBridge: vi.fn(),
    onLiveBridgeResolved: () => () => {},
    readOfflineFile: vi.fn().mockResolvedValue(new Uint8Array()),
    getOfflineMediaBase: vi.fn().mockResolvedValue('offline-media://local'),
  },
  resolveOfflineUrl: vi
    .fn()
    .mockImplementation((url: string) => Promise.resolve(url)),
  isOfflineMediaUrl: vi.fn().mockReturnValue(false),
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
    it('renders DOWNLOAD for all content', () => {
      render(<DownloadMenu show={nonS2Show} />);
      // We look for EXACT match in name, wait, there's SVG inside, so byRole works with regex.
      expect(
        screen.getByRole('button', { name: /download\.download/i }),
      ).toBeInTheDocument();
    });

    it('renders a Download button for S2 movie content', () => {
      render(<DownloadMenu show={s2MovieShow} />);
      expect(
        screen.getByRole('button', { name: /download\.download/i }),
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
        screen.getByRole('button', { name: /download\.download/i }),
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
      // Open dialog
      await userEvent.click(
        screen.getByRole('button', { name: /download\.download/i }),
      );

      // Wait for fetch qualities api to be called
      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/video/download-links'),
      );

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /1080P\+/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /720P/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /480P/i }),
        ).toBeInTheDocument();
      });
    });

    it('quality URLs trigger electron download with corresponding URL', async () => {
      vi.mocked(apiFetch).mockResolvedValue({
        success: true,
        qualities: mockQualities,
      });

      render(<DownloadMenu show={s2MovieShow} />);
      await userEvent.click(
        screen.getByRole('button', { name: /download\.download/i }),
      );

      await waitFor(() => screen.getByRole('button', { name: /1080P\+/i }));

      const highBtn = screen.getByRole('button', { name: /1080P\+/i });
      await userEvent.click(highBtn);

      await waitFor(() => {
        expect(mockStartDownload).toHaveBeenCalledWith(
          expect.objectContaining({
            m3u8Url: expect.stringContaining('url1080?dl=1'),
            quality: 'high',
          }),
        );
      });
    });

    it('shows "no formats available." when API returns empty qualities', async () => {
      vi.mocked(apiFetch).mockResolvedValue({ success: true, qualities: [] });

      render(<DownloadMenu show={s2MovieShow} />);
      await userEvent.click(
        screen.getByRole('button', { name: /download\.download/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(/download\.noFormatsAvailable/i),
        ).toBeInTheDocument();
      });
    });

    it('shows "no formats available." when API call fails', async () => {
      vi.mocked(apiFetch).mockRejectedValue(new Error('Network error'));

      render(<DownloadMenu show={s2MovieShow} />);
      await userEvent.click(
        screen.getByRole('button', { name: /download\.download/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(/download\.noFormatsAvailable/i),
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
      await userEvent.click(
        screen.getByRole('button', { name: /download\.download/i }),
      );

      await waitFor(() => {
        expect(screen.getByText('Pilot')).toBeInTheDocument();
        expect(screen.getByText("Cat's in the Bag")).toBeInTheDocument();
      });

      expect(screen.queryByText(/zip/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/download full season/i),
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
          episodes={[]}
        />,
      );
      await userEvent.click(
        screen.getByRole('button', { name: /download\.download/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(/download\.noEpisodesAvailable/i),
        ).toBeInTheDocument();
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
      await userEvent.click(
        screen.getByRole('button', { name: /download\.download/i }),
      );

      // Wait for episode row to appear
      await waitFor(() => screen.getByText('Pilot'));

      // Click the episode row to expand
      await userEvent.click(screen.getByText('Pilot'));

      expect(apiFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/video/download-links'),
      );

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /1080P\+/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /720P/i }),
        ).toBeInTheDocument();
      });
    });

    it('episode qualities trigger electron download', async () => {
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
      await userEvent.click(
        screen.getByRole('button', { name: /download\.download/i }),
      );

      await waitFor(() => screen.getByText('Pilot'));
      await userEvent.click(screen.getByText('Pilot'));

      await waitFor(() => screen.getByRole('button', { name: /1080P\+/i }));

      const highBtn = screen.getByRole('button', { name: /1080P\+/i });
      await userEvent.click(highBtn);

      await waitFor(() => {
        expect(mockStartDownload).toHaveBeenCalledWith(
          expect.objectContaining({
            m3u8Url: expect.stringContaining('url1080?dl=1'),
            quality: 'high',
          }),
        );
      });
    });
  });
});
