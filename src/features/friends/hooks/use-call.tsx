'use client';

import type { IAgoraRTCClient, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { apiFetch } from '@/lib/fetch';
import { useSocket } from '@/providers/socket-provider';

export type CallState = 'idle' | 'outgoing' | 'incoming' | 'active';

export interface CallPeer {
  id: string;
  name: string;
  photo: string | null;
}

interface CallContextType {
  callState: CallState;
  peer: CallPeer | null;
  isMuted: boolean;
  callDuration: number;
  initiateCall: (peer: CallPeer) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
}

const CallContext = createContext<CallContextType>({
  callState: 'idle',
  peer: null,
  isMuted: false,
  callDuration: 0,
  initiateCall: () => {},
  acceptCall: () => {},
  rejectCall: () => {},
  endCall: () => {},
  toggleMute: () => {},
});

export const useCall = () => useContext(CallContext);

/**
 * Duck all <video> and <audio> elements on the page during a call.
 * Restores original volumes when the call ends.
 */
function duckMediaElements(factor: number): () => void {
  const saved: { el: HTMLMediaElement; vol: number }[] = [];
  for (const el of document.querySelectorAll<HTMLMediaElement>(
    'video, audio',
  )) {
    saved.push({ el, vol: el.volume });
    el.volume = Math.max(0, el.volume * factor);
  }
  return () => {
    for (const { el, vol } of saved) {
      try {
        el.volume = vol;
      } catch {
        // Element may have been removed
      }
    }
  };
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const [callState, setCallState] = useState<CallState>('idle');
  const [peer, setPeer] = useState<CallPeer | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const agoraClientRef = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const restoreVolumeRef = useRef<(() => void) | null>(null);

  // Duration timer
  useEffect(() => {
    if (callState === 'active') {
      setCallDuration(0);
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
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

  // Duck media when call becomes active, restore when idle
  useEffect(() => {
    if (callState === 'active') {
      // Duck all playing media to 20% volume
      restoreVolumeRef.current = duckMediaElements(0.2);
      // Notify watch party (if active) that a DM call started
      window.dispatchEvent(new CustomEvent('dm-call:start'));
    }

    return () => {
      if (restoreVolumeRef.current) {
        restoreVolumeRef.current();
        restoreVolumeRef.current = null;
      }
    };
  }, [callState]);

  const cleanup = useCallback(() => {
    // Leave Agora channel (separate client from watch party — no conflict)
    if (localTrackRef.current) {
      localTrackRef.current.stop();
      localTrackRef.current.close();
      localTrackRef.current = null;
    }
    if (agoraClientRef.current) {
      agoraClientRef.current.leave().catch(() => {});
      agoraClientRef.current = null;
    }
    // Restore ducked volumes
    if (restoreVolumeRef.current) {
      restoreVolumeRef.current();
      restoreVolumeRef.current = null;
    }
    // Notify watch party that DM call ended
    window.dispatchEvent(new CustomEvent('dm-call:end'));

    setCallState('idle');
    setPeer(null);
    setIsMuted(false);
  }, []);

  const joinAgoraChannel = useCallback(
    async (channel: string) => {
      try {
        const { token, appId, uid } = await apiFetch<{
          token: string;
          appId: string;
          uid: number;
        }>(`/api/agora/call-token?channelName=${encodeURIComponent(channel)}`);

        // Create a NEW Agora client — separate from any watch party client.
        // Agora SDK supports multiple clients in the same page.
        const AgoraRTC = (await import('agora-rtc-sdk-ng')).default;
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

        await client.join(appId, channel, token, uid);

        const localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        await client.publish([localAudioTrack]);

        localTrackRef.current = localAudioTrack;
        agoraClientRef.current = client;

        // Auto-subscribe to remote audio
        client.on('user-published', async (remoteUser, mediaType) => {
          if (mediaType === 'audio') {
            await client.subscribe(remoteUser, mediaType);
            remoteUser.audioTrack?.play();
          }
        });

        setCallState('active');
      } catch {
        cleanup();
      }
    },
    [cleanup],
  );

  const initiateCall = useCallback(
    (callPeer: CallPeer) => {
      if (!socket || callState !== 'idle') return;

      setPeer(callPeer);
      setCallState('outgoing');

      socket.emit(
        'call:initiate',
        { receiverId: callPeer.id },
        (res: { success: boolean; channelName?: string; error?: string }) => {
          if (!res.success) {
            cleanup();
          }
        },
      );
    },
    [socket, callState, cleanup],
  );

  const acceptCall = useCallback(() => {
    if (!socket || !peer || callState !== 'incoming') return;

    socket.emit(
      'call:accept',
      { callerId: peer.id },
      (res: { success: boolean; channelName?: string }) => {
        if (res.success && res.channelName) {
          joinAgoraChannel(res.channelName);
        } else {
          cleanup();
        }
      },
    );
  }, [socket, peer, callState, joinAgoraChannel, cleanup]);

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
      const newMuted = !isMuted;
      localTrackRef.current.setEnabled(!newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const onIncoming = (data: {
      callerId: string;
      callerName: string;
      callerPhoto: string | null;
      channelName: string;
    }) => {
      if (callState !== 'idle') return;
      setPeer({
        id: data.callerId,
        name: data.callerName,
        photo: data.callerPhoto,
      });
      setCallState('incoming');
    };

    const onAccepted = (data: { channelName: string }) => {
      if (callState === 'outgoing') {
        joinAgoraChannel(data.channelName);
      }
    };

    const onRejected = () => {
      if (callState === 'outgoing') cleanup();
    };

    const onEnded = () => cleanup();

    socket.on('call:incoming', onIncoming);
    socket.on('call:accepted', onAccepted);
    socket.on('call:rejected', onRejected);
    socket.on('call:ended', onEnded);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:accepted', onAccepted);
      socket.off('call:rejected', onRejected);
      socket.off('call:ended', onEnded);
    };
  }, [socket, callState, joinAgoraChannel, cleanup]);

  return (
    <CallContext.Provider
      value={{
        callState,
        peer,
        isMuted,
        callDuration,
        initiateCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
      }}
    >
      {children}
    </CallContext.Provider>
  );
}
