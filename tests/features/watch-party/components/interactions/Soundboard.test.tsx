import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { Soundboard } from '@/features/watch-party/components/interactions/Soundboard';
import {
  emitPartyInteraction,
  getTrendingSounds,
  onPartyInteraction,
  searchSounds,
} from '@/features/watch-party/services/watch-party.api';
import type { InteractionPayload } from '@/features/watch-party/types';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/features/watch-party/services/watch-party.api', () => ({
  emitPartyInteraction: vi.fn(),
  onPartyInteraction: vi.fn(() => vi.fn()), // Returns a cleanup function
  getTrendingSounds: vi.fn(),
  searchSounds: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockAudioPlay = vi.fn().mockResolvedValue(undefined);
const mockAudioPause = vi.fn();

// Use a class to mock Audio more realistically for JSDOM
class MockAudio {
  src: string;
  play = mockAudioPlay;
  pause = mockAudioPause;
  constructor(src: string) {
    this.src = src;
  }
}

const mockTrendingResponse = {
  count: 1,
  next: 'api/next',
  previous: null,
  results: [
    { name: 'Airhorn', slug: 'airhorn', sound: 'airhorn.mp3', color: 'ff0000' },
  ],
};

const mockSearchResponse = {
  count: 1,
  next: null,
  previous: null,
  results: [
    {
      name: 'Search Sound',
      slug: 'search-1',
      sound: 'search.mp3',
      color: '00ff00',
    },
  ],
};

describe('Soundboard', () => {
  beforeAll(() => {
    // @ts-expect-error
    global.Audio = MockAudio;
    // @ts-expect-error
    global.window.Audio = MockAudio;

    // Mock IntersectionObserver
    global.IntersectionObserver = class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn(() => []);
    } as unknown as typeof IntersectionObserver;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTrendingSounds).mockResolvedValue(mockTrendingResponse);
    vi.mocked(searchSounds).mockResolvedValue(mockSearchResponse);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render trending sounds on mount', async () => {
    render(<Soundboard />);
    await waitFor(() => {
      expect(screen.getByText('Airhorn')).toBeInTheDocument();
    });
    expect(getTrendingSounds).toHaveBeenCalledWith(1);
  });

  it('should play sound and emit interaction when button clicked', async () => {
    render(<Soundboard />);
    await waitFor(() => screen.getByText('Airhorn'));

    const airhornButton = screen.getByText('Airhorn').closest('button');
    if (!airhornButton) {
      throw new Error('Button not found');
    }

    fireEvent.click(airhornButton);

    expect(mockAudioPlay).toHaveBeenCalled();
    expect(emitPartyInteraction).toHaveBeenCalledWith({
      type: 'sound',
      value: 'airhorn.mp3',
    });
  });

  it('should stop previous sound when playing a new one', async () => {
    const mockSecondTrending = {
      ...mockTrendingResponse,
      results: [
        ...mockTrendingResponse.results,
        {
          name: 'Applause',
          slug: 'applause',
          sound: 'applause.mp3',
          color: '0000ff',
        },
      ],
    };
    vi.mocked(getTrendingSounds).mockResolvedValue(mockSecondTrending);

    render(<Soundboard />);
    await waitFor(() => screen.getByText('Applause'));

    const airhornButton = screen.getByText('Airhorn').closest('button');
    const applauseButton = screen.getByText('Applause').closest('button');

    if (!airhornButton || !applauseButton) {
      throw new Error('Buttons not found');
    }

    // Play first sound
    fireEvent.click(airhornButton);
    expect(mockAudioPlay).toHaveBeenCalledTimes(1);

    // Play second sound
    fireEvent.click(applauseButton);

    // Should pause the previous one
    expect(mockAudioPause).toHaveBeenCalled();
    expect(mockAudioPlay).toHaveBeenCalledTimes(2);
  });

  it('should play sound when receiving sound interaction', async () => {
    let interactionCallback: (data: InteractionPayload) => void = () => {};
    vi.mocked(onPartyInteraction).mockImplementation(
      (cb: (data: InteractionPayload) => void) => {
        interactionCallback = cb;
        return vi.fn(); // cleanup
      },
    );

    render(<Soundboard />);

    // Simulate incoming sound event
    interactionCallback({
      type: 'sound',
      value: 'applause.mp3',
      timestamp: Date.now().toString(),
      userId: 'u1',
      userName: 'User',
    });

    expect(mockAudioPlay).toHaveBeenCalled();
  });

  it('should handle search with debounce', async () => {
    vi.useFakeTimers();
    render(<Soundboard />);

    // Switch to real timers briefly to let initial mount fetch complete
    vi.useRealTimers();
    await waitFor(() => screen.getByText('Airhorn'), { timeout: 2000 });

    vi.useFakeTimers();
    const searchInput = screen.getByPlaceholderText('Search sounds...');
    fireEvent.change(searchInput, { target: { value: 'laugh' } });

    // Should not call searchSounds immediately
    expect(searchSounds).not.toHaveBeenCalled();

    // Fast forward debounce timer
    vi.advanceTimersByTime(500);

    // Give time for the async fetch function to be called and for its internal await to proceed
    vi.useRealTimers();

    await waitFor(() => {
      expect(searchSounds).toHaveBeenCalledWith('laugh', 1);
      expect(screen.getByText('Search Sound')).toBeInTheDocument();
    });
  });

  it('should load more sounds when button clicked', async () => {
    render(<Soundboard />);

    // Wait for "Load more" button to be visible
    const loadMoreButton = await screen.findByText(
      'Load more',
      {},
      { timeout: 4000 },
    );

    await act(async () => {
      fireEvent.click(loadMoreButton);
    });

    await waitFor(() => {
      expect(getTrendingSounds).toHaveBeenCalledWith(2);
    });
  });

  it('should handle audio playback errors gracefully', async () => {
    mockAudioPlay.mockRejectedValueOnce(new Error('Playback failed'));

    render(<Soundboard />);
    await waitFor(() => screen.getByText('Airhorn'));

    const airhornButton = screen.getByText('Airhorn').closest('button');
    if (!airhornButton) throw new Error('Button not found');

    fireEvent.click(airhornButton);

    await waitFor(() => {
      expect(mockAudioPlay).toHaveBeenCalled();
    });
  });
});
