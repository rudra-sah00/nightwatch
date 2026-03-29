import {
  Check,
  ChevronUp,
  Copy,
  LogOut,
  Mic,
  MicOff,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMediaControls } from '../hooks/use-media-controls';
import type { MediaDevice } from '../media/hooks/useAgora';
import type { RTMMessage } from '../media/hooks/useAgoraRtm';
import type { WatchPartyRoom } from '../room/types';
import { WatchPartySettings } from './WatchPartySettings';

interface MediaControlsProps {
  // User info
  userName: string;

  // Audio controls
  audioEnabled: boolean;
  onToggleAudio: () => void;
  audioInputDevices: MediaDevice[];
  selectedAudioDevice: string | null;
  onSwitchAudioDevice: (deviceId: string) => void;

  // Video controls
  videoEnabled: boolean;
  onToggleVideo: () => void;
  videoInputDevices: MediaDevice[];
  selectedVideoDevice: string | null;
  onSwitchVideoDevice: (deviceId: string) => void;

  // Party actions
  isHost: boolean;
  linkCopied: boolean;
  onCopyLink: () => void;
  onLeave: () => void;
  room: WatchPartyRoom;
  /** Whether the floating chat overlay is enabled (shown when sidebar is closed) */
  floatingChatEnabled?: boolean;
  onToggleFloatingChat?: () => void;
  /** Actual Agora RTC connection state — used to show real status in the badge */
  isAgoraConnected?: boolean;
  rtmSendMessage?: (msg: RTMMessage) => void;
}

/**
 * Media controls footer for the sidebar
 * Handles mic/camera toggle, device selection, and party actions
 */
