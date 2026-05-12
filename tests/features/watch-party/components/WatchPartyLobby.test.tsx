import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WatchPartyLobby } from '@/features/watch-party/components/WatchPartyLobby';
import type { RoomPreview } from '@/features/watch-party/room/types';
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
  };

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    username: 'testuser',
    profilePhoto: null,
    preferredServer: 's1' as 's1' | 's1',
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

      // Should have a loading message
      expect(screen.getByText('loadingRoom')).toBeInTheDocument();
    });
  });

  describe('room not found state', () => {
    it('should show room not found message', () => {
      render(<WatchPartyLobby {...defaultProps} roomNotFound={true} />);

      expect(screen.getByText('roomNotFound')).toBeInTheDocument();
      expect(screen.getByText('roomNotFoundDesc')).toBeInTheDocument();
    });

    it('should navigate to home when Go Home clicked', () => {
      render(<WatchPartyLobby {...defaultProps} roomNotFound={true} />);

      fireEvent.click(screen.getByText('backToHome'));
      expect(mockPush).toHaveBeenCalledWith('/home');
    });
  });

  describe('pending request state', () => {
    it('should show waiting for approval message', () => {
      render(<WatchPartyLobby {...defaultProps} requestStatus="pending" />);

      expect(screen.getByText('waitingForApproval')).toBeInTheDocument();
      expect(screen.getByText('waitingForApprovalDesc')).toBeInTheDocument();
    });

    it('should show cancel request button', () => {
      render(<WatchPartyLobby {...defaultProps} requestStatus="pending" />);

      expect(screen.getByText('cancelRequest')).toBeInTheDocument();
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

      fireEvent.click(screen.getByText('cancelRequest'));
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

      fireEvent.click(screen.getByText('cancelRequest'));
      expect(onLeave).toHaveBeenCalled();
    });
  });

  describe('rejected request state', () => {
    it('should show rejection message', () => {
      render(<WatchPartyLobby {...defaultProps} requestStatus="rejected" />);

      expect(screen.getByText('requestDeclined')).toBeInTheDocument();
      expect(screen.getByText('requestDeclinedDesc')).toBeInTheDocument();
    });

    it('should navigate to home when Go Home is clicked', async () => {
      render(<WatchPartyLobby {...defaultProps} requestStatus="rejected" />);

      const goHomeButton = screen.getByRole('button', { name: /goHome/i });
      await userEvent.click(goHomeButton);

      expect(mockPush).toHaveBeenCalledWith('/home');
    });
  });

  describe('room preview state', () => {
    it('should show room title and info', () => {
      render(<WatchPartyLobby {...defaultProps} />);

      expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
      expect(screen.getByText('seasonEpisode')).toBeInTheDocument();
      expect(screen.getByText('Walter White')).toBeInTheDocument();
      expect(screen.getByText('watching')).toBeInTheDocument();
    });

    it('should show Request to Join button for authenticated user', () => {
      render(<WatchPartyLobby {...defaultProps} />);

      expect(screen.getByText('requestToJoin')).toBeInTheDocument();
    });

    it('should call onJoin when join button is clicked', () => {
      const onJoin = vi.fn();
      render(<WatchPartyLobby {...defaultProps} onJoin={onJoin} />);

      fireEvent.click(screen.getByText('requestToJoin'));
      expect(onJoin).toHaveBeenCalled();
    });

    it('should navigate to home when Cancel is clicked', () => {
      render(<WatchPartyLobby {...defaultProps} />);

      fireEvent.click(screen.getByText('cancel'));
      expect(mockPush).toHaveBeenCalledWith('/home');
    });
  });

  describe('guest user flow', () => {
    it('should show guest name input when not authenticated', () => {
      render(<WatchPartyLobby {...defaultProps} user={null} />);

      expect(
        screen.getByPlaceholderText('namePlaceholder'),
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

      const input = screen.getByPlaceholderText('namePlaceholder');
      fireEvent.change(input, { target: { value: 'John' } });

      expect(onGuestNameChange).toHaveBeenCalledWith('John');
    });

    it('should show captcha when guest name is entered', () => {
      render(
        <WatchPartyLobby {...defaultProps} user={null} guestName="John Doe" />,
      );

      expect(screen.getByTestId('captcha-button')).toBeInTheDocument();
    });

    it('should show captcha even when guest name is empty', () => {
      render(<WatchPartyLobby {...defaultProps} user={null} guestName="" />);

      expect(screen.getByTestId('captcha-button')).toBeInTheDocument();
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

      // Rendered as <Check icon /> + " Verified" inside a <p> element
      expect(
        screen.getByText(
          (_, el) =>
            el?.tagName === 'P' &&
            (el?.textContent?.includes('verified') ?? false),
        ),
      ).toBeInTheDocument();
    });

    it('should disable join for guest without name', () => {
      render(<WatchPartyLobby {...defaultProps} user={null} guestName="" />);

      const joinButton = screen.getByText('requestToJoin');
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

      const joinButton = screen.getByText('requestToJoin');
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

      const joinButton = screen.getByText('requestToJoin');
      expect(joinButton.closest('button')).not.toBeDisabled();
    });
  });

  describe('loading state during join', () => {
    it('should show loading spinner when joining', () => {
      render(<WatchPartyLobby {...defaultProps} isLoading={true} />);

      expect(screen.getByText('requesting')).toBeInTheDocument();
    });

    it('should disable join button when loading', () => {
      render(<WatchPartyLobby {...defaultProps} isLoading={true} />);

      const button = screen.getByText('requesting').closest('button');
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

      expect(screen.getByText('errorCode')).toBeInTheDocument();
    });
  });

  describe('mobile block', () => {
    it('should show Desktop Only screen when isMobile is true', () => {
      render(<WatchPartyLobby {...defaultProps} isMobile={true} />);

      expect(screen.getByText('desktopOnly')).toBeInTheDocument();
      expect(screen.getByText(/desktopOnlyDesc/i)).toBeInTheDocument();
    });

    it('should show Go Home button on mobile block screen', () => {
      render(<WatchPartyLobby {...defaultProps} isMobile={true} />);

      expect(
        screen.getByRole('button', { name: /goHome/i }),
      ).toBeInTheDocument();
    });

    it('should navigate to home when Go Home clicked on mobile block', () => {
      render(<WatchPartyLobby {...defaultProps} isMobile={true} />);

      fireEvent.click(screen.getByRole('button', { name: /goHome/i }));
      expect(mockPush).toHaveBeenCalledWith('/home');
    });

    it('should not show room preview content on mobile', () => {
      render(<WatchPartyLobby {...defaultProps} isMobile={true} />);

      expect(screen.queryByText('requestToJoin')).not.toBeInTheDocument();
      expect(screen.queryByText('Breaking Bad')).not.toBeInTheDocument();
    });

    it('should render normally when isMobile is false', () => {
      render(<WatchPartyLobby {...defaultProps} isMobile={false} />);

      expect(screen.queryByText('desktopOnly')).not.toBeInTheDocument();
      expect(screen.getByText('Breaking Bad')).toBeInTheDocument();
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
      expect(screen.queryByText('seasonEpisode')).not.toBeInTheDocument();
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
