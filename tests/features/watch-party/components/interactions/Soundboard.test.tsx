import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Soundboard } from '@/features/watch-party/interactions/components/Soundboard';

// Mock the hook
vi.mock('@/features/watch-party/interactions/hooks/use-soundboard', () => ({
  useSoundboard: vi.fn(() => ({
    sounds: [
      { slug: 'clap', name: 'Clap', sound: 'clap.mp3', color: 'ff0000' },
      { slug: 'laugh', name: 'Laugh', sound: 'laugh.mp3', color: '00ff00' },
    ],
    loading: false,
    searchQuery: '',
    setSearchQuery: vi.fn(),
    hasMore: false,
    isSearching: false,
    loadMoreRef: { current: null },
    loadMore: vi.fn(),
    handleTriggerSound: vi.fn(),
  })),
}));

describe('Soundboard', () => {
  const mockRtmSendMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sounds from the hook', () => {
    render(<Soundboard rtmSendMessage={mockRtmSendMessage} />);
    expect(screen.getByText('Clap')).toBeInTheDocument();
    expect(screen.getByText('Laugh')).toBeInTheDocument();
  });

  it('calls handleTriggerSound when a sound button is clicked', async () => {
    const { useSoundboard } = await import(
      '@/features/watch-party/interactions/hooks/use-soundboard'
    );
    const mockTrigger = vi.fn();
    vi.mocked(useSoundboard).mockReturnValue({
      sounds: [
        { slug: 'clap', name: 'Clap', sound: 'clap.mp3', color: 'ff0000' },
      ],
      loading: false,
      searchQuery: '',
      setSearchQuery: vi.fn(),
      hasMore: false,
      isSearching: false,
      loadMoreRef: { current: null },
      loadMore: vi.fn(),
      handleTriggerSound: mockTrigger,
    } as unknown as ReturnType<typeof useSoundboard>);

    render(<Soundboard rtmSendMessage={mockRtmSendMessage} />);
    fireEvent.click(screen.getByText('Clap'));
    expect(mockTrigger).toHaveBeenCalledWith('clap.mp3', 'Clap');
  });

  it('updates search query on input change', async () => {
    const { useSoundboard } = await import(
      '@/features/watch-party/interactions/hooks/use-soundboard'
    );
    const mockSetSearch = vi.fn();
    vi.mocked(useSoundboard).mockReturnValue({
      sounds: [],
      loading: false,
      searchQuery: '',
      setSearchQuery: mockSetSearch,
      hasMore: false,
      isSearching: false,
      loadMoreRef: { current: null },
      loadMore: vi.fn(),
      handleTriggerSound: vi.fn(),
    } as unknown as ReturnType<typeof useSoundboard>);

    render(<Soundboard rtmSendMessage={mockRtmSendMessage} />);
    const input = screen.getByPlaceholderText('soundboard.searchPlaceholder');
    fireEvent.change(input, { target: { value: 'airhorn' } });
    expect(mockSetSearch).toHaveBeenCalledWith('airhorn');
  });
});
