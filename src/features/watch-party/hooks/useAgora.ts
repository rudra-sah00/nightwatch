'use client';

import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack,
} from 'agora-rtc-sdk-ng';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// ============================================
// SDK Configuration
// ============================================

// Suppress excessive Agora logs — WARNING level only
AgoraRTC.setLogLevel(3);

// Handle autoplay restrictions (browsers block audio before user interaction).
// This fires once if any audio/video track fails to autoplay, prompting the user.
AgoraRTC.onAutoplayFailed = () => {
  toast.info('Click anywhere on the page to enable audio playback', {
    duration: 8000,
    id: 'agora-autoplay', // prevent duplicate toasts
    action: {
      label: 'Enable Audio',
      onClick: () => {
        // User interaction satisfies browser autoplay policy
      },
    },
  });
};

// ============================================
// Audio / Video Encoding Presets
// ============================================

/**
 * Voice-optimized audio config for watch party chat.
 * - 48kHz sample rate for clarity
 * - Mono channel (stereo not needed for voice)
 * - 40kbps bitrate — efficient bandwidth while maintaining quality
 * Ref: https://docs.agora.io/en/video-calling/enhance-call-quality/configure-audio-encoding
 */
const AUDIO_ENCODER_CONFIG = 'music_standard' as const;

/**
 * Video config sized for sidebar tile rendering (small tiles).
 * - 480×360 @ 15fps — sufficient for sidebar participant views
 * - motion optimization → prioritize smoothness over clarity
 * - bitrateMin prevents quality dropping too low on bad networks
 * Ref: https://docs.agora.io/en/video-calling/enhance-call-quality/configure-video-encoding
 */
const VIDEO_ENCODER_CONFIG = {
  width: 480,
  height: 360,
  frameRate: 15,
  bitrateMin: 200,
  bitrateMax: 600,
} as const;

/**
 * Prioritize smooth video for watch party sidebar tiles.
 * Ref: https://docs.agora.io/en/video-calling/enhance-call-quality/video-transmission-optimization
 */
const VIDEO_OPTIMIZATION_MODE = 'motion' as const;

// ============================================
// Types
// ============================================

export type ConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTING';

export interface NetworkQuality {
  /** 0=unknown, 1=excellent, 2=good, 3=poor, 4=bad, 5=very bad, 6=down */
  uplink: number;
  /** 0=unknown, 1=excellent, 2=good, 3=poor, 4=bad, 5=very bad, 6=down */
  downlink: number;
}

export interface MediaDevice {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'videoinput' | 'audiooutput';
}

export interface AgoraParticipant {
  uid: string;
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMicrophoneEnabled: boolean;
  isCameraEnabled: boolean;
  metadata?: string;
  /** Video track for rendering */
  videoTrack?: ICameraVideoTrack;
  /** True if this is the local user */
  isLocal: boolean;
  /** Audio level 0-1 */
  audioLevel: number;
}

interface MemberInfo {
  id: string;
  name: string;
  profilePhoto?: string;
}

interface UseAgoraOptions {
  token: string | null;
  appId: string;
  channel: string;
  uid: number;
  /** Room members — used to map Agora numeric UIDs back to real user IDs/names */
  members?: MemberInfo[];
}

// ============================================
// Helpers
// ============================================

/**
 * Deterministic numeric UID from a string userId.
 * Must match the backend's `generateNumericUid` in agora.service.ts exactly.
 */
function generateNumericUid(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash) || 1;
}

/** Build a map from Agora numeric UID → member info. */
function buildUidToMemberMap(members: MemberInfo[]): Map<string, MemberInfo> {
  const map = new Map<string, MemberInfo>();
  for (const m of members) {
    map.set(String(generateNumericUid(m.id)), m);
  }
  return map;
}

