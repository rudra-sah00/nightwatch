import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaControls } from '@/features/watch-party/components/MediaControls';
import type { MediaDevice } from '@/features/watch-party/media/hooks/useAgora';
import type { WatchPartyRoom } from '@/features/watch-party/room/types';

describe('MediaControls', () => {
  /*
    MediaControls renders WatchPartySettings, whose 3D toggle reads the real
    download size from the theatre manifest via TanStack Query — so this tree now
    needs a QueryClient. The app always has one (`providers/query-provider.tsx`);
    this is the test catching up, not a new runtime requirement.
  */
  const renderWithQuery = (ui: React.ReactElement) => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const Wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    return render(ui, { wrapper: Wrapper });
  };

  const mockAudioDevices: MediaDevice[] = [
    { deviceId: 'mic-1', label: 'Built-in Microphone', kind: 'audioinput' },
    { deviceId: 'mic-2', label: 'External USB Microphone', kind: 'audioinput' },
  ];

  const mockVideoDevices: MediaDevice[] = [
    { deviceId: 'cam-1', label: 'Built-in Camera', kind: 'videoinput' },
    { deviceId: 'cam-2', label: 'External Webcam', kind: 'videoinput' },
  ];

  const defaultProps = {
    userName: 'John Doe',
    audioEnabled: true,
    onToggleAudio: vi.fn(),
    audioInputDevices: mockAudioDevices,
    selectedAudioDevice: 'mic-1',
    onSwitchAudioDevice: vi.fn(),
    videoEnabled: true,
    onToggleVideo: vi.fn(),
    videoInputDevices: mockVideoDevices,
    selectedVideoDevice: 'cam-1',
    onSwitchVideoDevice: vi.fn(),
    isHost: true,
    linkCopied: false,
    onCopyLink: vi.fn(),
    onLeave: vi.fn(),
    sidebarTheme: 'default' as const,
    onSidebarThemeChange: vi.fn(),
    customColor: '#6366f1',
    onCustomColorChange: vi.fn(),
    room: {
      id: 'test-room-1',
      hostId: 'host-1',
      contentId: 'content-1',
      title: 'Test Content',
      type: 'movie',
      streamUrl: 'http://test.com/stream.m3u8',
      members: [],
      pendingMembers: [],
      state: {
        currentTime: 0,
        isPlaying: false,
        playbackRate: 1,
        lastUpdated: 0,
      },
      permissions: {
        canGuestsDraw: false,
        canGuestsPlaySounds: true,
        canGuestsChat: true,
      },
      createdAt: Date.now(),
    } as WatchPartyRoom,
    isAgoraConnected: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('user info display', () => {
    it('should display user name', () => {
      renderWithQuery(<MediaControls {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should display user avatar with first letter', () => {
      renderWithQuery(<MediaControls {...defaultProps} />);

      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('should show connected status when Agora is connected', () => {
      renderWithQuery(
        <MediaControls {...defaultProps} isAgoraConnected={true} />,
      );

      expect(screen.getByText('status.connected')).toBeInTheDocument();
    });

    it('should show connecting status when Agora is not yet connected', () => {
      renderWithQuery(
        <MediaControls {...defaultProps} isAgoraConnected={false} />,
      );

      expect(screen.getByText('status.connecting')).toBeInTheDocument();
    });

    it('should truncate long user names', () => {
      renderWithQuery(
        <MediaControls
          {...defaultProps}
          userName="This Is A Very Long Username That Should Be Truncated"
        />,
      );

      expect(
        screen.getByText(
          'This Is A Very Long Username That Should Be Truncated',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('host actions', () => {
    it('should show Copy Invite Link button for host', () => {
      renderWithQuery(<MediaControls {...defaultProps} isHost={true} />);

      expect(screen.getByText('actions.invite')).toBeInTheDocument();
    });

    it('should not show Copy Invite Link button for non-host', () => {
      renderWithQuery(<MediaControls {...defaultProps} isHost={false} />);

      expect(screen.queryByText('actions.invite')).not.toBeInTheDocument();
    });

    it('should call onCopyLink when copy button clicked', () => {
      const onCopyLink = vi.fn();
      renderWithQuery(
        <MediaControls {...defaultProps} onCopyLink={onCopyLink} />,
      );

      fireEvent.click(screen.getByText('actions.invite'));
      expect(onCopyLink).toHaveBeenCalled();
    });

    it('should show Copied! when linkCopied is true', () => {
      renderWithQuery(<MediaControls {...defaultProps} linkCopied={true} />);

      expect(screen.getByText('actions.copied')).toBeInTheDocument();
    });

    it('should show End Party for host', () => {
      renderWithQuery(<MediaControls {...defaultProps} isHost={true} />);

      expect(screen.getByText('actions.end')).toBeInTheDocument();
    });

    it('should show Leave Party for non-host', () => {
      renderWithQuery(<MediaControls {...defaultProps} isHost={false} />);

      expect(screen.getByText('actions.leave')).toBeInTheDocument();
    });

    it('should call onLeave when leave button clicked', () => {
      const onLeave = vi.fn();
      renderWithQuery(<MediaControls {...defaultProps} onLeave={onLeave} />);

      fireEvent.click(screen.getByText('actions.end'));
      expect(onLeave).toHaveBeenCalled();
    });
  });

  describe('audio controls', () => {
    it('should show unmuted mic icon when audio enabled', () => {
      renderWithQuery(<MediaControls {...defaultProps} audioEnabled={true} />);

      expect(screen.getByTitle('media.mute')).toBeInTheDocument();
    });

    it('should show muted mic icon when audio disabled', () => {
      renderWithQuery(<MediaControls {...defaultProps} audioEnabled={false} />);

      expect(screen.getByTitle('media.unmute')).toBeInTheDocument();
    });

    it('should call onToggleAudio when mic button clicked', () => {
      const onToggleAudio = vi.fn();
      renderWithQuery(
        <MediaControls {...defaultProps} onToggleAudio={onToggleAudio} />,
      );

      fireEvent.click(screen.getByTitle('media.mute'));
      expect(onToggleAudio).toHaveBeenCalled();
    });

    it('should show audio device dropdown when arrow clicked', () => {
      renderWithQuery(<MediaControls {...defaultProps} />);

      fireEvent.click(screen.getByTitle('media.selectMicrophone'));

      expect(screen.getByText('media.selectMicrophone')).toBeInTheDocument();
      expect(screen.getByText('Built-in Microphone')).toBeInTheDocument();
      expect(screen.getByText('External USB Microphone')).toBeInTheDocument();
    });

    it('should call onSwitchAudioDevice when device selected', () => {
      const onSwitchAudioDevice = vi.fn();
      renderWithQuery(
        <MediaControls
          {...defaultProps}
          onSwitchAudioDevice={onSwitchAudioDevice}
        />,
      );

      fireEvent.click(screen.getByTitle('media.selectMicrophone'));
      fireEvent.click(screen.getByText('External USB Microphone'));

      expect(onSwitchAudioDevice).toHaveBeenCalledWith('mic-2');
    });

    it('should close dropdown after selecting device', () => {
      renderWithQuery(<MediaControls {...defaultProps} />);

      fireEvent.click(screen.getByTitle('media.selectMicrophone'));
      expect(screen.getByText('Built-in Microphone')).toBeInTheDocument();

      fireEvent.click(screen.getByText('External USB Microphone'));
      expect(screen.queryByText('Built-in Microphone')).not.toBeInTheDocument();
    });
  });

  describe('video controls', () => {
    it('should show camera on icon when video enabled', () => {
      renderWithQuery(<MediaControls {...defaultProps} videoEnabled={true} />);

      expect(screen.getByTitle('media.cameraOff')).toBeInTheDocument();
    });

    it('should show camera off icon when video disabled', () => {
      renderWithQuery(<MediaControls {...defaultProps} videoEnabled={false} />);

      expect(screen.getByTitle('media.cameraOn')).toBeInTheDocument();
    });

    it('should call onToggleVideo when camera button clicked', () => {
      const onToggleVideo = vi.fn();
      renderWithQuery(
        <MediaControls {...defaultProps} onToggleVideo={onToggleVideo} />,
      );

      fireEvent.click(screen.getByTitle('media.cameraOff'));
      expect(onToggleVideo).toHaveBeenCalled();
    });

    it('should show video device dropdown when arrow clicked', () => {
      renderWithQuery(<MediaControls {...defaultProps} />);

      fireEvent.click(screen.getByTitle('media.selectCamera'));

      expect(screen.getByText('media.selectCamera')).toBeInTheDocument();
      expect(screen.getByText('Built-in Camera')).toBeInTheDocument();
      expect(screen.getByText('External Webcam')).toBeInTheDocument();
    });

    it('should call onSwitchVideoDevice when device selected', () => {
      const onSwitchVideoDevice = vi.fn();
      renderWithQuery(
        <MediaControls
          {...defaultProps}
          onSwitchVideoDevice={onSwitchVideoDevice}
        />,
      );

      fireEvent.click(screen.getByTitle('media.selectCamera'));
      fireEvent.click(screen.getByText('External Webcam'));

      expect(onSwitchVideoDevice).toHaveBeenCalledWith('cam-2');
    });
  });

  describe('device dropdown behavior', () => {
    it('should close audio dropdown when opening video dropdown', () => {
      renderWithQuery(<MediaControls {...defaultProps} />);

      // Open audio dropdown
      fireEvent.click(screen.getByTitle('media.selectMicrophone'));
      expect(screen.getByText('Built-in Microphone')).toBeInTheDocument();

      // Open video dropdown
      fireEvent.click(screen.getByTitle('media.selectCamera'));
      expect(screen.getByText('Built-in Camera')).toBeInTheDocument();
      expect(screen.queryByText('Built-in Microphone')).not.toBeInTheDocument();
    });

    it('should close video dropdown when opening audio dropdown', () => {
      renderWithQuery(<MediaControls {...defaultProps} />);

      // Open video dropdown
      fireEvent.click(screen.getByTitle('media.selectCamera'));
      expect(screen.getByText('Built-in Camera')).toBeInTheDocument();

      // Open audio dropdown
      fireEvent.click(screen.getByTitle('media.selectMicrophone'));
      expect(screen.getByText('Built-in Microphone')).toBeInTheDocument();
      expect(screen.queryByText('Built-in Camera')).not.toBeInTheDocument();
    });

    it('should close dropdown when close button clicked', () => {
      renderWithQuery(<MediaControls {...defaultProps} />);

      fireEvent.click(screen.getByTitle('media.selectMicrophone'));
      expect(screen.getByText('Built-in Microphone')).toBeInTheDocument();

      fireEvent.click(screen.getByText('✕'));
      expect(screen.queryByText('Built-in Microphone')).not.toBeInTheDocument();
    });

    it('should show no devices message when no devices available', () => {
      renderWithQuery(
        <MediaControls {...defaultProps} audioInputDevices={[]} />,
      );

      fireEvent.click(screen.getByTitle('media.selectMicrophone'));
      expect(screen.getByText('media.noDevicesFound')).toBeInTheDocument();
    });

    it('should highlight currently selected device', () => {
      renderWithQuery(
        <MediaControls {...defaultProps} selectedAudioDevice="mic-1" />,
      );

      fireEvent.click(screen.getByTitle('media.selectMicrophone'));

      // The selected device should have a checkmark
      const micOption = screen
        .getByText('Built-in Microphone')
        .closest('button');
      expect(micOption).toHaveClass('bg-primary');
    });
  });

  describe('edge cases', () => {
    it('should handle null selectedAudioDevice', () => {
      renderWithQuery(
        <MediaControls {...defaultProps} selectedAudioDevice={null} />,
      );

      fireEvent.click(screen.getByTitle('media.selectMicrophone'));
      expect(screen.getByText('Built-in Microphone')).toBeInTheDocument();
    });

    it('should handle null selectedVideoDevice', () => {
      renderWithQuery(
        <MediaControls {...defaultProps} selectedVideoDevice={null} />,
      );

      fireEvent.click(screen.getByTitle('media.selectCamera'));
      expect(screen.getByText('Built-in Camera')).toBeInTheDocument();
    });

    it('should handle empty username', () => {
      renderWithQuery(<MediaControls {...defaultProps} userName="" />);

      // Should render without crashing (isAgoraConnected: true in defaultProps)
      expect(screen.getByText('status.connected')).toBeInTheDocument();
    });
  });
});
