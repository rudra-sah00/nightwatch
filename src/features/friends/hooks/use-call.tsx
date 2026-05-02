'use client';

import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
} from 'agora-rtc-sdk-ng';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { checkIsMobile, desktopBridge } from '@/lib/electron-bridge';
import { useSocket } from '@/providers/socket-provider';
import {
  connectToAgoraCall,
  createCallVideoTrack,
  fetchCallToken,
} from '../call/call.service';
import { duckMediaElements } from '../call/call.utils';

/**
 * Finite state machine for a voice/video call lifecycle.
 *
 * - `'idle'` — no call in progress.
 * - `'outgoing'` — local user initiated a call; waiting for the remote peer to accept.
 * - `'incoming'` — a remote peer is calling; ringtone is playing.
 * - `'active'` — call connected via Agora RTC; audio/video tracks are live.
 */
export type CallState = 'idle' | 'outgoing' | 'incoming' | 'active';

/**
 * Minimal representation of a call participant (the remote peer or an invitee).
 */
export interface CallPeer {
  /** Unique user ID. */
  id: string;
  /** Display name shown in the call overlay. */
  name: string;
  /** Profile photo URL, or `null` for the default avatar. */
  photo: string | null;
}

/**
 * Shape of the call context exposed by {@link CallProvider}.
 *
 * Provides the current call state, peer info, media toggles, Agora video refs,
 * and action callbacks for initiating, accepting, rejecting, and ending calls.
 */
interface CallContextType {
  /** Current call lifecycle state. */
  callState: CallState;
  /** The primary remote peer (caller or callee). */
  peer: CallPeer | null;
  /** Additional participants in a group call. */
  participants: CallPeer[];
  /** Whether the local microphone is muted. */
  isMuted: boolean;
  /** Whether the local camera is publishing video. */
  isVideoOn: boolean;
  /** Whether the audio output is routed to the speaker (vs earpiece). */
  isSpeaker: boolean;
  /** Whether the remote peer is sending video. */
  isRemoteVideoOn: boolean;
  /** Ref to the DOM element where the remote video track is rendered. */
  remoteVideoRef: React.RefObject<HTMLDivElement | null>;
  /** Ref to the DOM element where the local video track is rendered. */
  localVideoRef: React.RefObject<HTMLDivElement | null>;
  /** Elapsed call duration in seconds (resets on each new call). */
  callDuration: number;
  /** Start an outgoing call to the given peer. */
  initiateCall: (peer: CallPeer) => void;
  /** Accept an incoming call. */
  acceptCall: () => void;
  /** Reject an incoming call. */
  rejectCall: () => void;
  /** End the current active/outgoing call. */
  endCall: () => void;
  /** Toggle the local microphone mute state. */
  toggleMute: () => void;
  /** Toggle the local camera on/off (publishes/unpublishes the video track). */
  toggleVideo: () => void;
  /** Toggle audio output between speaker and earpiece (mobile only). */
  toggleSpeaker: () => void;
  /** Invite an additional friend into the active call. */
  inviteFriend: (peer: CallPeer) => void;
}

const CallContext = createContext<CallContextType>({
  callState: 'idle',
  peer: null,
  participants: [],
  isMuted: false,
  isVideoOn: false,
  isSpeaker: true,
  isRemoteVideoOn: false,
  remoteVideoRef: { current: null },
  localVideoRef: { current: null },
  callDuration: 0,
  initiateCall: () => {},
  acceptCall: () => {},
  rejectCall: () => {},
  endCall: () => {},
  toggleMute: () => {},
  toggleVideo: () => {},
  toggleSpeaker: () => {},
  inviteFriend: () => {},
});

/**
 * Convenience hook to consume the {@link CallContextType} from the nearest
 * {@link CallProvider}.
 *
 * @returns The call context with state, peer info, and action callbacks.
 */
export const useCall = () => useContext(CallContext);

/**
 * Global call provider that manages the full voice/video call lifecycle.
 *
 * **Agora RTC connection** — on call acceptance, fetches a channel token from
 * the backend and joins an Agora RTC channel. Publishes a local microphone
 * track immediately; camera track is toggled on demand via `toggleVideo`.
 *
 * **Ringtone** — preloads `incoming-call.mp3` (looped, 50 % volume) and
 * `outgoing-call.mp3` (looped, 40 % volume). Playback starts/stops
 * automatically based on `callState`.
 *
 * **Media ducking** — when a call is incoming or active, all other `<audio>`
 * and `<video>` elements on the page are ducked to 20 % volume via
 * {@link duckMediaElements}. Volume is restored on cleanup. A `dm-call:start`
 * / `dm-call:end` custom event is dispatched for the music player to react.
 *
 * **Native mobile integration** —
 * - iOS: shows a CallKit incoming-call UI (green pill, lock-screen controls)
 *   via `@capgo/capacitor-incoming-call-kit`.
 * - Android: shows a persistent "call in progress" notification via
 *   `@anuradev/capacitor-phone-call-notification`.
 * - Both are dismissed when the call ends.
 *
 * **Socket events** — listens on:
 * - `call:incoming` — sets state to `'incoming'` with caller info.
 * - `call:accepted` — initiator joins the Agora channel.
 * - `call:rejected` / `call:ended` — cleans up all tracks and state.
 * - `call:participant_left` — removes a participant from the group list.
 *
 * Socket listeners are registered once (stable refs via `useRef`) to avoid
 * re-registration gaps that could cause missed events.
 *
 * @param props.children - Application tree that can access the call context.
 */