export function MediaControls({
  userName,
  audioEnabled,
  onToggleAudio,
  audioInputDevices,
  selectedAudioDevice,
  onSwitchAudioDevice,
  videoEnabled,
  onToggleVideo,
  videoInputDevices,
  selectedVideoDevice,
  onSwitchVideoDevice,
  isHost,
  linkCopied,
  onCopyLink,
  onLeave,
  room,
  floatingChatEnabled = false,
  onToggleFloatingChat,
  isAgoraConnected = false,
  rtmSendMessage,
}: MediaControlsProps) {
  const {
    showAudioDevices,
    setShowAudioDevices,
    showVideoDevices,
    setShowVideoDevices,
  } = useMediaControls();

  return (
    <div className="border-t-[4px] border-[#1a1a1a] bg-[#f5f0e8] relative z-[60] flex flex-col">
      {/* Party Actions - Copy Link & Leave/End Party */}
      <div className="p-4 flex gap-3 border-b-[4px] border-[#1a1a1a] bg-white">
        {/* Settings */}
        <WatchPartySettings
          room={room}
          isHost={isHost}
          floatingChatEnabled={floatingChatEnabled}
          onToggleFloatingChat={onToggleFloatingChat}
          rtmSendMessage={rtmSendMessage}
        />

        {isHost ? (
          <Button
            type="button"
            variant="neo-yellow"
            size="none"
            onClick={onCopyLink}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-xs md:text-sm"
          >
            {linkCopied ? (
              <Check aria-hidden="true" className="w-4 h-4 stroke-[3px]" />
            ) : (
              <Copy aria-hidden="true" className="w-4 h-4 stroke-[3px]" />
            )}
            <span className="hidden xl:inline">
              {linkCopied ? 'Copied' : 'Invite'}
            </span>
          </Button>
        ) : null}

        <Button
          type="button"
          variant="neo-red"
          size="none"
          onClick={onLeave}
          className={cn(
            'flex items-center justify-center gap-2 py-3 text-xs md:text-sm',
            isHost ? 'flex-1' : 'w-full',
          )}
        >
          <LogOut aria-hidden="true" className="w-4 h-4 stroke-[3px]" />
          <span className="hidden xl:inline">{isHost ? 'End' : 'Leave'}</span>
        </Button>
      </div>

      {/* Media Controls */}
      <div className="p-4 space-y-4">
        {/* User Info & Controls */}
        <div className="flex items-center justify-between bg-white border-[3px] border-[#1a1a1a] p-3 neo-shadow-sm">
          {/* User Avatar & Status */}
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-12 h-12 shrink-0 flex items-center justify-center border-[3px] border-[#1a1a1a] bg-[#ffcc00]">
              <span className="text-xl font-black font-headline text-[#1a1a1a] uppercase">
                {userName.charAt(0)}
              </span>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span
                className="text-sm font-black font-headline uppercase tracking-widest text-[#1a1a1a] truncate max-w-[100px]"
                title={userName}
              >
                {userName}
              </span>
              <span
                className={`text-[10px] sm:text-xs flex items-center gap-1.5 font-bold font-headline uppercase tracking-widest ${isAgoraConnected ? 'text-[#0055ff]' : 'text-[#e63b2e]'}`}
              >
                <span
                  className={cn(
                    'w-2.5 h-2.5 border-2 border-[#1a1a1a]',
                    isAgoraConnected
                      ? 'bg-[#0055ff] animate-pulse'
                      : 'bg-[#e63b2e] animate-[pulse_1.5s_ease-in-out_infinite]',
                  )}
                />
                {isAgoraConnected ? 'Connected' : 'Connecting…'}
              </span>
            </div>
          </div>

          {/* Media Buttons */}
          <div className="flex items-center gap-2">
            {/* Mic Button with Arrow */}
            <div className="flex items-center relative">
              {showAudioDevices ? (
                <DeviceDropdown
                  title="Select Microphone"
                  devices={audioInputDevices}
                  selectedDevice={selectedAudioDevice}
                  onSelect={(deviceId) => {
                    onSwitchAudioDevice(deviceId);
                    setShowAudioDevices(false);
                  }}
                  onClose={() => setShowAudioDevices(false)}
                />
              ) : null}
              <Button
                type="button"
                variant="none"
                size="none"
                onClick={onToggleAudio}
                className={cn(
                  'p-2.5 border-y-[3px] border-l-[3px] border-[#1a1a1a] transition-all active:translate-y-[2px]',
                  audioEnabled
                    ? 'bg-white text-[#1a1a1a] hover:bg-[#f5f0e8]'
                    : 'bg-[#e63b2e] text-white hover:bg-[#1a1a1a]',
                )}
                title={audioEnabled ? 'Mute' : 'Unmute'}
              >
                {audioEnabled ? (
                  <Mic
                    aria-hidden="true"
                    className="w-4 h-4 md:w-5 md:h-5 stroke-[3px]"
                  />
                ) : (
                  <MicOff
                    aria-hidden="true"
                    className="w-4 h-4 md:w-5 md:h-5 stroke-[3px]"
                  />
                )}
              </Button>
              <Button
                type="button"
                variant="none"
                size="none"
                onClick={() => {
                  setShowAudioDevices(!showAudioDevices);
                  setShowVideoDevices(false);
                }}
                className={cn(
                  'p-2.5 border-[3px] border-[#1a1a1a] transition-all active:translate-y-[2px]',
                  showAudioDevices
                    ? 'bg-[#1a1a1a] text-white'
                    : 'bg-[#f5f0e8] text-[#1a1a1a] hover:bg-[#e0e0e0]',
                )}
                title="Select Microphone"
              >
                {showAudioDevices ? (
                  <X className="w-4 h-4 md:w-5 md:h-5 stroke-[3px]" />
                ) : (
                  <ChevronUp className="w-4 h-4 md:w-5 md:h-5 stroke-[3px]" />
                )}
              </Button>
            </div>

            {/* Video Button with Arrow */}
            <div className="flex items-center relative">
              {showVideoDevices ? (
                <DeviceDropdown
                  title="Select Camera"
                  devices={videoInputDevices}
                  selectedDevice={selectedVideoDevice}
                  onSelect={(deviceId) => {
                    onSwitchVideoDevice(deviceId);
                    setShowVideoDevices(false);
                  }}
                  onClose={() => setShowVideoDevices(false)}
                />
              ) : null}
              <Button
                type="button"
                variant="none"
                size="none"
                onClick={onToggleVideo}
                className={cn(
                  'p-2.5 border-y-[3px] border-l-[3px] border-[#1a1a1a] transition-all active:translate-y-[2px]',
                  videoEnabled
                    ? 'bg-white text-[#1a1a1a] hover:bg-[#f5f0e8]'
                    : 'bg-[#e63b2e] text-white hover:bg-[#1a1a1a]',
                )}
                title={videoEnabled ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {videoEnabled ? (
                  <Video
                    aria-hidden="true"
                    className="w-4 h-4 md:w-5 md:h-5 stroke-[3px]"
                  />
                ) : (
                  <VideoOff
                    aria-hidden="true"
                    className="w-4 h-4 md:w-5 md:h-5 stroke-[3px]"
                  />
                )}
              </Button>
              <Button
                type="button"
                variant="none"
                size="none"
                onClick={() => {
                  setShowVideoDevices(!showVideoDevices);
                  setShowAudioDevices(false);
                }}
                className={cn(
                  'p-2.5 border-[3px] border-[#1a1a1a] transition-all active:translate-y-[2px]',
                  showVideoDevices
                    ? 'bg-[#1a1a1a] text-white'
                    : 'bg-[#f5f0e8] text-[#1a1a1a] hover:bg-[#e0e0e0]',
                )}
                title="Select Camera"
              >
                {showVideoDevices ? (
                  <X className="w-4 h-4 md:w-5 md:h-5 stroke-[3px]" />
                ) : (
                  <ChevronUp className="w-4 h-4 md:w-5 md:h-5 stroke-[3px]" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponent for device selection dropdown
interface DeviceDropdownProps {
  title: string;
  devices: MediaDevice[];
  selectedDevice: string | null;
  onSelect: (deviceId: string) => void;
  onClose: () => void;
}

function DeviceDropdown({
  title,
  devices,
  selectedDevice,
  onSelect,
  onClose,
}: DeviceDropdownProps) {
  return (
    <div className="absolute bottom-full right-0 mb-3 w-[240px] bg-white border-[4px] border-[#1a1a1a] neo-shadow z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200 flex flex-col">
      <div className="p-3 border-b-[4px] border-[#1a1a1a] flex items-center justify-between bg-[#f5f0e8]">
        <span className="text-[10px] font-black font-headline uppercase tracking-widest text-[#1a1a1a]">
          {title}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors border-[2px] border-[#1a1a1a] px-1"
        >
          ✕
        </button>
      </div>
      <div className="p-2 max-h-48 overflow-y-auto no-scrollbar flex flex-col gap-2">
        {devices.length === 0 ? (
          <div className="text-xs font-bold font-headline uppercase tracking-widest text-[#4a4a4a] p-4 text-center border-[2px] border-transparent">
            No devices found
          </div>
        ) : (
          devices.map((device) => (
            <Button
              key={device.deviceId}
              type="button"
              variant="none"
              size="none"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(device.deviceId);
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 border-[2px] transition-all rounded-none h-auto active:translate-y-[1px]',
                selectedDevice === device.deviceId
                  ? 'bg-[#ffe066] border-[#1a1a1a] text-[#1a1a1a]'
                  : 'bg-white border-transparent text-[#1a1a1a] hover:border-[#1a1a1a] hover:bg-[#f5f0e8]',
              )}
            >
              {selectedDevice === device.deviceId ? (
                <Check className="w-4 h-4 shrink-0 stroke-[3px]" />
              ) : null}
              <span className="truncate">{device.label}</span>
            </Button>
          ))
        )}
      </div>
    </div>
  );
}
