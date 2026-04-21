import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VideoGrid } from '@/features/watch-party/components/VideoGrid';
import type { AgoraParticipant } from '@/features/watch-party/media/hooks/useAgora';

// Mock the ParticipantView component since it has complex Agora dependencies
vi.mock('@/features/watch-party/components/ParticipantView', () => ({
  ParticipantView: ({
    participant,
    canKick,
    onKick,
  }: {
    participant: AgoraParticipant;
    canKick?: boolean;
    onKick?: (userId: string) => void;
  }) => (
    <div data-testid={`participant-${participant.identity}`}>
      <span>{participant.name || 'User'}</span>
      <span data-testid="is-local">
        {participant.isLocal ? 'local' : 'remote'}
      </span>
      {canKick && onKick && (
        <button
          type="button"
          data-testid={`kick-${participant.identity}`}
          onClick={() => onKick(participant.identity)}
        >
          Kick
        </button>
      )}
    </div>
  ),
}));

describe('VideoGrid', () => {
  // Mock participant factory
  const createMockParticipant = (
    identity: string,
    name: string,
    isLocal = false,
  ): AgoraParticipant => {
    return {
      identity,
      name,
      isMicrophoneEnabled: true,
      isCameraEnabled: true,
      isSpeaking: false,
      metadata: undefined,
      isLocal,
      uid: identity,
      audioLevel: 0,
    } as unknown as AgoraParticipant;
  };

  const mockParticipants: AgoraParticipant[] = [
    createMockParticipant('user-1', 'John Doe', true), // isLocal=true
    createMockParticipant('user-2', 'Jane Smith', false),
    createMockParticipant('user-3', 'Bob Wilson', false),
  ];

  const defaultProps = {
    participants: mockParticipants,
    currentUserId: 'user-1',
    isHost: true,
    onKick: vi.fn(),
  };

  describe('empty state', () => {
    it('should show empty state when no participants', () => {
      render(<VideoGrid {...defaultProps} participants={[]} />);

      expect(screen.getByText('noOneOnCamera')).toBeInTheDocument();
      expect(screen.getByText('turnOnCamera')).toBeInTheDocument();
    });

    it('should show video icon in empty state', () => {
      const { container } = render(
        <VideoGrid {...defaultProps} participants={[]} />,
      );

      // Check for lucide video icon (svg element)
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('rendering participants', () => {
    it('should render all participants', () => {
      render(<VideoGrid {...defaultProps} />);

      expect(screen.getByTestId('participant-user-1')).toBeInTheDocument();
      expect(screen.getByTestId('participant-user-2')).toBeInTheDocument();
      expect(screen.getByTestId('participant-user-3')).toBeInTheDocument();
    });

    it('should render participant names', () => {
      render(<VideoGrid {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });

    it('should mark current user as local', () => {
      render(<VideoGrid {...defaultProps} currentUserId="user-1" />);

      const participant1 = screen.getByTestId('participant-user-1');
      expect(participant1).toContainElement(
        screen.getAllByTestId('is-local')[0],
      );
      expect(screen.getAllByTestId('is-local')[0]).toHaveTextContent('local');
    });

    it('should mark other users as remote', () => {
      render(<VideoGrid {...defaultProps} currentUserId="user-1" />);

      const isLocalElements = screen.getAllByTestId('is-local');
      expect(isLocalElements[1]).toHaveTextContent('remote');
      expect(isLocalElements[2]).toHaveTextContent('remote');
    });
  });

  describe('host controls', () => {
    it('should show kick button for host on other users', () => {
      render(<VideoGrid {...defaultProps} isHost={true} />);

      // Should not have kick button for self (user-1)
      expect(screen.queryByTestId('kick-user-1')).not.toBeInTheDocument();

      // Should have kick buttons for other users
      expect(screen.getByTestId('kick-user-2')).toBeInTheDocument();
      expect(screen.getByTestId('kick-user-3')).toBeInTheDocument();
    });

    it('should not show kick button for non-host', () => {
      render(<VideoGrid {...defaultProps} isHost={false} />);

      expect(screen.queryByTestId('kick-user-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('kick-user-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('kick-user-3')).not.toBeInTheDocument();
    });

    it('should call onKick with user identity when kick button clicked', () => {
      const onKick = vi.fn();
      render(<VideoGrid {...defaultProps} onKick={onKick} />);

      fireEvent.click(screen.getByTestId('kick-user-2'));
      expect(onKick).toHaveBeenCalledWith('user-2');
    });

    it('should not show kick button for current user even if host', () => {
      render(
        <VideoGrid {...defaultProps} isHost={true} currentUserId="user-1" />,
      );

      expect(screen.queryByTestId('kick-user-1')).not.toBeInTheDocument();
    });
  });

  describe('grid layout', () => {
    it('should render participants in a grid', () => {
      const { container } = render(<VideoGrid {...defaultProps} />);

      const grid = container.querySelector('.grid');
      expect(grid).toBeInTheDocument();
    });

    it('should maintain aspect ratio for video tiles', () => {
      const { container } = render(<VideoGrid {...defaultProps} />);

      const videoTiles = container.querySelectorAll('.aspect-video');
      expect(videoTiles).toHaveLength(3);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined currentUserId', () => {
      const participantsWithoutLocal = [
        createMockParticipant('user-1', 'John Doe', false),
        createMockParticipant('user-2', 'Jane Smith', false),
        createMockParticipant('user-3', 'Bob Wilson', false),
      ];

      render(
        <VideoGrid
          {...defaultProps}
          participants={participantsWithoutLocal}
          currentUserId={undefined}
        />,
      );

      // All should be remote since no current user
      const isLocalElements = screen.getAllByTestId('is-local');
      isLocalElements.forEach((el) => {
        expect(el).toHaveTextContent('remote');
      });
    });

    it('should handle undefined onKick', () => {
      render(<VideoGrid {...defaultProps} onKick={undefined} isHost={true} />);

      // Should not crash, kick buttons should not be shown
      expect(screen.queryByTestId('kick-user-2')).not.toBeInTheDocument();
    });

    it('should handle single participant', () => {
      render(
        <VideoGrid {...defaultProps} participants={[mockParticipants[0]]} />,
      );

      expect(screen.getByTestId('participant-user-1')).toBeInTheDocument();
    });

    it('should handle many participants', () => {
      const manyParticipants = Array.from({ length: 20 }, (_, i) =>
        createMockParticipant(`user-${i}`, `User ${i}`),
      );

      render(<VideoGrid {...defaultProps} participants={manyParticipants} />);

      expect(screen.getAllByTestId(/participant-user-/)).toHaveLength(20);
    });
  });
});