export function CallProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const [callState, setCallState] = useState<CallState>('idle');
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [participants, setParticipants] = useState<CallPeer[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isRemoteVideoOn, setIsRemoteVideoOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const callStateRef = useRef<CallState>('idle');
  const peerRef = useRef<CallPeer | null>(null);
  const callIdRef = useRef<string>(`nw-call-${Date.now()}`);

  const updateCallState = useCallback((state: CallState, peerName?: string) => {
    callStateRef.current = state;
    setCallState(state);

    // Native call UI for mobile (CallKit on iOS, notification on Android)
    if (checkIsMobile()) {
      if (state === 'active' || state === 'incoming') {
        callIdRef.current = `nw-call-${Date.now()}`;
        // Show Android notification with caller name
        import('@anuradev/capacitor-phone-call-notification')
          .then(({ PhoneCallNotification }) =>
            PhoneCallNotification.showCallInProgressNotification({
              channelName: peerName || 'Nightwatch',
              channelDescription:
                state === 'incoming'
                  ? `Incoming call from ${peerName || 'Unknown'}`
                  : 'Voice call in progress',
            }),
          )
          .catch(() => {});
      } else if (state === 'idle') {
        // Hide Android notification
        import('@anuradev/capacitor-phone-call-notification')
          .then(({ PhoneCallNotification }) =>
            PhoneCallNotification.hideCallInProgressNotification(),
          )
          .catch(() => {});
      }
    }
  }, []);

  const agoraClientRef = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const remoteVideoRef = useRef<HTMLDivElement | null>(null);
  const localVideoRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoTrackRef = useRef<IRemoteVideoTrack | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const restoreVolumeRef = useRef<(() => void) | null>(null);
  const ringtoneRef = useRef<{
    incoming: HTMLAudioElement;
    outgoing: HTMLAudioElement;
  } | null>(null);

  // ── Ringtone preload ──────────────────────────────────────────────
  useEffect(() => {
    const incoming = new Audio('/incoming-call.mp3');
    incoming.loop = true;
    incoming.volume = 0.5;
    incoming.preload = 'auto';
    incoming.load();

    const outgoing = new Audio('/outgoing-call.mp3');
    outgoing.loop = true;
    outgoing.volume = 0.4;
    outgoing.preload = 'auto';
    outgoing.load();

    ringtoneRef.current = { incoming, outgoing };
    return () => {
      incoming.pause();
      outgoing.pause();
    };
  }, []);

  // ── Duration timer ────────────────────────────────────────────────
  useEffect(() => {
    if (callState === 'active') {
      setCallDuration(0);
      durationIntervalRef.current = setInterval(
        () => setCallDuration((d) => d + 1),
        1000,
      );
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      setCallDuration(0);
    }
    return () => {
      if (durationIntervalRef.current)
        clearInterval(durationIntervalRef.current);
    };
  }, [callState]);

  // ── Media ducking + iOS audio session ──────────────────────────────
  useEffect(() => {
    if (callState === 'active' || callState === 'incoming') {
      restoreVolumeRef.current = duckMediaElements(0.2);
      window.dispatchEvent(new CustomEvent('dm-call:start'));
      desktopBridge.setCallActive(true);
      // iOS: switch to voice call audio session (earpiece, echo cancellation)
      if (checkIsMobile()) {
        import('@capacitor/core').then(({ registerPlugin }) => {
          const NWAudioSession = registerPlugin<{
            setVoiceCallMode: () => Promise<void>;
          }>('NWAudioSession');
          NWAudioSession.setVoiceCallMode().catch(() => {});
        });
      }
    }
    return () => {
      if (restoreVolumeRef.current) {
        restoreVolumeRef.current();
        restoreVolumeRef.current = null;
      }
      desktopBridge.setCallActive(false);
      // iOS: restore media playback audio session
      if (checkIsMobile()) {
        import('@capacitor/core').then(({ registerPlugin }) => {
          const NWAudioSession = registerPlugin<{
            setMediaMode: () => Promise<void>;
          }>('NWAudioSession');
          NWAudioSession.setMediaMode().catch(() => {});
        });
      }
    };
  }, [callState]);

  // ── Ringtone playback ─────────────────────────────────────────────
  useEffect(() => {
    if (callState !== 'incoming' && callState !== 'outgoing') return;
    const tones = ringtoneRef.current;
    if (!tones) return;

    const audio = callState === 'incoming' ? tones.incoming : tones.outgoing;
    audio.currentTime = 0;
    audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [callState]);

  // ── Re-play remote video when ref target changes ────────────────
  useEffect(() => {
    const track = remoteVideoTrackRef.current;
    const el = remoteVideoRef.current;
    if (track && el && isRemoteVideoOn) {
      track.play(el);
    }
  });

  // ── Cleanup ───────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    if (localTrackRef.current) {
      localTrackRef.current.stop();
      localTrackRef.current.close();
      localTrackRef.current = null;
    }
    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.stop();
      localVideoTrackRef.current.close();
      localVideoTrackRef.current = null;
    }
    remoteVideoTrackRef.current = null;
    if (agoraClientRef.current) {
      agoraClientRef.current.leave().catch(() => {});
      agoraClientRef.current = null;
    }
    if (restoreVolumeRef.current) {
      restoreVolumeRef.current();
      restoreVolumeRef.current = null;
    }
    window.dispatchEvent(new CustomEvent('dm-call:end'));
    updateCallState('idle');
    setPeer(null);
    peerRef.current = null;
    setParticipants([]);
    setIsVideoOn(false);
    setIsRemoteVideoOn(false);
    setIsMuted(false);
    setIsSpeaker(true);
  }, [updateCallState]);

  // ── Agora connection ──────────────────────────────────────────────
  const connectAgora = useCallback(
    async (channel: string, token: string, appId: string, uid: number) => {
      const { client, audioTrack } = await connectToAgoraCall(
        channel,
        token,
        appId,
        uid,
        {
          onRemoteVideo: (track) => {
            remoteVideoTrackRef.current = track;
            setIsRemoteVideoOn(true);
            if (remoteVideoRef.current) {
              track.play(remoteVideoRef.current);
            }
          },
          onRemoteVideoStopped: () => {
            remoteVideoTrackRef.current = null;
            setIsRemoteVideoOn(false);
          },
        },
      );
      localTrackRef.current = audioTrack;
      agoraClientRef.current = client;
      updateCallState('active', peerRef.current?.name);
      new Audio('/room-join.mp3').play().catch(() => {});
    },
    [updateCallState],
  );

  const joinAgoraWithToken = useCallback(
    async (channel: string, token: string, appId: string, uid: number) => {
      try {
        await connectAgora(channel, token, appId, uid);
      } catch (err) {
        if (err instanceof Error) toast.error(err.message);
        cleanup();
      }
    },
    [connectAgora, cleanup],
  );

  const joinAgoraChannel = useCallback(
    async (channel: string) => {
      try {
        const data = await fetchCallToken(channel);
        await connectAgora(channel, data.token, data.appId, data.uid);
      } catch (err) {
        if (err instanceof Error) toast.error(err.message);
        cleanup();
      }
    },
    [connectAgora, cleanup],
  );

  // ── Call actions ──────────────────────────────────────────────────
  const initiateCall = useCallback(
    (callPeer: CallPeer) => {
      if (!socket || callStateRef.current !== 'idle') return;
      setPeer(callPeer);
      peerRef.current = callPeer;
      updateCallState('outgoing');
      socket.emit(
        'call:initiate',
        { receiverId: callPeer.id },
        (res: { success: boolean }) => {
          if (!res.success) cleanup();
        },
      );
    },
    [socket, cleanup, updateCallState],
  );

  const acceptCall = useCallback(() => {
    if (!socket || !peer || callStateRef.current !== 'incoming') return;
    socket.emit(
      'call:accept',
      { callerId: peer.id },
      (res: {
        success: boolean;
        channelName?: string;
        token?: string;
        appId?: string;
        uid?: number;
      }) => {
        if (!res.success || !res.channelName) {
          cleanup();
          return;
        }
        if (res.token && res.appId && res.uid) {
          joinAgoraWithToken(res.channelName, res.token, res.appId, res.uid);
        } else {
          joinAgoraChannel(res.channelName);
        }
      },
    );
  }, [socket, peer, joinAgoraChannel, joinAgoraWithToken, cleanup]);

  const rejectCall = useCallback(() => {
    if (!socket || !peer) return;
    socket.emit('call:reject', { callerId: peer.id });
    cleanup();
  }, [socket, peer, cleanup]);

  const endCall = useCallback(() => {
    if (!socket || !peer) return;
    socket.emit('call:end', { peerId: peer.id });
    cleanup();
  }, [socket, peer, cleanup]);

  const toggleMute = useCallback(() => {
    if (localTrackRef.current) {
      try {
        const next = !isMuted;
        localTrackRef.current.setEnabled(!next);
        setIsMuted(next);
      } catch {
        // Track may have been disposed
      }
    }
  }, [isMuted]);

  const toggleVideo = useCallback(async () => {
    if (!agoraClientRef.current) return;
    try {
      if (isVideoOn) {
        if (localVideoTrackRef.current) {
          await agoraClientRef.current.unpublish([localVideoTrackRef.current]);
          localVideoTrackRef.current.stop();
          localVideoTrackRef.current.close();
          localVideoTrackRef.current = null;
        }
        setIsVideoOn(false);
      } else {
        const videoTrack = await createCallVideoTrack(agoraClientRef.current);
        localVideoTrackRef.current = videoTrack;
        if (localVideoRef.current) videoTrack.play(localVideoRef.current);
        setIsVideoOn(true);
      }
    } catch {
      // Permission denied or camera unavailable — don't crash
    }
  }, [isVideoOn]);

  const toggleSpeaker = useCallback(() => {
    if (!checkIsMobile()) return;
    const next = !isSpeaker;
    import('@capacitor/core').then(({ registerPlugin }) => {
      const NWAudioSession = registerPlugin<{
        setOutputToSpeaker: () => Promise<void>;
        setOutputToEarpiece: () => Promise<void>;
      }>('NWAudioSession');
      (next
        ? NWAudioSession.setOutputToSpeaker()
        : NWAudioSession.setOutputToEarpiece()
      ).catch(() => {});
    });
    setIsSpeaker(next);
  }, [isSpeaker]);

  const inviteFriend = useCallback(
    (invitee: CallPeer) => {
      if (!socket || callStateRef.current !== 'active') return;
      socket.emit(
        'call:invite',
        { inviteeId: invitee.id },
        (res: { success: boolean }) => {
          if (res.success) {
            setParticipants((prev) =>
              prev.some((p) => p.id === invitee.id) ? prev : [...prev, invitee],
            );
          }
        },
      );
    },
    [socket],
  );

  // ── Socket event listeners ────────────────────────────────────────
  // Use refs to avoid re-registering listeners when callbacks change.
  // Re-registration creates a brief window where events can be missed,
  // which is the root cause of the initiator not seeing the call overlay
  // after the receiver accepts.
  const joinAgoraChannelRef = useRef(joinAgoraChannel);
  const cleanupRef = useRef(cleanup);
  const updateCallStateRef = useRef(updateCallState);
  useEffect(() => {
    joinAgoraChannelRef.current = joinAgoraChannel;
  }, [joinAgoraChannel]);
  useEffect(() => {
    cleanupRef.current = cleanup;
  }, [cleanup]);
  useEffect(() => {
    updateCallStateRef.current = updateCallState;
  }, [updateCallState]);

  useEffect(() => {
    if (!socket) return;

    const onIncoming = (data: {
      callerId: string;
      callerName: string;
      callerPhoto: string | null;
    }) => {
      if (callStateRef.current !== 'idle') return;
      const incomingPeer = {
        id: data.callerId,
        name: data.callerName,
        photo: data.callerPhoto,
      };
      setPeer(incomingPeer);
      peerRef.current = incomingPeer;
      updateCallStateRef.current('incoming', incomingPeer.name);
    };

    const onAccepted = (data: { channelName: string }) => {
      if (callStateRef.current === 'outgoing') {
        joinAgoraChannelRef.current(data.channelName);
      }
    };

    const onRejected = () => {
      if (callStateRef.current === 'outgoing') cleanupRef.current();
    };

    const onEnded = () => cleanupRef.current();

    const onParticipantLeft = (data: { userId: string }) => {
      setParticipants((prev) => prev.filter((p) => p.id !== data.userId));
    };

    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:rejected', onRejected);
    socket.on('call:ended', onEnded);
    socket.on('call:participant_left', onParticipantLeft);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:rejected', onRejected);
      socket.off('call:ended', onEnded);
      socket.off('call:participant_left', onParticipantLeft);
    };
  }, [socket]);

  return (
    <CallContext.Provider
      value={{
        callState,
        peer,
        participants,
        isMuted,
        isVideoOn,
        isSpeaker,
        isRemoteVideoOn,
        remoteVideoRef,
        localVideoRef,
        callDuration,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleVideo,
        toggleSpeaker,
        inviteFriend,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
