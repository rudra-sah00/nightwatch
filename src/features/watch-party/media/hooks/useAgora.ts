'use client';

import AgoraRTC, {
  type IAgoraRTCClient,
  type IAgoraRTCRemoteUser,
  type ICameraVideoTrack,
  type IMicrophoneAudioTrack,
  type IRemoteVideoTrack,
} from 'agora-rtc-sdk-ng';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

/**
 * Agora SDK configuration and global handlers.
 * Logs are suppressed in production.
 */

// Set log level: 0 (DEBUG), 1 (INFO), 2 (WARNING), 3 (ERROR), 4 (NONE)
// NOTE: Do NOT use process.env.NODE_ENV here — agora-rtc-sdk-ng is listed in
// optimizePackageImports, which causes Next.js to re-export it through a
// generated barrel. That barrel can initialize this module before webpack has
// inlined NODE_ENV, causing the ternary to resolve to 'development' even in a
// production build, which leaks internal SDK cache logs (updateLastSubOrJoinOptionsCache).
// Hardcoding 4 (NONE) ensures silence in all cases. Dev verbosity can be
// temporarily toggled by setting NEXT_PUBLIC_AGORA_DEBUG=true in .env.local.
const AGORA_LOG_LEVEL = process.env.NEXT_PUBLIC_AGORA_DEBUG === 'true' ? 0 : 4;
AgoraRTC.setLogLevel(AGORA_LOG_LEVEL);

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

/**
 * Audio and Video encoding presets optimized for watch party sidebar tiles.
 */

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

/**
 * Possible connection states with the project's Agora RTC client.
 */

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
  videoTrack?: ICameraVideoTrack | IRemoteVideoTrack;
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
  /** Room members — used to map Agora numeric UIDs back to real user IDs/names */
  members?: MemberInfo[];
  /** Current user identity string used to identify "You" in the participant list */
  userId?: string;
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
  // Ensure 32-bit unsigned integer (0 to 4,294,967,295) and non-zero
  return hash >>> 0 || 1;
}

