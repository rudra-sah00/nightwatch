import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AssistantMovieCard } from '@/features/ai-assistant/components/AssistantMovieCard';

// Mock icons
vi.mock('lucide-react', () => ({
  Play: () => <span data-testid="play-icon" />,
  Star: () => <span data-testid="star-icon" />,
  Trophy: () => <span data-testid="trophy-icon" />,
  Image: () => <span data-testid="image-icon" />,
  Video: () => <span data-testid="video-icon" />,
  Film: () => <span data-testid="film-icon" />,
  Sparkles: () => <span data-testid="sparkles-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
}));

// Mock Next/Image
vi.mock('next/image', () => ({
  default: ({ src, alt, fill, unoptimized, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  ),
}));

describe('AssistantMovieCard', () => {
  const mockProps = {
    id: '1',
    title: 'Interstellar',
    poster: '/interstellar.jpg',
    subtitle: '2014',
    imdbRating: '8.7',
    type: 'movie' as const,
    onSelect: vi.fn(),
  };

  it('renders movie details correctly in portrait variant', () => {
    render(<AssistantMovieCard {...mockProps} variant="portrait" />);

    expect(screen.getByText('Interstellar')).toBeInTheDocument();
    expect(screen.getByText('2014')).toBeInTheDocument();
    expect(screen.getByText('8.7')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/interstellar.jpg');
  });

  it('calls onSelect when clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<AssistantMovieCard {...mockProps} onSelect={onSelect} />);

    // The main card click is now via an absolute positioned button
    // We need to target that specific button or just click the card container which propagates (if not blocked)
    // Actually, the button covers the card, so clicking the card effectively clicks the button
    await user.click(screen.getByLabelText(`Select ${mockProps.title}`));

    expect(onSelect).toHaveBeenCalledWith('1', { videoUrl: undefined }); // In mockProps, videoUrl is not defined
  });

  it('renders as landscape for photos/trailers', () => {
    render(
      <AssistantMovieCard {...mockProps} variant="landscape" type="Photo" />,
    );

    expect(screen.getByText('Interstellar')).toBeInTheDocument();
    const card = screen.getByTestId('assistant-movie-card');
    expect(card).toHaveClass('flex-col'); // isLandscape ? "flex-col" : "flex-row"
  });

  it('shows award text when awards are present', () => {
    render(<AssistantMovieCard {...mockProps} awards="Oscar Winner" />);
    expect(screen.getByText('Oscar Winner')).toBeInTheDocument();
  });

  it('calls onSelect when watch now is clicked', () => {
    const onSelect = vi.fn();
    render(<AssistantMovieCard {...mockProps} onSelect={onSelect} />);

    const playButton = screen.getByTestId('watch-now-button');
    fireEvent.click(playButton);
    expect(onSelect).toHaveBeenCalled();
  });

  it('displays media icons for Photo type', () => {
    render(
      <AssistantMovieCard {...mockProps} type="Photo" variant="landscape" />,
    );
    // It shows the type label "Photo" in landscape mode
    expect(screen.getByText('Photo')).toBeInTheDocument();
  });

  it('displays media icons for Trailer type', () => {
    render(
      <AssistantMovieCard {...mockProps} type="Trailer" variant="landscape" />,
    );
    expect(screen.getByTestId('play-icon')).toBeInTheDocument();
  });
});
