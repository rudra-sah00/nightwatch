import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WatchPartySidebar } from '@/features/watch-party/components/WatchPartySidebar';
import type { ChatMessage, WatchPartyRoom } from '@/features/watch-party/types';

// Mock Agora hooks to avoid complex Agora setup
const mockToggleAudio = vi.fn();
const mockToggleVideo = vi.fn();
const mockSwitchAudioDevice = vi.fn();
const mockSwitchVideoDevice = vi.fn();

vi.mock('@/features/watch-party/hooks/useAgoraToken', () => ({
  useAgoraToken: vi.fn(() => ({
    token: 'mock-token',
    appId: 'mock-app-id',
    channel: 'mock-channel',
    uid: 1,
    isLoading: false,
    error: null,
  })),
}));

vi.mock('@/features/watch-party/hooks/useAgora', () => ({
  useAgora: vi.fn(() => ({
    participants: [],
    audioEnabled: true,
    videoEnabled: false,
    toggleAudio: mockToggleAudio,
    toggleVideo: mockToggleVideo,
    audioInputDevices: [],
    videoInputDevices: [],
    selectedAudioDevice: undefined,
    selectedVideoDevice: undefined,
    switchAudioDevice: mockSwitchAudioDevice,
    switchVideoDevice: mockSwitchVideoDevice,
  })),
}));

// Mock child components to isolate WatchPartySidebar testing
vi.mock('@/features/watch-party/components/SidebarTabs', () => ({
  SidebarTabs: ({
    activeTab,
    onTabChange,
    participantCount,
  }: {
    activeTab: 'chat' | 'participants';
    onTabChange: (tab: 'chat' | 'participants') => void;
    participantCount: number;
  }) => (
    <div data-testid="sidebar-tabs">
      <button
        type="button"
        data-testid="tab-participants"
        data-active={activeTab === 'participants'}
        onClick={() => onTabChange('participants')}
      >
        Participants ({participantCount})
      </button>
      <button
        type="button"
        data-testid="tab-chat"
        data-active={activeTab === 'chat'}
        onClick={() => onTabChange('chat')}
      >
        Chat
      </button>
    </div>
  ),
}));

