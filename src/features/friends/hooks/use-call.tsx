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
import { checkIsMobile } from '@/lib/electron-bridge';
import { useSocket } from '@/providers/socket-provider';
import {
  connectToAgoraCall,
  createCallVideoTrack,
  fetchCallToken,
} from '../call/call.service';
import {
  destroyRingtones,
  playRingtone,
  preloadRingtones,
  type RingtoneRefs,
  startMediaDucking,
} from '../call/call-media';
import {
  activateCallAudioSession,
  deactivateCallAudioSession,
  endNativeOutgoingCall,
  hideNativeCallUI,
  registerNativeCallListeners,
  reportOutgoingCallConnected,
  showNativeActiveCall,
  showNativeIncomingCall,
  showNativeOutgoingCall,
  toggleAudioOutput,
} from '../call/call-native';

// ── Types ───────────────────────────────────────────────────────────

export type CallState = 'idle' | 'outgoing' | 'incoming' | 'active';

export interface CallPeer {
  id: string;
  name: string;
  photo: string | null;
}

interface CallContextType {
  callState: CallState;
  peer: CallPeer | null;
  participants: CallPeer[];
  isMuted: boolean;
  isVideoOn: boolean;
  isSpeaker: boolean;
  isRemoteVideoOn: boolean;
  remoteVideoRef: React.RefObject<HTMLDivElement | null>;
  localVideoRef: React.RefObject<HTMLDivElement | null>;
  callDuration: number;
  initiateCall: (peer: CallPeer) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
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

export const useCall = () => useContext(CallContext);

// ── Provider ────────────────────────────────────────────────────────

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();

