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
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { MediaDevice } from '../hooks/useAgora';
import type { WatchPartyRoom } from '../types';
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
}: MediaControlsProps) {
  const [showAudioDevices, setShowAudioDevices] = useState(false);
  const [showVideoDevices, setShowVideoDevices] = useState(false);

  return (
    <div className="border-t border-white/10 bg-gradient-to-t from-black via-black/90 to-black/80 backdrop-blur-xl relative z-[60]">
      {/* Party Actions - Copy Link & Leave/End Party */}
      <div className="p-3 border-b border-white/5 flex gap-2">
        {isHost ? (
          <>
            <WatchPartySettings room={room} isHost={isHost} />
            <button
              type="button"
              onClick={onCopyLink}
              className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl transition-all"
            >
              {linkCopied ? (
                <Check className="w-3.5 h-3.5 text-green-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span className="sm:inline">
                {linkCopied ? 'Copied' : 'Invite'}
              </span>
            </button>
          </>
        ) : null}

        <button
          type="button"
          onClick={onLeave}
          className={cn(
            'flex items-center justify-center gap-2 py-2 text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition-all',
            isHost ? 'flex-1' : 'w-full',
          )}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="sm:inline">{isHost ? 'End' : 'Leave Party'}</span>
        </button>
      </div>

      {/* Media Controls */}
      <div className="p-3 space-y-3">
        {/* User Info & Controls */}
        <div className="flex items-center justify-between bg-white/5 rounded-xl p-2 border border-white/5">
          {/* User Avatar & Status */}
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shrink-0 flex items-center justify-center border-2 border-indigo-400/30 shadow-lg shadow-indigo-500/20">
              <span className="text-sm font-bold text-white">
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-white truncate max-w-[100px]">
                {userName}
              </span>
              <span className="text-[10px] text-green-400 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
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
                  audioEnabled
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-red-500/20 text-red-500 hover:bg-red-500/30',
                )}
                title={audioEnabled ? 'Mute' : 'Unmute'}
              >
                {audioEnabled ? (
                  <Mic className="w-4 h-4" />
                ) : (
                  <MicOff className="w-4 h-4" />
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
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-700/50 text-white/60 hover:bg-gray-600/50 hover:text-white',
                )}
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
                  videoEnabled
                    ? 'bg-white/10 text-white hover:bg-white/20'
                    : 'bg-red-500/20 text-red-500 hover:bg-red-500/30',
                )}
                title={videoEnabled ? 'Turn Camera Off' : 'Turn Camera On'}
              >
                {videoEnabled ? (
                  <Video className="w-4 h-4" />
                ) : (
                  <VideoOff className="w-4 h-4" />
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
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-700/50 text-white/60 hover:bg-gray-600/50 hover:text-white',
                )}
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
