import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WatchPartyLobby } from '@/features/watch-party/components/WatchPartyLobby';
import type { RoomPreview } from '@/features/watch-party/types';
import type { User } from '@/types';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the Captcha component
vi.mock('@/components/ui/captcha', () => ({
  Captcha: ({ onVerify }: { onVerify: (token: string) => void }) => (
    <button
      data-testid="captcha-button"
      type="button"
      onClick={() => onVerify('test-captcha-token')}
    >
      Complete Captcha
    </button>
  ),
}));

describe('WatchPartyLobby', () => {
  const mockRoomPreview: RoomPreview = {
    id: 'room-1',
    title: 'Breaking Bad',
    type: 'series',
    season: 1,
    episode: 3,
    hostName: 'Walter White',
    memberCount: 3,
    maxMembers: 10,
    isFull: false,
  };

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    username: 'testuser',
    profilePhoto: null,
    sessionId: 'session-123',
    createdAt: new Date().toISOString(),
  };

  const defaultProps = {
    roomPreview: mockRoomPreview,
    isLoading: false,
    error: null,
    errorCode: null,
    requestStatus: 'idle' as const,
    roomNotFound: false,
    user: mockUser,
    guestName: '',
    onGuestNameChange: vi.fn(),
    onJoin: vi.fn(),
    onLeave: vi.fn(),
    onCancelRequest: vi.fn(),
    captchaToken: null,
    onCaptchaVerify: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('should show loading spinner when loading without room preview', () => {
      render(
        <WatchPartyLobby
          {...defaultProps}
          isLoading={true}
          roomPreview={null}
          roomNotFound={false}
        />,
      );

      // Should have a loading spinner (Loader2 component)
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('room not found state', () => {
    it('should show room not found message', () => {
      render(<WatchPartyLobby {...defaultProps} roomNotFound={true} />);

      expect(screen.getByText('Room Not Found')).toBeInTheDocument();
      expect(
        screen.getByText("This watch party room doesn't exist or has ended."),
      ).toBeInTheDocument();
    });

    it('should navigate to home when Go Home clicked', () => {
      render(<WatchPartyLobby {...defaultProps} roomNotFound={true} />);

      fireEvent.click(screen.getByText('Go Home'));
      expect(mockPush).toHaveBeenCalledWith('/home');
    });
  });

  describe('pending request state', () => {
    it('should show waiting for approval message', () => {
      render(<WatchPartyLobby {...defaultProps} requestStatus="pending" />);

      expect(screen.getByText('Waiting for Host Approval')).toBeInTheDocument();
      expect(
        screen.getByText('The host has been notified of your request.'),
      ).toBeInTheDocument();
    });

    it('should show cancel request button', () => {
      render(<WatchPartyLobby {...defaultProps} requestStatus="pending" />);

      expect(screen.getByText('Cancel Request')).toBeInTheDocument();
    });

    it('should call onCancelRequest when cancel is clicked', () => {
      const onCancelRequest = vi.fn();
      render(
        <WatchPartyLobby
          {...defaultProps}
          requestStatus="pending"
          onCancelRequest={onCancelRequest}
        />,
      );

      fireEvent.click(screen.getByText('Cancel Request'));
      expect(onCancelRequest).toHaveBeenCalled();
    });

    it('should fallback to onLeave if onCancelRequest is not provided', () => {
      const onLeave = vi.fn();
      render(
        <WatchPartyLobby
          {...defaultProps}
          requestStatus="pending"
          onCancelRequest={undefined}
          onLeave={onLeave}
        />,
      );

      fireEvent.click(screen.getByText('Cancel Request'));
      expect(onLeave).toHaveBeenCalled();
    });
  });

  describe('rejected request state', () => {
    it('should show rejection message', () => {
      render(<WatchPartyLobby {...defaultProps} requestStatus="rejected" />);

      expect(screen.getByText('Request Rejected')).toBeInTheDocument();
      expect(
        screen.getByText('The host has declined your request to join.'),
      ).toBeInTheDocument();
    });

    it('should navigate to home when Go Home is clicked', async () => {
      render(<WatchPartyLobby {...defaultProps} requestStatus="rejected" />);

      const goHomeButton = screen.getByRole('button', { name: /go home/i });
      await userEvent.click(goHomeButton);

      expect(mockPush).toHaveBeenCalledWith('/home');
    });
  });

  describe('room preview state', () => {
    it('should show room title and info', () => {
      render(<WatchPartyLobby {...defaultProps} />);

      expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
      expect(screen.getByText('Season 1 Episode 3')).toBeInTheDocument();
      expect(screen.getByText('Hosted by Walter White')).toBeInTheDocument();
      expect(screen.getByText('3/10 watching')).toBeInTheDocument();
    });

    it('should show Request to Join button for authenticated user', () => {
      render(<WatchPartyLobby {...defaultProps} />);

      expect(screen.getByText('Request to Join')).toBeInTheDocument();
    });

    it('should call onJoin when join button is clicked', () => {
      const onJoin = vi.fn();
      render(<WatchPartyLobby {...defaultProps} onJoin={onJoin} />);

      fireEvent.click(screen.getByText('Request to Join'));
      expect(onJoin).toHaveBeenCalled();
    });

    it('should navigate to home when Cancel is clicked', () => {
      render(<WatchPartyLobby {...defaultProps} />);

      fireEvent.click(screen.getByText('Cancel'));
      expect(mockPush).toHaveBeenCalledWith('/home');
    });
  });

  describe('full room state', () => {
    it('should show room full message', () => {
      render(
        <WatchPartyLobby
          {...defaultProps}
          roomPreview={{ ...mockRoomPreview, isFull: true }}
        />,
      );

      expect(
        screen.getByText(
          'This watch party is currently full. Please try again later.',
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('Room Full')).toBeInTheDocument();
    });

    it('should disable join button when room is full', () => {
      render(
        <WatchPartyLobby
          {...defaultProps}
          roomPreview={{ ...mockRoomPreview, isFull: true }}
        />,
      );

      const joinButton = screen.getByText('Room Full');
      expect(joinButton.closest('button')).toBeDisabled();
    });

    it('should show (Full) indicator in member count', () => {
      render(
        <WatchPartyLobby
          {...defaultProps}
          roomPreview={{ ...mockRoomPreview, isFull: true }}
        />,
      );

      expect(screen.getByText('(Full)')).toBeInTheDocument();
    });
  });

  describe('guest user flow', () => {
    it('should show guest name input when not authenticated', () => {
      render(<WatchPartyLobby {...defaultProps} user={null} />);

      expect(screen.getByLabelText('Your Name')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Enter your display name'),
      ).toBeInTheDocument();
    });

    it('should call onGuestNameChange when name is entered', () => {
      const onGuestNameChange = vi.fn();
      render(
        <WatchPartyLobby
          {...defaultProps}
          user={null}
          onGuestNameChange={onGuestNameChange}
        />,
      );

      const input = screen.getByPlaceholderText('Enter your display name');
      fireEvent.change(input, { target: { value: 'John' } });

      expect(onGuestNameChange).toHaveBeenCalledWith('John');
    });

    it('should show captcha when guest name is entered', () => {
      render(
        <WatchPartyLobby {...defaultProps} user={null} guestName="John Doe" />,
      );

      expect(screen.getByTestId('captcha-button')).toBeInTheDocument();
    });

    it('should not show captcha when guest name is empty', () => {
      render(<WatchPartyLobby {...defaultProps} user={null} guestName="" />);

      expect(screen.queryByTestId('captcha-button')).not.toBeInTheDocument();
    });

    it('should show verified message when captcha is complete', () => {
      render(
        <WatchPartyLobby
          {...defaultProps}
          user={null}
          guestName="John Doe"
          captchaToken="verified-token"
        />,
      );

      expect(screen.getByText('✓ Verified')).toBeInTheDocument();
    });

    it('should disable join for guest without name', () => {
      render(<WatchPartyLobby {...defaultProps} user={null} guestName="" />);

      const joinButton = screen.getByText('Request to Join');
      expect(joinButton.closest('button')).toBeDisabled();
    });

    it('should disable join for guest without captcha', () => {
      render(
        <WatchPartyLobby
          {...defaultProps}
          user={null}
          guestName="John Doe"
          captchaToken={null}
        />,
      );

      const joinButton = screen.getByText('Request to Join');
      expect(joinButton.closest('button')).toBeDisabled();
    });

    it('should enable join for guest with name and captcha', () => {
      render(
        <WatchPartyLobby
          {...defaultProps}
          user={null}
          guestName="John Doe"
          captchaToken="verified-token"
        />,
      );

      const joinButton = screen.getByText('Request to Join');
      expect(joinButton.closest('button')).not.toBeDisabled();
    });
  });

  describe('loading state during join', () => {
    it('should show loading spinner when joining', () => {
      render(<WatchPartyLobby {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Requesting...')).toBeInTheDocument();
    });

    it('should disable join button when loading', () => {
      render(<WatchPartyLobby {...defaultProps} isLoading={true} />);

      const button = screen.getByText('Requesting...').closest('button');
      expect(button).toBeDisabled();
    });
  });

  describe('error display', () => {
    it('should show error message', () => {
      render(<WatchPartyLobby {...defaultProps} error="Failed to join room" />);

      expect(screen.getByText('Failed to join room')).toBeInTheDocument();
    });

    it('should show error code when provided', () => {
      render(
        <WatchPartyLobby
          {...defaultProps}
          error="Failed to join"
          errorCode="ROOM_FULL"
        />,
      );

      expect(screen.getByText('Code: ROOM_FULL')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle room without season/episode info', () => {
      const simpleRoom: RoomPreview = {
        ...mockRoomPreview,
        season: undefined,
        episode: undefined,
      };

      render(<WatchPartyLobby {...defaultProps} roomPreview={simpleRoom} />);

      expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
      expect(screen.queryByText(/Season/)).not.toBeInTheDocument();
    });

    it('should use default maxMembers when not provided', () => {
      const roomWithoutMax: RoomPreview = {
        ...mockRoomPreview,
        maxMembers: undefined,
      };

      render(
        <WatchPartyLobby {...defaultProps} roomPreview={roomWithoutMax} />,
      );

      expect(screen.getByText('3/10 watching')).toBeInTheDocument();
    });

    it('should return null when no room preview and not loading/not found', () => {
      const { container } = render(
        <WatchPartyLobby
          {...defaultProps}
          roomPreview={null}
          isLoading={false}
          roomNotFound={false}
          requestStatus="idle"
        />,
      );

      expect(container.firstChild).toBeNull();
    });
  });
});
