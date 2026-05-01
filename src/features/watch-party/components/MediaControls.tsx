import {
  Check,
  ChevronUp,
  Copy,
  HeadphoneOff,
  Headphones,
  LogOut,
  Mic,
  MicOff,
  Video,
  VideoOff,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMediaControls } from '../hooks/use-media-controls';
import type { MediaDevice } from '../media/hooks/useAgora';
import type { RTMMessage } from '../media/hooks/useAgoraRtm';
import type { WatchPartyRoom } from '../room/types';
import { WatchPartySettings } from './WatchPartySettings';

/** Props for the {@link MediaControls} component. */
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

  // Deafen
  isDeafened?: boolean;
  onToggleDeafen?: () => void;

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
 * Media controls footer for the watch party sidebar.
 *
 * Renders mic/camera toggle buttons with device selection dropdowns,
 * a deafen toggle, copy-invite-link, leave/end-party actions, and
 * the watch party settings panel.
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
  isDeafened = false,
  onToggleDeafen,
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

  const t = useTranslations('party');

  return (
    <div className="border-t-[4px] border-border bg-background relative z-[60] flex flex-col">
      {/* Party Actions - Copy Link & Leave/End Party */}
      <div className="px-3 py-2 flex gap-2 border-b-[4px] border-border bg-background">
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
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] md:text-xs bg-background text-foreground border-[2px] border-border hover:bg-neo-yellow/80 font-black font-headline uppercase tracking-widest rounded-none transition-colors"
          >
            {linkCopied ? (
              <Check aria-hidden="true" className="w-3.5 h-3.5 stroke-[3px]" />
            ) : (
              <Copy aria-hidden="true" className="w-3.5 h-3.5 stroke-[3px]" />
            )}
            <span className="hidden xl:inline">
              {linkCopied ? t('actions.copied') : t('actions.invite')}
            </span>
          </Button>
        ) : null}

        <Button
          type="button"
          variant="none"
          size="none"
          onClick={onLeave}
          className={cn(
            'flex items-center justify-center gap-1.5 py-1.5 text-[10px] md:text-xs bg-neo-red text-primary-foreground border-[2px] border-border hover:bg-primary hover:text-neo-red font-black font-headline uppercase tracking-widest rounded-none transition-colors',
            isHost ? 'flex-1' : 'w-full',
          )}
        >
          <LogOut aria-hidden="true" className="w-3.5 h-3.5 stroke-[3px]" />
          <span className="hidden xl:inline">
            {isHost ? t('actions.end') : t('actions.leave')}
          </span>
        </Button>
      </div>

      {/* Media Controls */}
      <div className="p-4 space-y-4">
        {/* User Info & Controls */}
        <div className="flex items-center justify-between bg-background border-[3px] border-border p-3 ">
          {/* User Avatar & Status */}
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-12 h-12 shrink-0 flex items-center justify-center border-[3px] border-border bg-neo-yellow">
              <span className="text-xl font-black font-headline text-foreground uppercase">
                {userName.charAt(0)}
              </span>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span
                className="text-[9px] sm:text-[10px] font-black font-headline uppercase tracking-widest text-foreground truncate max-w-[60px] sm:max-w-[75px]"
                title={userName}
              >
                {userName}
              </span>
              <span
                className={`text-[7px] sm:text-[9px] flex items-center gap-1 font-bold font-headline uppercase tracking-widest ${isAgoraConnected ? 'text-neo-blue' : 'text-neo-red'}`}
              >
                <span
                  className={cn(
                    'w-2 h-2 border-[1.5px] border-border',
                    isAgoraConnected
                      ? 'bg-neo-blue animate-pulse'
                      : 'bg-neo-red animate-[pulse_1.5s_ease-in-out_infinite]',
                  )}
                />
                {isAgoraConnected
                  ? t('status.connected')
                  : t('status.connecting')}
              </span>
            </div>
          </div>

          {/* Media Buttons */}
          <div className="flex items-center gap-2">
            {/* Mic Button with Arrow */}
            <div className="flex items-center relative">
              {showAudioDevices ? (
                <DeviceDropdown
                  title={t('media.selectMicrophone')}
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
                size="sm"
                onClick={onToggleAudio}
                className={cn(
                  'rounded-r-none border-r-0 z-10 h-7 px-2 sm:px-2.5 sm:h-8 w-auto',
                )}
                title={audioEnabled ? t('media.mute') : t('media.unmute')}
              >
                {audioEnabled ? (
                  <Mic
                    aria-hidden="true"
                    className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[3px]"
                  />
                ) : (
                  <MicOff
                    aria-hidden="true"
                    className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[3px]"
                  />
                )}
              </Button>
              <Button
                type="button"
                variant={showAudioDevices ? 'default' : 'neo-outline'}
                size="sm"
                onClick={() => {
                  setShowAudioDevices(!showAudioDevices);
                  setShowVideoDevices(false);
                }}
                className={cn(
                  'rounded-l-none w-5 h-7 sm:h-8 sm:w-6 px-0 border-l-0',
                )}
                title={t('media.selectMicrophone')}
              >
                {showAudioDevices ? (
                  <X className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[3px]" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[3px]" />
                )}
              </Button>
            </div>

            {/* Video Button with Arrow */}
            <div className="flex items-center relative">
              {showVideoDevices ? (
                <DeviceDropdown
                  title={t('media.selectCamera')}
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
                size="sm"
                onClick={onToggleVideo}
                className={cn(
                  'rounded-r-none border-r-0 z-10 h-7 px-2 sm:px-2.5 sm:h-8 w-auto',
                )}
                title={
                  videoEnabled ? t('media.cameraOff') : t('media.cameraOn')
                }
              >
                {videoEnabled ? (
                  <Video
                    aria-hidden="true"
                    className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[3px]"
                  />
                ) : (
                  <VideoOff
                    aria-hidden="true"
                    className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[3px]"
                  />
                )}
              </Button>
              <Button
                type="button"
                variant={showVideoDevices ? 'default' : 'neo-outline'}
                size="sm"
                onClick={() => {
                  setShowVideoDevices(!showVideoDevices);
                  setShowAudioDevices(false);
                }}
                className={cn(
                  'rounded-l-none w-5 h-7 sm:h-8 sm:w-6 px-0 border-l-0',
                )}
                title={t('media.selectCamera')}
              >
                {showVideoDevices ? (
                  <X className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[3px]" />
                ) : (
                  <ChevronUp className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[3px]" />
                )}
              </Button>
            </div>
            {/* Deafen Button */}
            <Button
              type="button"
              variant={isDeafened ? 'neo-red' : 'neo-outline'}
              size="sm"
              onClick={onToggleDeafen}
              className="relative h-7 w-7 sm:h-8 sm:w-8 px-0"
              title={isDeafened ? t('media.undeafen') : t('media.deafen')}
            >
              {isDeafened ? (
                <HeadphoneOff
                  aria-hidden="true"
                  className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[3px]"
                />
              ) : (
                <Headphones
                  aria-hidden="true"
                  className="w-3.5 h-3.5 md:w-4 md:h-4 stroke-[3px]"
                />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Props for the {@link DeviceDropdown} sub-component. */
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
  const t = useTranslations('party');
  return (
    <div className="absolute bottom-full right-0 mb-3 w-[240px] bg-background border-[4px] border-border  z-[100] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-reduce:animate-none flex flex-col">
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
          <div className="text-xs font-bold font-headline uppercase tracking-widest text-foreground/70 p-4 text-center border-[2px] border-transparent">
            {t('media.noDevicesFound')}
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