/** Build a map from Agora numeric UID → member info. */
function _buildUidToMemberMap(members: MemberInfo[]): Map<string, MemberInfo> {
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

/**
 * Main hook for managing Agora RTC lifecycle, including channel connection,
 * media tracks, and participant state.
 *
 * @param options - Configuration for the Agora connection and room membership.
 * @returns An object containing participant state, media controls, and device management.
 */

export function useAgora({
  token,
  appId,
  channel,
  uid,
  members = [],
  userId,
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

  // Track speaker state separately so it isn't lost when participants list re-clones
  const [speakerState, setSpeakerState] = useState<
    Record<string, { isSpeaking: boolean; audioLevel: number }>
  >({});

  // Keep refs in sync for use in callbacks without stale closures
  useEffect(() => {
    selectedAudioDeviceRef.current = selectedAudioDevice;
  }, [selectedAudioDevice]);
  useEffect(() => {
    selectedVideoDeviceRef.current = selectedVideoDevice;
  }, [selectedVideoDevice]);

  /**
   * Enumerates available media hardware (microphones, cameras) and updates state.
   * Probes permissions if necessary.
   */

  const refreshDevices = useCallback(async (probePermissions = false) => {
    try {
      if (probePermissions) {
        const streams: MediaStream[] = [];
        const [audioStream, videoStream] = await Promise.allSettled([
          navigator.mediaDevices.getUserMedia({ audio: true }),
          navigator.mediaDevices.getUserMedia({ video: true }),
        ]);
        if (audioStream.status === 'fulfilled') streams.push(audioStream.value);
        if (videoStream.status === 'fulfilled') streams.push(videoStream.value);

        for (const stream of streams) {
          for (const track of stream.getTracks()) track.stop();
        }
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

  useEffect(() => {
    refreshDevices(false);
    const handleDeviceChange = () => refreshDevices(false);
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener(
        'devicechange',
        handleDeviceChange,
      );
    };
  }, [refreshDevices]);

  /**
   * Rebuilds the internal participant list whenever remote users or local state changes.
   * Uses room members as the authoritative list to ensure immediate visibility.
   */

  useEffect(() => {
    // Build participant list from room members.
    // We use 'members' as the primary source of truth so everyone appears
    // immediately in the sidebar, even before Agora connects.
    const remoteUserMap = new Map<string, IAgoraRTCRemoteUser>();
    for (const user of remoteUsers) {
      remoteUserMap.set(String(user.uid), user);
    }

    const mappedMemberIds = new Set<string>();
    const nextParticipants: AgoraParticipant[] = members.map((member) => {
      const isLocal = member.id === userId;
      const numericUid = String(generateNumericUid(member.id));
      const remoteUser = remoteUserMap.get(numericUid);

      mappedMemberIds.add(numericUid);

      // Fetch persistent speaker state for this user (keyed by Agora numeric UID)
      const speaker = speakerState[isLocal ? String(uid) : numericUid] || {
        isSpeaking: false,
        audioLevel: 0,
      };

      const isMicrophoneEnabled = !!(isLocal
        ? audioEnabled
        : remoteUser?.hasAudio);

      // Force isSpeaking to false if mic is disabled (prevents stale speaker state after mute)
      const isActuallySpeaking = !!(isMicrophoneEnabled && speaker.isSpeaking);

      if (isLocal) {
        return {
          uid: String(uid),
          identity: member.id,
          name: 'You',
          isSpeaking: isActuallySpeaking,
          isMicrophoneEnabled,
          isCameraEnabled: videoEnabled,
          isLocal: true,
          audioLevel: speaker.audioLevel,
          videoTrack: localVideoTrackRef.current ?? undefined,
          metadata: member.profilePhoto
            ? JSON.stringify({ avatar: member.profilePhoto })
            : undefined,
        };
      }

      return {
        uid: numericUid,
        identity: member.id,
        name: member.name,
        isSpeaking: isActuallySpeaking,
        isMicrophoneEnabled,
        isCameraEnabled: remoteUser?.hasVideo ?? false,
        isLocal: false,
        audioLevel: speaker.audioLevel,
        videoTrack: remoteUser?.videoTrack,
        metadata: member.profilePhoto
          ? JSON.stringify({ avatar: member.profilePhoto })
          : undefined,
      };
    });

    // 3. Complement with any remote users NOT found in members list (Fail-safe for sync issues)
    const unmappedParticipants: AgoraParticipant[] = Array.from(
      remoteUserMap.entries(),
    )
      .filter(([uidStr]) => !mappedMemberIds.has(uidStr))
      .map(([uidStr, remoteUser]) => {
        const speaker = speakerState[uidStr] || {
          isSpeaking: false,
          audioLevel: 0,
        };
        const isMicrophoneEnabled = remoteUser.hasAudio;
        return {
          uid: uidStr,
          identity: `unknown:${uidStr}`,
          name: 'Unknown Participant',
          isSpeaking: isMicrophoneEnabled && speaker.isSpeaking,
          isMicrophoneEnabled,
          isCameraEnabled: remoteUser.hasVideo,
          isLocal: false,
          audioLevel: speaker.audioLevel,
          videoTrack: remoteUser.videoTrack,
        };
      });

    const finalParticipants = [...nextParticipants, ...unmappedParticipants];

    setParticipants(finalParticipants);
  }, [
    remoteUsers,
    uid,
    userId,
    audioEnabled,
    videoEnabled,
    members,
    speakerState,
  ]);

  /**
   * Monitors audio volume indicators from Agora to drive the 'speaking' status
   * in the participant list.
   */

  useEffect(() => {
    const client = clientRef.current;
    if (!client || !isClientReady) return;

    client.enableAudioVolumeIndicator();

    const handleVolumeIndicator = (
      volumes: { uid: number; level: number }[],
    ) => {
      setSpeakerState((prev) => {
        let changed = false;
        const next = { ...prev };

        for (const v of volumes) {
          // If local participant, SDK uses UID 0. Map it back to our uid string.
          const uidStr = v.uid === 0 ? String(uid) : String(v.uid);
          const isSpeaking = v.level > 5;
          const audioLevel = v.level / 100;

          if (
            !next[uidStr] ||
            next[uidStr].isSpeaking !== isSpeaking ||
            next[uidStr].audioLevel !== audioLevel
          ) {
            next[uidStr] = { isSpeaking, audioLevel };
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    };

    client.on('volume-indicator', handleVolumeIndicator);
    return () => {
      client.off('volume-indicator', handleVolumeIndicator);
    };
  }, [isClientReady, uid]);

  /**
   * Monitors connection state changes and network quality to provide feedback
   * to the user via toasts and UI indicators.
   */

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
    const handleException = (evt: {
      code: number;
      msg: string;
      uid: string;
      type?: string;
    }) => {
      if (evt.type === 'error' || (evt.code && evt.code >= 1000)) {
        toast.error(`Media Error: ${evt.msg || 'An unknown error occurred'}`);
      }
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

  /**
   * Core effect that initializes the Agora RTC client, joins the channel,
   * and manages remote user event listeners.
   */

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

    const handleUserJoined = (_user: IAgoraRTCRemoteUser) => {
      if (cleaned) return;
      setRemoteUsers([...client.remoteUsers]);
    };

    const handleUserLeft = (_user: IAgoraRTCRemoteUser) => {
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
      .catch((_err) => {
        // Only show error if this effect instance is still active.
        // Stale rejections from StrictMode double-fire are silently ignored.
        if (!cleaned) {
          toast.error('Failed to connect to voice/video server');
        }
      });

    return () => {
      cleaned = true;

      // Detach core listeners explicitly
      client.off('user-published', handleUserPublished);
      client.off('user-unpublished', handleUserUnpublished);
      client.off('user-joined', handleUserJoined);
      client.off('user-left', handleUserLeft);

      // Cleanup local tracks
      if (localAudioTrackRef.current) {
        if (client.connectionState === 'CONNECTED') {
          client.unpublish(localAudioTrackRef.current).catch(() => {});
        }
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      if (localVideoTrackRef.current) {
        if (client.connectionState === 'CONNECTED') {
          client.unpublish(localVideoTrackRef.current).catch(() => {});
        }
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

  /**
   * Toggles for local audio and video tracks.
   * Optimized for voice chat in a watch party context.
   */

  const toggleAudio = useCallback(async () => {
    const client = clientRef.current;
    if (!client || connectionState !== 'CONNECTED') {
      toast.error('Not connected to voice server yet. Please wait...');
      return;
    }
    // Snapshot whether audio was enabled AT CALL TIME (ref value is live).
    // Used in the catch block to distinguish enable-failure from disable-failure.
    const wasEnabled = !!localAudioTrackRef.current;
    try {
      if (localAudioTrackRef.current) {
        await client.unpublish(localAudioTrackRef.current);
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
        setAudioEnabled(false);
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          stream.getTracks().forEach((t) => {
            t.stop();
          });
        } catch {
          // Fall through, handleDeviceError will catch
        }

        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          microphoneId: selectedAudioDeviceRef.current || undefined,
          encoderConfig: AUDIO_ENCODER_CONFIG,
        });
        localAudioTrackRef.current = audioTrack;
        await client.publish(audioTrack);
        setAudioEnabled(true);
        refreshDevices();
      }
    } catch (error) {
      // If we were ENABLING audio and the track was created but publish failed,
      // close and clear the leaked track so the next toggle starts fresh.
      if (!wasEnabled && localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      handleDeviceError(error, 'Microphone');
    }
  }, [refreshDevices, connectionState]);

  const toggleVideo = useCallback(async () => {
    const client = clientRef.current;
    if (!client || connectionState !== 'CONNECTED') {
      toast.error('Not connected to video server yet. Please wait...');
      return;
    }
    // Snapshot whether video was enabled AT CALL TIME (ref value is live).
    const wasEnabled = !!localVideoTrackRef.current;
    try {
      if (localVideoTrackRef.current) {
        await client.unpublish(localVideoTrackRef.current);
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
        setVideoEnabled(false);
      } else {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          stream.getTracks().forEach((t) => {
            t.stop();
          });
        } catch {
          // Fall through, handleDeviceError will catch
        }

        const videoTrack = await AgoraRTC.createCameraVideoTrack({
          cameraId: selectedVideoDeviceRef.current || undefined,
          encoderConfig: VIDEO_ENCODER_CONFIG,
          optimizationMode: VIDEO_OPTIMIZATION_MODE,
        });
        localVideoTrackRef.current = videoTrack;
        await client.publish(videoTrack);
        setVideoEnabled(true);
        refreshDevices();
      }
    } catch (error) {
      // If we were ENABLING video and the track was created but publish failed,
      // close and clear the leaked track so the next toggle starts fresh.
      if (!wasEnabled && localVideoTrackRef.current) {
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }
      handleDeviceError(error, 'Camera');
    }
  }, [refreshDevices, connectionState]);

  /**
   * Low-level device switching without track reinitialization where possible.
   */

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

  /**
   * Exposed methods and states for UI components.
   */

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