/** Convert a media‐device error message into a user‐friendly toast. */
function handleDeviceError(
  error: unknown,
  deviceType: 'Microphone' | 'Camera',
) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Permission') || message.includes('NotAllowed')) {
    toast.error(
      `${deviceType} permission denied. Click the lock icon in your browser address bar to allow access.`,
    );
  } else if (
    message.includes('NotFound') ||
    message.includes('Device not found')
  ) {
    toast.error(
      `No ${deviceType.toLowerCase()} found. Please connect a ${deviceType.toLowerCase()}.`,
    );
  } else {
    toast.error(
      `Failed to access ${deviceType.toLowerCase()}. Please check your browser settings.`,
    );
  }
}

// ============================================
// Hook
// ============================================

export function useAgora({
  token,
  appId,
  channel,
  uid,
  members = [],
}: UseAgoraOptions) {
  // --- Refs for mutable SDK objects (not state — avoids re-renders) ---
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);

  // --- Core state ---
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [participants, setParticipants] = useState<AgoraParticipant[]>([]);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);

  // Track when the SDK client has joined so effects can safely attach listeners.
  // Using state instead of depending on clientRef.current (a mutable ref)
  // ensures React correctly re-runs dependent effects.
  const [isClientReady, setIsClientReady] = useState(false);

  // --- Connection & quality state ---
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('DISCONNECTED');
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>({
    uplink: 0,
    downlink: 0,
  });

  // --- Device state ---
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDevice[]>([]);
  const [videoInputDevices, setVideoInputDevices] = useState<MediaDevice[]>([]);
  const selectedAudioDeviceRef = useRef('');
  const selectedVideoDeviceRef = useRef('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const [selectedVideoDevice, setSelectedVideoDevice] = useState('');

  // Keep refs in sync for use in callbacks without stale closures
  useEffect(() => {
    selectedAudioDeviceRef.current = selectedAudioDevice;
  }, [selectedAudioDevice]);
  useEffect(() => {
    selectedVideoDeviceRef.current = selectedVideoDevice;
  }, [selectedVideoDevice]);

  // ============================================
  // Device enumeration
  // ============================================

  const refreshDevices = useCallback(async () => {
    try {
      // Request audio and video permissions SEPARATELY.
      // Bundling { audio: true, video: true } in one getUserMedia call
      // fails entirely if either device type is missing (e.g. no camera),
      // which blocks permission for the device that IS available.
      const streams: MediaStream[] = [];
      const [audioStream, videoStream] = await Promise.allSettled([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        navigator.mediaDevices.getUserMedia({ video: true }),
      ]);
      if (audioStream.status === 'fulfilled') streams.push(audioStream.value);
      if (videoStream.status === 'fulfilled') streams.push(videoStream.value);

      // Stop all permission-probe tracks immediately
      for (const stream of streams) {
        for (const track of stream.getTracks()) track.stop();
      }

      const devices = await AgoraRTC.getDevices();

      const audioInputs: MediaDevice[] = [];
      const videoInputs: MediaDevice[] = [];

      // Single-pass filter — skip devices with empty deviceId (phantom entries)
      for (const d of devices) {
        if (!d.deviceId) continue;

        if (d.kind === 'audioinput') {
          audioInputs.push({
            deviceId: d.deviceId,
            label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
            kind: 'audioinput',
          });
        } else if (d.kind === 'videoinput') {
          videoInputs.push({
            deviceId: d.deviceId,
            label: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
            kind: 'videoinput',
          });
        }
      }

      setAudioInputDevices(audioInputs);
      setVideoInputDevices(videoInputs);

      // Set default device only if none selected yet (or previously selected device vanished)
      if (
        audioInputs.length > 0 &&
        (!selectedAudioDeviceRef.current ||
          !audioInputs.some(
            (d) => d.deviceId === selectedAudioDeviceRef.current,
          ))
      ) {
        setSelectedAudioDevice(audioInputs[0].deviceId);
      }
      if (
        videoInputs.length > 0 &&
        (!selectedVideoDeviceRef.current ||
          !videoInputs.some(
            (d) => d.deviceId === selectedVideoDeviceRef.current,
          ))
      ) {
        setSelectedVideoDevice(videoInputs[0].deviceId);
      }
    } catch {
      // Silently fail — devices may not be available
    }
  }, []); // stable: no deps — uses refs internally

  // Listen for device hot-plug
  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
    return () => {
      navigator.mediaDevices.removeEventListener(
        'devicechange',
        refreshDevices,
      );
    };
  }, [refreshDevices]);

  // ============================================
  // Participant list builder
  // ============================================

  useEffect(() => {
    // Build participant list from Agora remote users + local user.
    // We always show the local user tile (even before isClientReady)
    // so the host sees themselves immediately.
    const uidMap = buildUidToMemberMap(members);

    if (!isClientReady) {
      // Not connected yet — show only local user tile
      const localMember = uidMap.get(String(uid));
      const local: AgoraParticipant = {
        uid: String(uid),
        identity: localMember?.id ?? String(uid),
        name: 'You',
        isSpeaking: false,
        isMicrophoneEnabled: false,
        isCameraEnabled: false,
        isLocal: true,
        audioLevel: 0,
      };
      // Only set if uid is valid (token fetched)
      if (uid) setParticipants([local]);
      return;
    }

    const remote: AgoraParticipant[] = remoteUsers.map((user) => {
      const member = uidMap.get(String(user.uid));
      return {
        uid: String(user.uid),
        identity: member?.id ?? String(user.uid),
        name: member?.name ?? `User ${user.uid}`,
        isSpeaking: false,
        isMicrophoneEnabled: user.hasAudio,
        isCameraEnabled: user.hasVideo,
        isLocal: false,
        audioLevel: 0,
      };
    });

    // Local user — find own member entry for consistent identity
    const localMember = uidMap.get(String(uid));
    const local: AgoraParticipant = {
      uid: String(uid),
      identity: localMember?.id ?? String(uid),
      name: 'You',
      isSpeaking: false,
      isMicrophoneEnabled: audioEnabled,
      isCameraEnabled: videoEnabled,
      isLocal: true,
      audioLevel: 0,
    };

    setParticipants([local, ...remote]);
  }, [remoteUsers, uid, audioEnabled, videoEnabled, isClientReady, members]);

  // ============================================
  // Volume indicator → speaking detection
  // ============================================

  useEffect(() => {
    const client = clientRef.current;
    if (!client || !isClientReady) return;

    client.enableAudioVolumeIndicator();

    const handleVolumeIndicator = (
      volumes: { uid: number; level: number }[],
    ) => {
      // Build a Map for O(1) lookups — keyed by Agora numeric UID (not identity)
      const volumeMap = new Map<string, number>();
      for (const v of volumes) {
        volumeMap.set(String(v.uid), v.level);
      }

      setParticipants((prev) => {
        let changed = false;
        const next = prev.map((p) => {
          // Match by p.uid (Agora numeric UID), NOT p.identity (user ID string)
          const level = volumeMap.get(p.uid);
          if (level !== undefined) {
            const newSpeaking = level > 5;
            const newAudioLevel = level / 100;
            if (
              p.isSpeaking !== newSpeaking ||
              p.audioLevel !== newAudioLevel
            ) {
              changed = true;
              return {
                ...p,
                isSpeaking: newSpeaking,
                audioLevel: newAudioLevel,
              };
            }
          }
          return p;
        });
        // Only return new array if something actually changed (rerender-defer-reads)
        return changed ? next : prev;
      });
    };

    client.on('volume-indicator', handleVolumeIndicator);
    return () => {
      client.off('volume-indicator', handleVolumeIndicator);
    };
  }, [isClientReady]);

  // ============================================
  // Connection state & network quality monitoring
  // ============================================

  useEffect(() => {
    const client = clientRef.current;
    if (!client || !isClientReady) return;

    // Connection state management
    // Ref: https://docs.agora.io/en/video-calling/enhance-call-quality/connection-status-management
    const handleConnectionStateChange = (
      curState: ConnectionState,
      _prevState: ConnectionState,
    ) => {
      setConnectionState(curState);

      if (curState === 'RECONNECTING') {
        toast.warning('Reconnecting to voice/video server...', {
          id: 'agora-connection',
          duration: 10000,
        });
      } else if (curState === 'CONNECTED') {
        toast.dismiss('agora-connection');
      } else if (curState === 'DISCONNECTED') {
        toast.error('Disconnected from voice/video server', {
          id: 'agora-connection',
        });
      }
    };

    // Network quality callback — fires every 2 seconds
    // Ref: https://docs.agora.io/en/video-calling/enhance-call-quality/in-call-quality-monitoring
    const handleNetworkQuality = (stats: {
      uplinkNetworkQuality: number;
      downlinkNetworkQuality: number;
    }) => {
      setNetworkQuality((prev) => {
        if (
          prev.uplink === stats.uplinkNetworkQuality &&
          prev.downlink === stats.downlinkNetworkQuality
        ) {
          return prev; // no change — skip re-render
        }
        return {
          uplink: stats.uplinkNetworkQuality,
          downlink: stats.downlinkNetworkQuality,
        };
      });
    };

    // Exception callback — quality anomalies (e.g. low framerate, low bitrate)
    const handleException = (_evt: {
      code: number;
      msg: string;
      uid: string;
    }) => {
      // Intentional no-op — transient quality blips are not actionable
    };

    client.on('connection-state-change', handleConnectionStateChange);
    client.on('network-quality', handleNetworkQuality);
    client.on('exception', handleException);

    return () => {
      client.off('connection-state-change', handleConnectionStateChange);
      client.off('network-quality', handleNetworkQuality);
      client.off('exception', handleException);
    };
  }, [isClientReady]);

  // ============================================
  // Connect to Agora channel
  // ============================================

  useEffect(() => {
    if (!token || !appId || !channel) return;

    // Track whether this effect instance was cleaned up.
    // React StrictMode double-fires effects in dev — the first mount's join()
    // rejects after cleanup calls client.leave(). Without this flag the stale
    // rejection would show a spurious "Failed to connect" toast.
    let cleaned = false;

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;

    // --- Remote user event handlers ---

    const handleUserPublished = async (
      user: IAgoraRTCRemoteUser,
      mediaType: 'audio' | 'video',
    ) => {
      if (cleaned) return;
      await client.subscribe(user, mediaType);

      if (mediaType === 'audio' && user.audioTrack) {
        user.audioTrack.play();
      }

      setRemoteUsers([...client.remoteUsers]);
    };

    const handleUserUnpublished = () => {
      if (cleaned) return;
      setRemoteUsers([...client.remoteUsers]);
    };

    const handleUserJoined = () => {
      if (cleaned) return;
      setRemoteUsers([...client.remoteUsers]);
    };

    const handleUserLeft = () => {
      if (cleaned) return;
      setRemoteUsers([...client.remoteUsers]);
    };

    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnpublished);
    client.on('user-joined', handleUserJoined);
    client.on('user-left', handleUserLeft);

    client
      .join(appId, channel, token, uid)
      .then(() => {
        if (cleaned) return;
        setIsClientReady(true);
        setConnectionState('CONNECTED');
        setRemoteUsers([...client.remoteUsers]);
      })
      .catch(() => {
        // Only show error if this effect instance is still active.
        // Stale rejections from StrictMode double-fire are silently ignored.
        if (!cleaned) {
          toast.error('Failed to connect to voice/video server');
        }
      });

    return () => {
      cleaned = true;

      client.off('user-published', handleUserPublished);
      client.off('user-unpublished', handleUserUnpublished);
      client.off('user-joined', handleUserJoined);
      client.off('user-left', handleUserLeft);

      // Cleanup local tracks
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }

      setIsClientReady(false);
      setConnectionState('DISCONNECTED');
      setAudioEnabled(false);
      setVideoEnabled(false);

      client.leave().catch(() => {});
      clientRef.current = null;
    };
  }, [token, appId, channel, uid]);

  // ============================================
  // Media toggles — voice-optimized encoding
  // ============================================

  const toggleAudio = useCallback(async () => {
    const client = clientRef.current;
    if (!client) {
      toast.error('Not connected to voice server yet. Please wait...');
      return;
    }
    try {
      if (localAudioTrackRef.current) {
        await client.unpublish(localAudioTrackRef.current);
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
        setAudioEnabled(false);
      } else {
        // Voice-optimized audio track:
        // 'music_standard' = 48kHz mono @ 40kbps — clear voice with efficient bandwidth
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          microphoneId: selectedAudioDeviceRef.current || undefined,
          encoderConfig: AUDIO_ENCODER_CONFIG,
          // AEC (Acoustic Echo Cancellation), ANS (Auto Noise Suppression),
          // and AGC (Auto Gain Control) are enabled by default in WebRTC
        });
        localAudioTrackRef.current = audioTrack;
        await client.publish(audioTrack);
        setAudioEnabled(true);

        // Refresh device list — browser may expose more labels after track creation
        refreshDevices();
      }
    } catch (error) {
      handleDeviceError(error, 'Microphone');
    }
  }, [refreshDevices]);

  const toggleVideo = useCallback(async () => {
    const client = clientRef.current;
    if (!client) {
      toast.error('Not connected to video server yet. Please wait...');
      return;
    }
    try {
      if (localVideoTrackRef.current) {
        await client.unpublish(localVideoTrackRef.current);
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
        setVideoEnabled(false);
      } else {
        // Re-enumerate devices to get current list before creating track
        const devices = await AgoraRTC.getDevices();
        const cameras = devices.filter(
          (d) => d.kind === 'videoinput' && d.deviceId,
        );

        if (cameras.length === 0) {
          toast.error(
            'No camera found. Please connect a camera and try again.',
          );
          return;
        }

        // Use selected device if it still exists, otherwise fall back to first available
        const targetDeviceId = cameras.some(
          (d) => d.deviceId === selectedVideoDeviceRef.current,
        )
          ? selectedVideoDeviceRef.current
          : cameras[0].deviceId;

        if (targetDeviceId !== selectedVideoDeviceRef.current) {
          setSelectedVideoDevice(targetDeviceId);
        }

        // Sidebar-optimized video track:
        // 480×360 @ 15fps — sized for sidebar tile rendering
        // 'motion' optimization mode → smooth video, SDK may drop resolution over framerate
        const videoTrack = await AgoraRTC.createCameraVideoTrack({
          cameraId: targetDeviceId || undefined,
          encoderConfig: VIDEO_ENCODER_CONFIG,
          optimizationMode: VIDEO_OPTIMIZATION_MODE,
        });
        localVideoTrackRef.current = videoTrack;
        await client.publish(videoTrack);
        setVideoEnabled(true);

        // Refresh device list — browser may expose more labels after track creation
        refreshDevices();
      }
    } catch (error) {
      handleDeviceError(error, 'Camera');
    }
  }, [refreshDevices]);

  // ============================================
  // Device switching
  // ============================================

  const switchAudioDevice = useCallback(async (deviceId: string) => {
    setSelectedAudioDevice(deviceId);
    if (localAudioTrackRef.current) {
      try {
        await localAudioTrackRef.current.setDevice(deviceId);
        toast.success('Microphone switched');
      } catch {
        toast.error('Failed to switch microphone');
      }
    }
  }, []);

  const switchVideoDevice = useCallback(async (deviceId: string) => {
    setSelectedVideoDevice(deviceId);
    if (localVideoTrackRef.current) {
      try {
        await localVideoTrackRef.current.setDevice(deviceId);
        toast.success('Camera switched');
      } catch {
        toast.error('Failed to switch camera');
      }
    }
  }, []);

  // ============================================
  // Return value
  // ============================================

  return {
    client: clientRef.current,
    participants,
    remoteUsers,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    audioInputDevices,
    videoInputDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    switchAudioDevice,
    switchVideoDevice,
    refreshDevices,
    localVideoTrack: localVideoTrackRef.current,
    /** Current connection state (DISCONNECTED | CONNECTING | CONNECTED | RECONNECTING | DISCONNECTING) */
    connectionState,
    /** Uplink/downlink network quality scores (0-6, lower is better) */
    networkQuality,
    /** Whether the SDK client is connected and ready */
    isConnected: isClientReady,
  };
}
