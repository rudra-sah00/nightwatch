import { Check, ChevronUp, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { MediaDevice } from '../hooks/useLiveKit';

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
}

/**
 * Media controls footer for the sidebar
 * Handles mic/camera toggle and device selection
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
}: MediaControlsProps) {
  const [showAudioDevices, setShowAudioDevices] = useState(false);
  const [showVideoDevices, setShowVideoDevices] = useState(false);

  return (
    <div className="p-3 border-t border-white/10 bg-black/60 backdrop-blur-md space-y-2 relative">
      {/* Device Selection Dropdowns */}
      {showAudioDevices && (
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
      )}

      {showVideoDevices && (
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
      )}

      {/* User Info & Controls */}
      <div className="flex items-center justify-between">
        {/* User Avatar & Status */}
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-indigo-500 shrink-0 flex items-center justify-center border border-indigo-400/30">
            <span className="text-xs font-bold text-white">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-bold text-white truncate max-w-[80px]">
              {userName}
            </span>
            <span className="text-[10px] text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Connected
            </span>
          </div>
        </div>

        {/* Media Buttons */}
        <div className="flex items-center gap-0.5">
          {/* Mic Button with Arrow */}
          <div className="flex items-center">
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
              className="p-2 rounded-r-lg border-l border-black/30 transition-colors bg-gray-700/50 text-white/60 hover:bg-gray-600/50 hover:text-white"
              title="Select Microphone"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          {/* Video Button with Arrow */}
          <div className="flex items-center ml-1">
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
              className="p-2 rounded-r-lg border-l border-black/30 transition-colors bg-gray-700/50 text-white/60 hover:bg-gray-600/50 hover:text-white"
              title="Select Camera"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
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
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-gray-800/95 backdrop-blur-md rounded-lg border border-white/10 shadow-xl overflow-hidden z-20">
      <div className="p-2 border-b border-white/10 flex items-center justify-between">
        <span className="text-xs font-semibold text-white/70">{title}</span>
        <button
          type="button"
          onClick={onClose}
          className="text-white/40 hover:text-white text-xs"
        >
          ✕
        </button>
      </div>
      <div className="p-1 max-h-32 overflow-y-auto custom-scrollbar">
        {devices.length === 0 ? (
          <div className="text-xs text-white/30 p-2 text-center">
            No devices found
          </div>
        ) : (
          devices.map((device) => (
            <button
              key={device.deviceId}
              type="button"
              onClick={() => onSelect(device.deviceId)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors',
                selectedDevice === device.deviceId
                  ? 'bg-gray-600/50 text-white'
                  : 'text-gray-300 hover:bg-gray-700/50 hover:text-white',
              )}
            >
              {selectedDevice === device.deviceId && (
                <Check className="w-3.5 h-3.5 shrink-0 text-green-400" />
              )}
              <span className="truncate">{device.label}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
