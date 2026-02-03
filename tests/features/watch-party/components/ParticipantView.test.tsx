import { fireEvent, render, screen } from '@testing-library/react';
import type { Participant } from 'livekit-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ParticipantView } from '@/features/watch-party/components/ParticipantView';

// Mock the hooks
const mockVideoRef = { current: null };
const mockAudioRef = { current: null };

vi.mock('@/features/watch-party/hooks/useParticipantTracks', () => ({
  useParticipantTracks: vi.fn(() => ({
    videoRef: mockVideoRef,
    isVideoMuted: false,
    hasVideoTrack: true,
    audioTrack: undefined,
  })),
}));

vi.mock('@/features/watch-party/hooks/useAudioStream', () => ({
  useAudioStream: vi.fn(() => mockAudioRef),
}));

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
    fill?: boolean;
    unoptimized?: boolean;
  }) => (
    <img src={src} alt={alt} className={className} data-testid="next-image" />
  ),
}));

// Get mocked hooks for per-test customization
import { useParticipantTracks } from '@/features/watch-party/hooks/useParticipantTracks';

const mockedUseParticipantTracks = vi.mocked(useParticipantTracks);

describe('ParticipantView', () => {
  const createMockParticipant = (
    overrides: Partial<Participant> = {},
  ): Participant => {
    return {
      identity: 'user-123',
      name: 'Test User',
      isMicrophoneEnabled: true,
      isCameraEnabled: true,
      isSpeaking: false,
      metadata: undefined,
      ...overrides,
    } as unknown as Participant;
  };

  const defaultProps = {
    participant: createMockParticipant(),
    isLocal: false,
    canKick: false,
    onKick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock return value
    mockedUseParticipantTracks.mockReturnValue({
      videoRef: mockVideoRef,
      isVideoMuted: false,
      hasVideoTrack: true,
      audioTrack: undefined,
    });
  });

  describe('rendering', () => {
    it('should render video element', () => {
      const { container } = render(<ParticipantView {...defaultProps} />);

      expect(container.querySelector('video')).toBeInTheDocument();
    });

    it('should render audio element for remote participants', () => {
      const { container } = render(
        <ParticipantView {...defaultProps} isLocal={false} />,
      );

      expect(container.querySelector('audio')).toBeInTheDocument();
    });

    it('should render participant name', () => {
      render(<ParticipantView {...defaultProps} />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should show fallback name "User" when name is undefined', () => {
      const participant = createMockParticipant({ name: undefined });
      render(<ParticipantView {...defaultProps} participant={participant} />);

      expect(screen.getByText('User')).toBeInTheDocument();
    });
  });

  describe('video state', () => {
    it('should show video when video is enabled', () => {
      mockedUseParticipantTracks.mockReturnValue({
        videoRef: mockVideoRef,
        isVideoMuted: false,
        hasVideoTrack: true,
        audioTrack: undefined,
      });

      const { container } = render(<ParticipantView {...defaultProps} />);

      const video = container.querySelector('video');
      expect(video).toHaveClass('opacity-100');
    });

    it('should hide video when video is muted', () => {
      mockedUseParticipantTracks.mockReturnValue({
        videoRef: mockVideoRef,
        isVideoMuted: true,
        hasVideoTrack: true,
        audioTrack: undefined,
      });

      const { container } = render(<ParticipantView {...defaultProps} />);

      const video = container.querySelector('video');
      expect(video).toHaveClass('opacity-0');
    });

    it('should hide video when no video track', () => {
      mockedUseParticipantTracks.mockReturnValue({
        videoRef: mockVideoRef,
        isVideoMuted: false,
        hasVideoTrack: false,
        audioTrack: undefined,
      });

      const { container } = render(<ParticipantView {...defaultProps} />);

      const video = container.querySelector('video');
      expect(video).toHaveClass('opacity-0');
    });
  });

  describe('avatar fallback', () => {
    it('should show avatar fallback when video is muted', () => {
      mockedUseParticipantTracks.mockReturnValue({
        videoRef: mockVideoRef,
        isVideoMuted: true,
        hasVideoTrack: true,
        audioTrack: undefined,
      });

      render(<ParticipantView {...defaultProps} />);

      // Avatar fallback shows initial letter
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should show initial letter avatar when no avatar URL', () => {
      mockedUseParticipantTracks.mockReturnValue({
        videoRef: mockVideoRef,
        isVideoMuted: true,
        hasVideoTrack: false,
        audioTrack: undefined,
      });

      const participant = createMockParticipant({ name: 'John Doe' });
      render(<ParticipantView {...defaultProps} participant={participant} />);

      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should show avatar image when metadata contains avatar URL', () => {
      mockedUseParticipantTracks.mockReturnValue({
        videoRef: mockVideoRef,
        isVideoMuted: true,
        hasVideoTrack: false,
        audioTrack: undefined,
      });

      const participant = createMockParticipant({
        metadata: JSON.stringify({ avatar: 'https://example.com/avatar.jpg' }),
      });
      render(<ParticipantView {...defaultProps} participant={participant} />);

      const images = screen.getAllByTestId('next-image');
      expect(images.length).toBeGreaterThan(0);
    });
  });

  describe('microphone indicator', () => {
    it('should show mic icon when microphone is enabled', () => {
      const participant = createMockParticipant({ isMicrophoneEnabled: true });
      const { container } = render(
        <ParticipantView {...defaultProps} participant={participant} />,
      );

      // Mic icon has green color class
      const micIcon = container.querySelector('.text-green-400');
      expect(micIcon).toBeInTheDocument();
    });

    it('should show muted mic icon when microphone is disabled', () => {
      const participant = createMockParticipant({ isMicrophoneEnabled: false });
      const { container } = render(
        <ParticipantView {...defaultProps} participant={participant} />,
      );

      // Muted mic icon has red color class
      const micOffIcon = container.querySelector('.text-red-400');
      expect(micOffIcon).toBeInTheDocument();
    });
  });

  describe('speaking indicator', () => {
    it('should show speaking indicator when participant is speaking', () => {
      const participant = createMockParticipant({ isSpeaking: true });
      const { container } = render(
        <ParticipantView {...defaultProps} participant={participant} />,
      );

      // Speaking indicator has animate-pulse class
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should not show speaking indicator when not speaking', () => {
      const participant = createMockParticipant({ isSpeaking: false });
      const { container } = render(
        <ParticipantView {...defaultProps} participant={participant} />,
      );

      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
    });
  });

  describe('kick functionality', () => {
    it('should not show kick button when canKick is false', () => {
      render(<ParticipantView {...defaultProps} canKick={false} />);

      expect(screen.queryByTitle('Kick user')).not.toBeInTheDocument();
    });

    it('should not show kick button when onKick is undefined', () => {
      render(
        <ParticipantView {...defaultProps} canKick={true} onKick={undefined} />,
      );

      expect(screen.queryByTitle('Kick user')).not.toBeInTheDocument();
    });

    it('should show kick button when canKick is true and onKick provided', () => {
      render(
        <ParticipantView {...defaultProps} canKick={true} onKick={vi.fn()} />,
      );

      expect(screen.getByTitle('Kick user')).toBeInTheDocument();
    });

    it('should call onKick with participant identity when clicked', () => {
      const onKick = vi.fn();
      const participant = createMockParticipant({ identity: 'user-456' });
      render(
        <ParticipantView
          {...defaultProps}
          participant={participant}
          canKick={true}
          onKick={onKick}
        />,
      );

      fireEvent.click(screen.getByTitle('Kick user'));
      expect(onKick).toHaveBeenCalledWith('user-456');
    });
  });

  describe('local participant', () => {
    it('should mute video for local participant', () => {
      const { container } = render(
        <ParticipantView {...defaultProps} isLocal={true} />,
      );

      const video = container.querySelector('video');
      expect(video).toHaveAttribute('muted');
    });
  });

  describe('edge cases', () => {
    it('should handle invalid JSON in metadata gracefully', () => {
      mockedUseParticipantTracks.mockReturnValue({
        videoRef: mockVideoRef,
        isVideoMuted: true,
        hasVideoTrack: false,
        audioTrack: undefined,
      });

      const participant = createMockParticipant({
        metadata: 'invalid json',
      });

      // Should not throw
      render(<ParticipantView {...defaultProps} participant={participant} />);

      // Should show initial letter fallback
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should handle empty metadata gracefully', () => {
      mockedUseParticipantTracks.mockReturnValue({
        videoRef: mockVideoRef,
        isVideoMuted: true,
        hasVideoTrack: false,
        audioTrack: undefined,
      });

      const participant = createMockParticipant({ metadata: '' });

      render(<ParticipantView {...defaultProps} participant={participant} />);

      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should handle metadata without avatar', () => {
      mockedUseParticipantTracks.mockReturnValue({
        videoRef: mockVideoRef,
        isVideoMuted: true,
        hasVideoTrack: false,
        audioTrack: undefined,
      });

      const participant = createMockParticipant({
        metadata: JSON.stringify({ name: 'Test' }),
      });

      render(<ParticipantView {...defaultProps} participant={participant} />);

      // Should show initial letter fallback
      expect(screen.getByText('T')).toBeInTheDocument();
    });
  });
});