vi.mock('@/features/watch-party/components/PendingRequests', () => ({
  PendingRequests: ({
    pendingMembers,
    onApprove,
    onReject,
  }: {
    pendingMembers: Array<{ id: string; name: string }>;
    onApprove: (id: string) => void;
    onReject: (id: string) => void;
  }) => (
    <div data-testid="pending-requests">
      {pendingMembers.map((m) => (
        <div key={m.id} data-testid={`pending-${m.id}`}>
          {m.name}
          <button type="button" onClick={() => onApprove(m.id)}>
            Approve
          </button>
          <button type="button" onClick={() => onReject(m.id)}>
            Reject
          </button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/features/watch-party/components/VideoGrid', () => ({
  VideoGrid: ({
    currentUserId,
    isHost,
    onKick,
  }: {
    participants: unknown[];
    currentUserId?: string;
    isHost: boolean;
    onKick: (userId: string) => void;
  }) => (
    <div data-testid="video-grid">
      <span data-testid="current-user-id">{currentUserId}</span>
      <span data-testid="is-host">{isHost ? 'host' : 'member'}</span>
      <button
        type="button"
        data-testid="kick-button"
        onClick={() => onKick('user-2')}
      >
        Kick
      </button>
    </div>
  ),
}));

vi.mock('@/features/watch-party/components/WatchPartyChat', () => ({
  WatchPartyChat: ({
    messages,
    currentUserId,
    onSendMessage,
    typingUsers,
    onTypingStart,
    onTypingStop,
  }: {
    messages: ChatMessage[];
    currentUserId?: string;
    onSendMessage: (content: string) => void;
    typingUsers: Array<{ userId: string; userName: string }>;
    onTypingStart?: () => void;
    onTypingStop?: () => void;
  }) => (
    <div data-testid="watch-party-chat">
      <span data-testid="message-count">{messages.length}</span>
      <span data-testid="chat-current-user">{currentUserId}</span>
      <span data-testid="typing-count">{typingUsers?.length || 0}</span>
      <button
        type="button"
        data-testid="send-message"
        onClick={() => onSendMessage('test')}
      >
        Send
      </button>
      <button type="button" data-testid="typing-start" onClick={onTypingStart}>
        Type Start
      </button>
      <button type="button" data-testid="typing-stop" onClick={onTypingStop}>
        Type Stop
      </button>
    </div>
  ),
}));

vi.mock('@/features/watch-party/components/MediaControls', () => ({
  MediaControls: ({
    userName,
    isHost,
    onCopyLink,
    onLeave,
  }: {
    userName: string;
    audioEnabled: boolean;
    onToggleAudio: () => void;
    audioInputDevices: unknown[];
    selectedAudioDevice?: string;
    onSwitchAudioDevice: (deviceId: string) => void;
    videoEnabled: boolean;
    onToggleVideo: () => void;
    videoInputDevices: unknown[];
    selectedVideoDevice?: string;
    onSwitchVideoDevice: (deviceId: string) => void;
    isHost: boolean;
    linkCopied: boolean;
    onCopyLink: () => void;
    onLeave: () => void;
  }) => (
    <div data-testid="media-controls">
      <span data-testid="user-name">{userName}</span>
      <span data-testid="media-is-host">{isHost ? 'host' : 'member'}</span>
      <button type="button" data-testid="copy-link" onClick={onCopyLink}>
        Copy Link
      </button>
      <button type="button" data-testid="leave-button" onClick={onLeave}>
        Leave
      </button>
    </div>
  ),
}));

describe('WatchPartySidebar', () => {
  const mockRoom: WatchPartyRoom = {
    id: 'room-123',
    hostId: 'user-1',
    contentId: 'content-123',
    title: 'Test Room',
    type: 'movie',
    streamUrl: 'https://example.com/stream',
    members: [
      { id: 'user-1', name: 'Host User', isHost: true, joinedAt: Date.now() },
      {
        id: 'user-2',
        name: 'Member User',
        isHost: false,
        joinedAt: Date.now(),
      },
    ],
    pendingMembers: [],
    state: {
      currentTime: 0,
      isPlaying: false,
      playbackRate: 1,
      lastUpdated: Date.now(),
    },
    createdAt: Date.now(),
  };

  const mockMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      roomId: 'room-123',
      userId: 'user-1',
      userName: 'Host User',
      content: 'Hello',
      isSystem: false,
      timestamp: Date.now(),
    },
    {
      id: 'msg-2',
      roomId: 'room-123',
      userId: 'user-2',
      userName: 'Member User',
      content: 'Hi there',
      isSystem: false,
      timestamp: Date.now(),
    },
  ];

  const defaultProps = {
    room: mockRoom,
    messages: mockMessages,
    currentUserId: 'user-1',
    isHost: true,
    onKick: vi.fn(),
    onApprove: vi.fn(),
    onReject: vi.fn(),
    onCopyLink: vi.fn(),
    onLeave: vi.fn(),
    onSendMessage: vi.fn(),
    linkCopied: false,
    typingUsers: [],
    onTypingStart: vi.fn(),
    onTypingStop: vi.fn(),
  };

  describe('rendering', () => {
    it('should render sidebar tabs', () => {
      render(<WatchPartySidebar {...defaultProps} />);

      expect(screen.getByTestId('sidebar-tabs')).toBeInTheDocument();
    });

    it('should render video grid', () => {
      render(<WatchPartySidebar {...defaultProps} />);

      expect(screen.getByTestId('video-grid')).toBeInTheDocument();
    });

    it('should render chat component', () => {
      render(<WatchPartySidebar {...defaultProps} />);

      expect(screen.getByTestId('watch-party-chat')).toBeInTheDocument();
    });

    it('should render media controls', () => {
      render(<WatchPartySidebar {...defaultProps} />);

      expect(screen.getByTestId('media-controls')).toBeInTheDocument();
    });

    it('should display current user name in media controls', () => {
      render(<WatchPartySidebar {...defaultProps} currentUserId="user-1" />);

      expect(screen.getByTestId('user-name')).toHaveTextContent('Host User');
    });

    it('should fallback to "You" if current user not found in members', () => {
      render(
        <WatchPartySidebar {...defaultProps} currentUserId="unknown-user" />,
      );

      expect(screen.getByTestId('user-name')).toHaveTextContent('You');
    });
  });

  describe('tab switching', () => {
    it('should start on participants tab by default', () => {
      render(<WatchPartySidebar {...defaultProps} />);

      const participantsTab = screen.getByTestId('tab-participants');
      expect(participantsTab).toHaveAttribute('data-active', 'true');
    });

    it('should switch to chat tab when clicked', () => {
      render(<WatchPartySidebar {...defaultProps} />);

      fireEvent.click(screen.getByTestId('tab-chat'));

      const chatTab = screen.getByTestId('tab-chat');
      expect(chatTab).toHaveAttribute('data-active', 'true');
    });

    it('should switch back to participants tab', () => {
      render(<WatchPartySidebar {...defaultProps} />);

      fireEvent.click(screen.getByTestId('tab-chat'));
      fireEvent.click(screen.getByTestId('tab-participants'));

      const participantsTab = screen.getByTestId('tab-participants');
      expect(participantsTab).toHaveAttribute('data-active', 'true');
    });
  });

  describe('pending requests', () => {
    it('should show pending requests for host when there are pending members', () => {
      const roomWithPending: WatchPartyRoom = {
        ...mockRoom,
        pendingMembers: [
          {
            id: 'pending-1',
            name: 'Pending User',
            isHost: false,
            joinedAt: Date.now(),
          },
        ],
      };

      render(
        <WatchPartySidebar
          {...defaultProps}
          room={roomWithPending}
          isHost={true}
        />,
      );

      expect(screen.getByTestId('pending-requests')).toBeInTheDocument();
    });

    it('should not show pending requests for non-host', () => {
      const roomWithPending: WatchPartyRoom = {
        ...mockRoom,
        pendingMembers: [
          {
            id: 'pending-1',
            name: 'Pending User',
            isHost: false,
            joinedAt: Date.now(),
          },
        ],
      };

      render(
        <WatchPartySidebar
          {...defaultProps}
          room={roomWithPending}
          isHost={false}
        />,
      );

      expect(screen.queryByTestId('pending-requests')).not.toBeInTheDocument();
    });

    it('should not show pending requests when list is empty', () => {
      render(<WatchPartySidebar {...defaultProps} isHost={true} />);

      expect(screen.queryByTestId('pending-requests')).not.toBeInTheDocument();
    });

    it('should call onApprove when approve is clicked', () => {
      const onApprove = vi.fn();
      const roomWithPending: WatchPartyRoom = {
        ...mockRoom,
        pendingMembers: [
          {
            id: 'pending-1',
            name: 'Pending User',
            isHost: false,
            joinedAt: Date.now(),
          },
        ],
      };

      render(
        <WatchPartySidebar
          {...defaultProps}
          room={roomWithPending}
          isHost={true}
          onApprove={onApprove}
        />,
      );

      fireEvent.click(screen.getByText('Approve'));
      expect(onApprove).toHaveBeenCalledWith('pending-1');
    });

    it('should call onReject when reject is clicked', () => {
      const onReject = vi.fn();
      const roomWithPending: WatchPartyRoom = {
        ...mockRoom,
        pendingMembers: [
          {
            id: 'pending-1',
            name: 'Pending User',
            isHost: false,
            joinedAt: Date.now(),
          },
        ],
      };

      render(
        <WatchPartySidebar
          {...defaultProps}
          room={roomWithPending}
          isHost={true}
          onReject={onReject}
        />,
      );

      fireEvent.click(screen.getByText('Reject'));
      expect(onReject).toHaveBeenCalledWith('pending-1');
    });
  });

  describe('video grid interactions', () => {
    it('should pass isHost to video grid', () => {
      render(<WatchPartySidebar {...defaultProps} isHost={true} />);

      expect(screen.getByTestId('is-host')).toHaveTextContent('host');
    });

    it('should pass currentUserId to video grid', () => {
      render(<WatchPartySidebar {...defaultProps} currentUserId="user-1" />);

      expect(screen.getByTestId('current-user-id')).toHaveTextContent('user-1');
    });

    it('should call onKick when kick is triggered', () => {
      const onKick = vi.fn();
      render(<WatchPartySidebar {...defaultProps} onKick={onKick} />);

      fireEvent.click(screen.getByTestId('kick-button'));
      expect(onKick).toHaveBeenCalledWith('user-2');
    });
  });

  describe('chat interactions', () => {
    it('should pass messages to chat', () => {
      render(<WatchPartySidebar {...defaultProps} />);

      expect(screen.getByTestId('message-count')).toHaveTextContent('2');
    });

    it('should pass typing users to chat', () => {
      const typingUsers = [{ userId: 'user-2', userName: 'Member User' }];
      render(<WatchPartySidebar {...defaultProps} typingUsers={typingUsers} />);

      expect(screen.getByTestId('typing-count')).toHaveTextContent('1');
    });

    it('should call onSendMessage when message sent', () => {
      const onSendMessage = vi.fn();
      render(
        <WatchPartySidebar {...defaultProps} onSendMessage={onSendMessage} />,
      );

      fireEvent.click(screen.getByTestId('send-message'));
      expect(onSendMessage).toHaveBeenCalledWith('test');
    });

    it('should call onTypingStart when typing starts', () => {
      const onTypingStart = vi.fn();
      render(
        <WatchPartySidebar {...defaultProps} onTypingStart={onTypingStart} />,
      );

      fireEvent.click(screen.getByTestId('typing-start'));
      expect(onTypingStart).toHaveBeenCalled();
    });

    it('should call onTypingStop when typing stops', () => {
      const onTypingStop = vi.fn();
      render(
        <WatchPartySidebar {...defaultProps} onTypingStop={onTypingStop} />,
      );

      fireEvent.click(screen.getByTestId('typing-stop'));
      expect(onTypingStop).toHaveBeenCalled();
    });
  });

  describe('media controls interactions', () => {
    it('should call onCopyLink when copy link is clicked', () => {
      const onCopyLink = vi.fn();
      render(<WatchPartySidebar {...defaultProps} onCopyLink={onCopyLink} />);

      fireEvent.click(screen.getByTestId('copy-link'));
      expect(onCopyLink).toHaveBeenCalled();
    });

    it('should call onLeave when leave is clicked', () => {
      const onLeave = vi.fn();
      render(<WatchPartySidebar {...defaultProps} onLeave={onLeave} />);

      fireEvent.click(screen.getByTestId('leave-button'));
      expect(onLeave).toHaveBeenCalled();
    });

    it('should pass isHost to media controls', () => {
      render(<WatchPartySidebar {...defaultProps} isHost={true} />);

      expect(screen.getByTestId('media-is-host')).toHaveTextContent('host');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined currentUserId', () => {
      render(<WatchPartySidebar {...defaultProps} currentUserId={undefined} />);

      expect(screen.getByTestId('user-name')).toHaveTextContent('You');
    });

    it('should handle empty messages array', () => {
      render(<WatchPartySidebar {...defaultProps} messages={[]} />);

      expect(screen.getByTestId('message-count')).toHaveTextContent('0');
    });

    it('should handle undefined typingUsers', () => {
      render(<WatchPartySidebar {...defaultProps} typingUsers={undefined} />);

      expect(screen.getByTestId('typing-count')).toHaveTextContent('0');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <WatchPartySidebar {...defaultProps} className="custom-class" />,
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
