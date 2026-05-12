import { fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PlayerEpisodePanel,
  PlayerEpisodePanelOverlay,
  PlayerEpisodePanelTrigger,
} from '@/features/watch/player/ui/compound/PlayerEpisodePanel';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Mock PlayerContext
const mockPlayerContext = {
  metadata: {
    type: 'series' as const,
    title: 'Stranger Things',
    movieId: 'st-id',
    seriesId: 'st-id',
    season: 1,
    episode: 2,
    posterUrl: 'https://img.example.com/poster.jpg',
    year: '2016',
    providerId: 's2',
  },
  onNavigate: vi.fn(),
  playerHandlers: {
    handleInteraction: vi.fn(),
    togglePlay: vi.fn(),
    toggleMute: vi.fn(),
    seek: vi.fn(),
    skip: vi.fn(),
    setVolume: vi.fn(),
    toggleFullscreen: vi.fn(),
    goBack: vi.fn(),
    setQuality: vi.fn(),
    setPlaybackRate: vi.fn(),
    setAudioTrack: vi.fn(),
    setSubtitleTrack: vi.fn(),
  },
  state: { showControls: true, isLoading: false },
  dispatch: vi.fn(),
  streamUrl: null,
  videoRef: { current: null },
  videoCallbackRef: vi.fn(),
  containerRef: { current: null },
  nextEpisode: {
    show: false,
    info: null,
    isLoading: false,
    play: vi.fn(),
    cancel: vi.fn(),
  },
};

vi.mock('@/features/watch/player/context/PlayerContext', () => ({
  usePlayerContext: () => mockPlayerContext,
  PlayerContext: {
    Provider: ({
      children,
      _value,
    }: {
      children: React.ReactNode;
      _value: unknown;
    }) => children,
  },
}));

// Mock useEpisodePanel
const mockPanel = {
  isOpen: false,
  toggle: vi.fn(),
  close: vi.fn(),
  episodes: [
    {
      episodeId: 'ep1',
      seriesId: 'st-id',
      episodeNumber: 1,
      title: 'Chapter One',
      thumbnailUrl: 'https://img.example.com/ep1.jpg',
    },
  ],
  seasons: [
    { seasonNumber: 1, seasonId: 's2', episodeCount: 8 },
    { seasonNumber: 2, seasonId: 's2', episodeCount: 9 },
  ],
  selectedSeason: 1,
  isLoading: false,
  onSeasonChange: vi.fn(),
  panelRef: { current: null },
};

vi.mock('@/features/watch/player/ui/controls/hooks/use-episode-panel', () => ({
  useEpisodePanel: () => mockPanel,
}));

// Mock playVideo
vi.mock('@/features/search/api', () => ({
  getShowDetails: vi.fn().mockResolvedValue({
    id: 's1:123',
    title: 'Test Movie',
    contentType: 'movie',
    posterUrl: 'https://example.com/poster.jpg',
  }),
  getSeriesEpisodes: vi.fn().mockResolvedValue({ episodes: [] }),
}));

vi.mock('@/features/watch/api', () => ({
  stopVideo: vi.fn(),
  playVideo: vi.fn(),
}));

// Mock EpisodePanel presentational component
vi.mock('@/features/watch/player/ui/controls/EpisodePanel', () => ({
  EpisodePanel: (props: {
    isOpen: boolean;
    onClose: () => void;
    onEpisodeSelect: (ep: unknown) => void;
  }) =>
    props.isOpen ? (
      <div data-testid="episode-panel">
        <button type="button" data-testid="close-btn" onClick={props.onClose}>
          Close
        </button>
        <button
          type="button"
          data-testid="select-ep-btn"
          onClick={() =>
            props.onEpisodeSelect({
              episodeId: 'ep1',
              seriesId: 'st-id',
              episodeNumber: 1,
              title: 'Chapter One',
              thumbnailUrl: '',
            })
          }
        >
          Select Ep
        </button>
      </div>
    ) : null,
}));

