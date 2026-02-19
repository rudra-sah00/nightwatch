import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MediaModal } from '@/features/ai-assistant/components/MediaModal';

// Mock icons
vi.mock('lucide-react', () => ({
  X: () => <div data-testid="close-icon" />,
  Maximize2: () => <div data-testid="maximize-icon" />,
  ExternalLink: () => <div data-testid="link-icon" />,
  Play: () => <div data-testid="play-icon" />,
  Pause: () => <div data-testid="pause-icon" />,
  Volume2: () => <div data-testid="volume-icon" />,
  VolumeX: () => <div data-testid="mute-icon" />,
  Maximize: () => <div data-testid="maximize-icon" />,
  Minimize: () => <div data-testid="minimize-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
}));

// Mock Next/Image
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    ...props
  }: React.DetailedHTMLProps<
    React.ImgHTMLAttributes<HTMLImageElement>,
    HTMLImageElement
  > & { src: string; alt: string }) => <img src={src} alt={alt} {...props} />,
}));

// Mock react-dom createPortal to just return children
vi.mock('react-dom', () => ({
  ...vi.importActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

describe('MediaModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    url: 'https://example.com/media.mp4',
    type: 'video' as const,
  };

  it('renders nothing when closed', () => {
    render(<MediaModal {...mockProps} isOpen={false} />);
    expect(screen.queryByTestId('close-icon')).not.toBeInTheDocument();
  });

  it('renders video player for mp4/video type', async () => {
    let container: HTMLElement;
    await act(async () => {
      const result = render(<MediaModal {...mockProps} />);
      container = result.container;
    });
    const video = container!.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', mockProps.url);
  });

  it('renders image for image type', async () => {
    await act(async () => {
      render(<MediaModal {...mockProps} type="image" url="/test.jpg" />);
    });
    expect(screen.getByRole('img')).toHaveAttribute('src', '/test.jpg');
  });

  it('renders youtube iframe for youtube urls', async () => {
    let getByTitle: ((id: string) => HTMLElement) | null = null;
    await act(async () => {
      const result = render(
        <MediaModal
          {...mockProps}
          url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        />,
      );
      getByTitle = result.getByTitle;
    });
    const iframe = getByTitle!('Video Player');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      'src',
      expect.stringContaining('youtube-nocookie.com/embed/dQw4w9WgXcQ'),
    );
  });

  it('handles IMDb trailer URLs', () => {
    render(
      <MediaModal
        url="https://www.imdb.com/video/vi12345678"
        type="video"
        isOpen={true}
        onClose={vi.fn()}
      />,
    );
    const iframe = screen.getByTitle('Video Player');
    expect(iframe).toHaveAttribute(
      'src',
      expect.stringContaining('imdb.com/video/embed/vi12345678'),
    );
  });

  it('handles YouTube short/embed URLs without v parameter', () => {
    render(
      <MediaModal
        url="https://youtu.be/abc123"
        type="video"
        isOpen={true}
        onClose={vi.fn()}
      />,
    );
    const iframe = screen.getByTitle('Video Player');
    expect(iframe).toHaveAttribute(
      'src',
      expect.stringContaining('youtube-nocookie.com/embed/abc123'),
    );
  });

  it('handles null or invalid types gracefully', () => {
    const { rerender } = render(
      <MediaModal url="test" type={null} isOpen={true} onClose={vi.fn()} />,
    );
    expect(screen.queryByTitle('Video Player')).not.toBeInTheDocument();

    rerender(
      <MediaModal url={null} type="video" isOpen={true} onClose={vi.fn()} />,
    );
    expect(screen.queryByTitle('Video Player')).not.toBeInTheDocument();
  });

  it('handles MP4 direct links', () => {
    const { container } = render(
      <MediaModal
        url="test.mp4"
        type="video"
        isOpen={true}
        onClose={vi.fn()}
      />,
    );
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'test.mp4');
  });

  it('manages body overflow on open/close', () => {
    const { rerender } = render(
      <MediaModal url="test" type="image" isOpen={true} onClose={vi.fn()} />,
    );
    expect(document.body.style.overflow).toBe('hidden');

    rerender(
      <MediaModal url="test" type="image" isOpen={false} onClose={vi.fn()} />,
    );
    expect(document.body.style.overflow).toBe('auto');
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    await act(async () => {
      render(<MediaModal {...mockProps} onClose={onClose} />);
    });

    fireEvent.click(screen.getByTestId('close-icon'));
    expect(onClose).toHaveBeenCalled();
  });
});