  // ── State ─────────────────────────────────────────────────────────
  const [callState, setCallState] = useState<CallState>('idle');
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [participants, setParticipants] = useState<CallPeer[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [isRemoteVideoOn, setIsRemoteVideoOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  // ── Refs ──────────────────────────────────────────────────────────
  const callStateRef = useRef<CallState>('idle');
  const peerRef = useRef<CallPeer | null>(null);
  const callIdRef = useRef(`nw-call-${Date.now()}`);
  const agoraClientRef = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const localVideoTrackRef = useRef<ICameraVideoTrack | null>(null);
  const remoteVideoRef = useRef<HTMLDivElement | null>(null);
  const localVideoRef = useRef<HTMLDivElement | null>(null);
  const remoteVideoTrackRef = useRef<IRemoteVideoTrack | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const restoreMediaRef = useRef<(() => void) | null>(null);
  const ringtoneRef = useRef<RingtoneRefs | null>(null);

  // ── Native state transition ───────────────────────────────────────
  const updateCallState = useCallback((state: CallState, peerName?: string) => {
    callStateRef.current = state;
    setCallState(state);

    if (!checkIsMobile()) return;
    if (state === 'outgoing') {
      showNativeOutgoingCall(peerName || '');
    } else if (state === 'incoming') {
      callIdRef.current = `nw-call-${Date.now()}`;
      showNativeIncomingCall(callIdRef.current, peerName || '');
    } else if (state === 'active') {
      reportOutgoingCallConnected();
      showNativeActiveCall(peerName || '');
    } else if (state === 'idle') {
      endNativeOutgoingCall();
      hideNativeCallUI();
    }
  }, []);

  // ── Ringtone preload ──────────────────────────────────────────────
  useEffect(() => {
    ringtoneRef.current = preloadRingtones();
    return () => {
      if (ringtoneRef.current) destroyRingtones(ringtoneRef.current);
    };
  }, []);

  // ── Duration timer ────────────────────────────────────────────────
  useEffect(() => {
    if (callState !== 'active') {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      setCallDuration(0);
      return;
    }
    setCallDuration(0);
    durationIntervalRef.current = setInterval(
      () => setCallDuration((d) => d + 1),
      1000,
    );
    return () => {
      if (durationIntervalRef.current)
        clearInterval(durationIntervalRef.current);
    };
  }, [callState]);

  // ── Media ducking + audio session ─────────────────────────────────
  useEffect(() => {
    if (callState !== 'active' && callState !== 'incoming') return;
    restoreMediaRef.current = startMediaDucking();
    activateCallAudioSession();
    return () => {
      restoreMediaRef.current?.();
      restoreMediaRef.current = null;
      deactivateCallAudioSession();
    };
  }, [callState]);

  // ── Ringtone playback ─────────────────────────────────────────────
  useEffect(() => {
    if (callState !== 'incoming' && callState !== 'outgoing') return;
    if (!ringtoneRef.current) return;
    return playRingtone(ringtoneRef.current, callState);
  }, [callState]);

  // ── Re-play remote video on ref change ────────────────────────────
  useEffect(() => {
    const track = remoteVideoTrackRef.current;
    const el = remoteVideoRef.current;
    if (track && el && isRemoteVideoOn) track.play(el);
  });

  // ── Cleanup ───────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    localTrackRef.current?.stop();
    localTrackRef.current?.close();
    localTrackRef.current = null;
    localVideoTrackRef.current?.stop();
    localVideoTrackRef.current?.close();
    localVideoTrackRef.current = null;
    remoteVideoTrackRef.current = null;
    agoraClientRef.current?.leave().catch(() => {});
    agoraClientRef.current = null;
    restoreMediaRef.current?.();
    restoreMediaRef.current = null;
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
            if (remoteVideoRef.current) track.play(remoteVideoRef.current);
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

  const joinAgora = useCallback(
    async (channel: string, token?: string, appId?: string, uid?: number) => {
      try {
        if (token && appId && uid) {
          await connectAgora(channel, token, appId, uid);
        } else {
          const data = await fetchCallToken(channel);
          await connectAgora(channel, data.token, data.appId, data.uid);
        }
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
      updateCallState('outgoing', callPeer.name);
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
        joinAgora(res.channelName, res.token, res.appId, res.uid);
      },
    );
  }, [socket, peer, joinAgora, cleanup]);

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

  // ── Native call UI event listeners ────────────────────────────────
  const acceptCallRef = useRef(acceptCall);
  const rejectCallRef = useRef(rejectCall);
  const endCallRef = useRef(endCall);
  useEffect(() => {
    acceptCallRef.current = acceptCall;
  }, [acceptCall]);
  useEffect(() => {
    rejectCallRef.current = rejectCall;
  }, [rejectCall]);
  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  useEffect(() => {
    return registerNativeCallListeners({
      acceptCall: () => acceptCallRef.current(),
      rejectCall: () => rejectCallRef.current(),
      endCall: () => endCallRef.current(),
    });
  }, []);

  // ── Media toggles ─────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localTrackRef.current) return;
    try {
      const next = !isMuted;
      localTrackRef.current.setEnabled(!next);
      setIsMuted(next);
    } catch {
      /* disposed */
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
        const track = await createCallVideoTrack(agoraClientRef.current);
        localVideoTrackRef.current = track;
        if (localVideoRef.current) track.play(localVideoRef.current);
        setIsVideoOn(true);
      }
    } catch {
      /* permission denied */
    }
  }, [isVideoOn]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeaker((prev) => toggleAudioOutput(prev));
  }, []);

  const inviteFriend = useCallback(
    (invitee: CallPeer) => {
      if (!socket || callStateRef.current !== 'active') return;
      socket.emit(
        'call:invite',
        { inviteeId: invitee.id },
        (res: { success: boolean }) => {
          if (res.success)
            setParticipants((prev) =>
              prev.some((p) => p.id === invitee.id) ? prev : [...prev, invitee],
            );
        },
      );
    },
    [socket],
  );

  // ── Socket event listeners ────────────────────────────────────────
  const joinAgoraRef = useRef(joinAgora);
  const cleanupRef = useRef(cleanup);
  const updateCallStateRef = useRef(updateCallState);
  useEffect(() => {
    joinAgoraRef.current = joinAgora;
  }, [joinAgora]);
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
      const p = {
        id: data.callerId,
        name: data.callerName,
        photo: data.callerPhoto,
      };
      setPeer(p);
      peerRef.current = p;
      updateCallStateRef.current('incoming', p.name);
    };
    const onAccepted = (data: { channelName: string }) => {
      if (callStateRef.current === 'outgoing')
        joinAgoraRef.current(data.channelName);
    };
    const onRejected = () => {
      if (callStateRef.current === 'outgoing') cleanupRef.current();
    };
    const onEnded = () => {
      cleanupRef.current();
    };
    const onLeft = (data: { userId: string }) =>
      setParticipants((prev) => prev.filter((p) => p.id !== data.userId));

    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:rejected', onRejected);
    socket.on('call:ended', onEnded);
    socket.on('call:participant_left', onLeft);
    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:rejected', onRejected);
      socket.off('call:ended', onEnded);
      socket.off('call:participant_left', onLeft);
    };
  }, [socket]);

  // ── Render ────────────────────────────────────────────────────────
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