describe('PlayerEpisodePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPanel.isOpen = false;
    mockPlayerContext.metadata.type = 'series';
  });

  describe('rendering', () => {
    it('should render children', () => {
      render(
        <PlayerEpisodePanel>
          <div data-testid="child">Child content</div>
        </PlayerEpisodePanel>,
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should render children for movie content (no context)', () => {
      mockPlayerContext.metadata.type = 'movie' as 'series';

      render(
        <PlayerEpisodePanel>
          <div data-testid="child">Movie child</div>
        </PlayerEpisodePanel>,
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('should not render panel when closed', () => {
      mockPanel.isOpen = false;

      render(
        <PlayerEpisodePanel>
          <div>Controls</div>
        </PlayerEpisodePanel>,
      );

      expect(screen.queryByTestId('episode-panel')).not.toBeInTheDocument();
    });

    it('should navigate to the selected episode', () => {
      mockPanel.isOpen = true;

      render(
        <PlayerEpisodePanel>
          <PlayerEpisodePanelOverlay />
        </PlayerEpisodePanel>,
      );

      fireEvent.click(screen.getByTestId('select-ep-btn'));

      expect(mockPlayerContext.onNavigate).toHaveBeenCalled();
      const navUrl = mockPlayerContext.onNavigate.mock.calls[0][0];
      expect(navUrl).toContain('/watch/st-id');
      expect(navUrl).toContain('episode=1');
      expect(navUrl).toContain('season=1');
    });
  });
});

describe('PlayerEpisodePanelOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPanel.isOpen = false;
    mockPlayerContext.metadata.type = 'series';
  });

  it('should render the panel node from context when open', () => {
    mockPanel.isOpen = true;

    render(
      <PlayerEpisodePanel>
        <div>Controls</div>
        <PlayerEpisodePanelOverlay />
      </PlayerEpisodePanel>,
    );

    expect(screen.getByTestId('episode-panel')).toBeInTheDocument();
  });

  it('should not render panel when closed', () => {
    mockPanel.isOpen = false;

    render(
      <PlayerEpisodePanel>
        <div>Controls</div>
        <PlayerEpisodePanelOverlay />
      </PlayerEpisodePanel>,
    );

    expect(screen.queryByTestId('episode-panel')).not.toBeInTheDocument();
  });

  it('should render nothing outside of EpisodePanelContext', () => {
    const { container } = render(<PlayerEpisodePanelOverlay />);

    expect(container.firstChild).toBeNull();
  });
});

describe('PlayerEpisodePanelTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPanel.isOpen = false;
    mockPlayerContext.metadata.type = 'series';
  });

  it('should render trigger button inside context', () => {
    render(
      <PlayerEpisodePanel>
        <PlayerEpisodePanelTrigger />
      </PlayerEpisodePanel>,
    );

    expect(screen.getByLabelText('showEpisodes')).toBeInTheDocument();
  });

  it('should render nothing outside of context', () => {
    const { container } = render(<PlayerEpisodePanelTrigger />);

    expect(container.firstChild).toBeNull();
  });

  it('should call toggle when clicked', () => {
    render(
      <PlayerEpisodePanel>
        <PlayerEpisodePanelTrigger />
      </PlayerEpisodePanel>,
    );

    fireEvent.click(screen.getByLabelText('showEpisodes'));
    expect(mockPanel.toggle).toHaveBeenCalledTimes(1);
  });

  it('should have active styling when panel is open', () => {
    mockPanel.isOpen = true;

    render(
      <PlayerEpisodePanel>
        <PlayerEpisodePanelTrigger />
      </PlayerEpisodePanel>,
    );

    const button = screen.getByLabelText('showEpisodes');
    expect(button).toHaveClass('bg-background');
    expect(button).toHaveClass('shadow-none');
    expect(button).toHaveClass('shadow-none');
  });

  it('should have inactive styling when panel is closed', () => {
    mockPanel.isOpen = false;

    render(
      <PlayerEpisodePanel>
        <PlayerEpisodePanelTrigger />
      </PlayerEpisodePanel>,
    );

    const button = screen.getByLabelText('showEpisodes');
    expect(button).toHaveClass('bg-background');
    expect(button).toHaveClass('border-border');
  });

  it('should have the correct title', () => {
    render(
      <PlayerEpisodePanel>
        <PlayerEpisodePanelTrigger />
      </PlayerEpisodePanel>,
    );

    expect(screen.getByTitle('episodesTitle')).toBeInTheDocument();
  });
});
