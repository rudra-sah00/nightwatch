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
    <div className="border-t-[4px] border-border bg-background relative z-[60] flex flex-col">
      {/* Party Actions - Copy Link & Leave/End Party */}
      <div className="p-4 flex gap-3 border-b-[4px] border-border bg-white">
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
            variant="none"
            size="none"
            onClick={onCopyLink}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-xs md:text-sm bg-white text-foreground border-[3px] border-border hover:bg-[#ffe066] font-black font-headline uppercase tracking-widest rounded-none transition-colors"
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
          variant="none"
          size="none"
          onClick={onLeave}
          className={cn(
            'flex items-center justify-center gap-2 py-3 text-xs md:text-sm bg-[#e63b2e] text-white border-[3px] border-border hover:bg-[#1a1a1a] hover:text-[#e63b2e] font-black font-headline uppercase tracking-widest rounded-none transition-colors',
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
        <div className="flex items-center justify-between bg-white border-[3px] border-border p-3 ">
          {/* User Avatar & Status */}
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-12 h-12 shrink-0 flex items-center justify-center border-[3px] border-border bg-[#ffcc00]">
              <span className="text-xl font-black font-headline text-foreground uppercase">
                {userName.charAt(0)}
              </span>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span
                className="text-sm font-black font-headline uppercase tracking-widest text-foreground truncate max-w-[100px]"
                title={userName}
              >
                {userName}
              </span>
              <span
                className={`text-[10px] sm:text-xs flex items-center gap-1.5 font-bold font-headline uppercase tracking-widest ${isAgoraConnected ? 'text-[#0055ff]' : 'text-[#e63b2e]'}`}
              >
                <span
                  className={cn(
                    'w-2.5 h-2.5 border-2 border-border',
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
                variant={audioEnabled ? 'neo-outline' : 'neo-red'}
                size="icon"
                onClick={onToggleAudio}
                className={cn('rounded-r-none border-r-0 z-10 w-auto px-3')}
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
                variant={showAudioDevices ? 'default' : 'neo-outline'}
                size="icon"
                onClick={() => {
                  setShowAudioDevices(!showAudioDevices);
                  setShowVideoDevices(false);
                }}
                className={cn('rounded-l-none w-auto px-2 border-l-0')}
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
                variant={videoEnabled ? 'neo-outline' : 'neo-red'}
                size="icon"
                onClick={onToggleVideo}
                className={cn('rounded-r-none border-r-0 z-10 w-auto px-3')}
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
                variant={showVideoDevices ? 'default' : 'neo-outline'}
                size="icon"
                onClick={() => {
                  setShowVideoDevices(!showVideoDevices);
                  setShowAudioDevices(false);
                }}
                className={cn('rounded-l-none w-auto px-2 border-l-0')}
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
    <div className="absolute bottom-full right-0 mb-3 w-[240px] bg-white border-[4px] border-border  z-[100] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-reduce:animate-none flex flex-col">
      <div className="p-3 border-b-[4px] border-border flex items-center justify-between bg-background">
        <span className="text-[10px] font-black font-headline uppercase tracking-widest text-foreground">
          {title}
        </span>
        <Button
          type="button"
          variant="neo-ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="px-2"
        >
          ✕
        </Button>
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
              variant={
                selectedDevice === device.deviceId ? 'default' : 'neo-ghost'
              }
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(device.deviceId);
              }}
              className="w-full flex items-center justify-start gap-2"
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
