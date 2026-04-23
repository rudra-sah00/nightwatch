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
import { useSocket } from '@/providers/socket-provider';
import {
  connectToAgoraCall,
  createCallVideoTrack,
  fetchCallToken,
} from '../call/call.service';
import { duckMediaElements } from '../call/call.utils';

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
  inviteFriend: (peer: CallPeer) => void;
}

const CallContext = createContext<CallContextType>({
  callState: 'idle',
  peer: null,
  participants: [],
  isMuted: false,
  isVideoOn: false,
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
  inviteFriend: () => {},
});

export const useCall = () => useContext(CallContext);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const [callState, setCallState] = useState<CallState>('idle');
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [participants, setParticipants] = useState<CallPeer[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isRemoteVideoOn, setIsRemoteVideoOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const callStateRef = useRef<CallState>('idle');
  const updateCallState = useCallback((state: CallState) => {
    callStateRef.current = state;
    setCallState(state);
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

  // ── Media ducking ─────────────────────────────────────────────────
  useEffect(() => {
    if (callState === 'active') {
      restoreVolumeRef.current = duckMediaElements(0.2);
      window.dispatchEvent(new CustomEvent('dm-call:start'));
    }
    return () => {
      if (restoreVolumeRef.current) {
        restoreVolumeRef.current();
        restoreVolumeRef.current = null;
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
    setParticipants([]);
    setIsVideoOn(false);
    setIsRemoteVideoOn(false);
    setIsMuted(false);
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
      updateCallState('active');
      new Audio('/room-join.mp3').play().catch(() => {});
    },
    [updateCallState],
  );

  const joinAgoraWithToken = useCallback(
    async (channel: string, token: string, appId: string, uid: number) => {
      try {
        await connectAgora(channel, token, appId, uid);
      } catch {
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
      } catch {
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
      const next = !isMuted;
      localTrackRef.current.setEnabled(!next);
      setIsMuted(next);
    }
  }, [isMuted]);

  const toggleVideo = useCallback(async () => {
    if (!agoraClientRef.current) return;
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
  }, [isVideoOn]);

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
  useEffect(() => {
    if (!socket) return;

    const onIncoming = (data: {
      callerId: string;
      callerName: string;
      callerPhoto: string | null;
    }) => {
      if (callStateRef.current !== 'idle') return;
      setPeer({
        id: data.callerId,
        name: data.callerName,
        photo: data.callerPhoto,
      });
      updateCallState('incoming');
    };

    const onAccepted = (data: { channelName: string }) => {
      if (callStateRef.current === 'outgoing') {
        joinAgoraChannel(data.channelName);
      }
    };

    const onRejected = () => {
      if (callStateRef.current === 'outgoing') cleanup();
    };

    const onEnded = () => cleanup();

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
  }, [socket, joinAgoraChannel, cleanup, updateCallState]);

  return (
    <CallContext.Provider
      value={{
        callState,
        peer,
        participants,
        isMuted,
        isVideoOn,
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
        inviteFriend,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
