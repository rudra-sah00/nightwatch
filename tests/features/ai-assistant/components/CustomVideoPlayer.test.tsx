import { fireEvent, render } from '@testing-library/react';

import { describe, expect, it, vi } from 'vitest';
import { CustomVideoPlayer } from '@/features/ai-assistant/components/CustomVideoPlayer';

// Mock video element behavior since JSDOM doesn't support semantic video APIs
Object.defineProperty(HTMLMediaElement.prototype, 'play', {
  configurable: true,
  writable: true,
  value: vi.fn().mockImplementation(() => Promise.resolve()),
});
Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  writable: true,
  value: vi.fn(),
});

describe('CustomVideoPlayer', () => {
  it('renders video element with correct source', () => {
    const { container } = render(
      <CustomVideoPlayer src="https://example.com/video.mp4" />,
    );
    const videoElement = container.querySelector('video');
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute(
      'src',
      'https://example.com/video.mp4',
    );
  });

  it('renders poster if provided', () => {
    render(
      <CustomVideoPlayer
        src="https://example.com/video.mp4"
        poster="https://example.com/poster.jpg"
      />,
    );
    const videoElement = document.querySelector('video');
    expect(videoElement).toHaveAttribute(
      'poster',
      'https://example.com/poster.jpg',
    );
  });

  it('toggles play/pause state on click', () => {
    const { container } = render(
      <CustomVideoPlayer src="https://example.com/video.mp4" />,
    );
    const videoElement = container.querySelector('video');

    // Initial state: paused, shows big play button
    // We can't easily test internal state without exposing it, but we can check if play() is called
    fireEvent.click(videoElement!);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });
});
