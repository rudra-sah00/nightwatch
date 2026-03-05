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
import { cn } from '@/lib/utils';
import { useMediaControls } from '../hooks/use-media-controls';
import type { SidebarTheme } from '../hooks/use-sidebar-theme';
import type { MediaDevice } from '../media/hooks/useAgora';
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
  sidebarTheme: SidebarTheme;
  onSidebarThemeChange: (theme: SidebarTheme) => void;
  customColor: string;
  onCustomColorChange: (color: string) => void;
  /** Whether the floating chat overlay is enabled (shown when sidebar is closed) */
  floatingChatEnabled?: boolean;
  onToggleFloatingChat?: () => void;
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
  sidebarTheme,
  onSidebarThemeChange,
  customColor,
  onCustomColorChange,
  floatingChatEnabled = false,
  onToggleFloatingChat,
}: MediaControlsProps) {
  const {
    showAudioDevices,
    setShowAudioDevices,
    showVideoDevices,
    setShowVideoDevices,
  } = useMediaControls();

  return (
    <div
      className="border-t backdrop-blur-xl relative z-[60]"
      style={{
        background: 'var(--wp-footer-bg)',
        borderColor: 'var(--wp-footer-border)',
      }}
    >
      {/* Party Actions - Copy Link & Leave/End Party */}
      <div
        className="p-3 flex gap-2 border-b"
        style={{ borderColor: 'var(--wp-divider)' }}
      >
        {/* Settings — visible to all users; host sees full settings, guests see personal prefs only */}
        <WatchPartySettings
          room={room}
          isHost={isHost}
          sidebarTheme={sidebarTheme}
          onSidebarThemeChange={onSidebarThemeChange}
          customColor={customColor}
          onCustomColorChange={onCustomColorChange}
          floatingChatEnabled={floatingChatEnabled}
          onToggleFloatingChat={onToggleFloatingChat}
        />

        {isHost ? (
          <button
            type="button"
            onClick={onCopyLink}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold border text-white rounded-xl transition-colors"
            style={{
              background: 'var(--wp-btn-bg)',
              borderColor: 'var(--wp-btn-border)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--wp-btn-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--wp-btn-bg)';
            }}
          >
            {linkCopied ? (
              <Check aria-hidden="true" className="w-3.5 h-3.5 text-success" />
            ) : (
              <Copy aria-hidden="true" className="w-3.5 h-3.5" />
            )}
            <span className="sm:inline">
              {linkCopied ? 'Copied' : 'Invite'}
            </span>
          </button>
        ) : null}

        <button
          type="button"
          onClick={onLeave}
          className={cn(
            'flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-xl border transition-colors',
            isHost ? 'flex-1' : 'w-full',
          )}
          style={{
            backgroundColor: 'var(--danger-bg)',
            borderColor: 'var(--danger-bg-hover)',
            color: 'var(--danger-color)',
          }}
        >
          <LogOut aria-hidden="true" className="w-3.5 h-3.5" />
          <span className="sm:inline">{isHost ? 'End' : 'Leave Party'}</span>
        </button>
      </div>

      {/* Media Controls */}
      <div className="p-3 space-y-3">
        {/* User Info & Controls */}
        <div
          className="flex items-center justify-between rounded-xl p-2 border"
          style={{
            background: 'var(--wp-accent-soft)',
            borderColor: 'var(--wp-divider)',
          }}
        >
          {/* User Avatar & Status */}
          <div className="flex items-center gap-3 overflow-hidden">
            <div
              className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center border-2 border-white/20 shadow-lg"
              style={{
                background:
                  'linear-gradient(to bottom right, var(--party-color), var(--ai-color))',
              }}
            >
              <span className="text-sm font-bold text-white">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-white truncate max-w-[100px]">
                {userName}
              </span>
              <span className="text-[10px] text-success flex items-center gap-1.5 font-medium">
                <span
                  className="w-2 h-2 rounded-full animate-pulse shadow-lg"
                  style={{
                    backgroundColor: 'var(--success-color-strong)',
                    boxShadow: '0 0 6px var(--success-glow)',
                  }}
                />
                Connected
              </span>
            </div>
          </div>

          {/* Media Buttons */}
          <div className="flex items-center gap-1">
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
              <button
                type="button"
                onClick={onToggleAudio}
                className={cn(
                  'p-2 rounded-l-lg transition-colors',
                  audioEnabled ? 'text-white' : 'text-danger',
                )}
                title={audioEnabled ? 'Mute' : 'Unmute'}
              >
                {audioEnabled ? (
                  <Mic aria-hidden="true" className="w-4 h-4" />
                ) : (
                  <MicOff aria-hidden="true" className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAudioDevices(!showAudioDevices);
                  setShowVideoDevices(false);
                }}
                className={cn(
                  'p-2 rounded-r-lg border-l border-black/30 transition-colors',
                  showAudioDevices
                    ? 'text-white'
                    : 'text-white/40 hover:text-white',
                )}
                style={{
                  background: showAudioDevices
                    ? 'var(--wp-btn-device-active)'
                    : 'var(--wp-btn-device-bg)',
                }}
                title="Select Microphone"
              >
                {showAudioDevices ? (
                  <X className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Video Button with Arrow */}
            <div className="flex items-center ml-1 relative">
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
              <button
                type="button"
                onClick={onToggleVideo}
                className={cn(
                  'p-2 rounded-l-lg transition-colors',
                  videoEnabled ? 'text-white' : 'text-danger',
                )}
                title={videoEnabled ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {videoEnabled ? (
                  <Video aria-hidden="true" className="w-4 h-4" />
                ) : (
                  <VideoOff aria-hidden="true" className="w-4 h-4" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowVideoDevices(!showVideoDevices);
                  setShowAudioDevices(false);
                }}
                className={cn(
                  'p-2 rounded-r-lg border-l border-black/30 transition-colors',
                  showVideoDevices
                    ? 'text-white'
                    : 'text-white/40 hover:text-white',
                )}
                style={{
                  background: showVideoDevices
                    ? 'var(--wp-btn-device-active)'
                    : 'var(--wp-btn-device-bg)',
                }}
                title="Select Camera"
              >
                {showVideoDevices ? (
                  <X className="w-4 h-4" />
                ) : (
                  <ChevronUp className="w-4 h-4" />
                )}
              </button>
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
    <div className="absolute bottom-full right-0 mb-3 w-[220px] bg-zinc-950/98 backdrop-blur-2xl rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
          {title}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="text-white/40 hover:text-white text-xs px-1"
        >
          ✕
        </button>
      </div>
      <div className="p-1 max-h-40 overflow-y-auto custom-scrollbar">
        {devices.length === 0 ? (
          <div className="text-xs text-white/30 p-2 text-center">
            No devices found
          </div>
        ) : (
          devices.map((device) => (
            <button
              key={device.deviceId}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(device.deviceId);
              }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-left transition-colors cursor-pointer',
                selectedDevice === device.deviceId
                  ? 'bg-gray-600/50 text-white'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white',
              )}
            >
              {selectedDevice === device.deviceId ? (
                <Check className="w-3.5 h-3.5 shrink-0 text-green-400" />
              ) : null}
              <span className="truncate">{device.label}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
