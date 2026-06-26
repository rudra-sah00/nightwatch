'use client';

import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import Image from 'next/image';
import { useEffect } from 'react';
import { useCall } from '@/features/friends/hooks/use-call';

/**
 * TV Call Overlay.
 * Shows when there's an incoming/outgoing/active call.
 * Floating card in top-right corner with D-pad controls.
 * Focus is trapped within the overlay when a call is incoming.
 */
export function TvCallOverlay() {
  const {
    callState,
    peer,
    isMuted,
    isRemoteVideoOn,
    remoteVideoRef,
    callDuration,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  } = useCall();

  const trapFocus = callState === 'incoming';

  const { ref, focusKey, focusSelf } = useFocusable({
    focusKey: 'TV_CALL_OVERLAY',
    isFocusBoundary: trapFocus,
    focusBoundaryDirections: trapFocus
      ? ['up', 'down', 'left', 'right']
      : undefined,
    trackChildren: true,
  });

  // Auto-focus overlay when an incoming call arrives
  useEffect(() => {
    if (callState === 'incoming') {
      const timer = setTimeout(() => focusSelf(), 50);
      return () => clearTimeout(timer);
    }
  }, [callState, focusSelf]);

  if (callState === 'idle' || !peer) return null;

  const minutes = Math.floor(callDuration / 60);
  const seconds = callDuration % 60;
  const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        className="fixed top-6 right-6 z-[100] w-[320px] bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl"
      >
        {/* Remote video (if camera on) */}
        {isRemoteVideoOn && (
          <div
            ref={remoteVideoRef}
            className="w-full h-[180px] bg-zinc-900 [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
          />
        )}

        {/* Info */}
        <div className="p-4 flex items-center gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center overflow-hidden shrink-0">
            {peer.photo ? (
              <Image
                src={peer.photo}
                alt=""
                className="w-full h-full object-cover"
                width={48}
                height={48}
                unoptimized
              />
            ) : (
              <span className="text-lg font-bold text-white">
                {peer.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm truncate">{peer.name}</p>
            <p className="text-xs text-white/50">
              {callState === 'incoming' && 'Incoming call...'}
              {callState === 'outgoing' && 'Calling...'}
              {callState === 'active' && durationStr}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 px-4 pb-4">
          {callState === 'incoming' && (
            <>
              <AcceptBtn onPress={acceptCall} />
              <DeclineBtn onPress={rejectCall} />
            </>
          )}
          {callState === 'outgoing' && <DeclineBtn onPress={endCall} />}
          {callState === 'active' && (
            <>
              <MuteBtn isMuted={isMuted} onPress={toggleMute} />
              <DeclineBtn onPress={endCall} />
            </>
          )}
        </div>
      </div>
    </FocusContext.Provider>
  );
}

function AcceptBtn({ onPress }: { onPress: () => void }) {
  const { ref, focused } = useFocusable({ onEnterPress: onPress });
  return (
    <button
      ref={ref}
      type="button"
      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${focused ? 'bg-green-500 scale-105' : 'bg-green-500/20'}`}
    >
      <span className="material-symbols-outlined text-green-400">call</span>
      <span className="text-sm font-bold text-green-400">Accept</span>
    </button>
  );
}

function DeclineBtn({ onPress }: { onPress: () => void }) {
  const { ref, focused } = useFocusable({ onEnterPress: onPress });
  return (
    <button
      ref={ref}
      type="button"
      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${focused ? 'bg-red-500 scale-105' : 'bg-red-500/20'}`}
    >
      <span className="material-symbols-outlined text-red-400">call_end</span>
      <span className="text-sm font-bold text-red-400">End</span>
    </button>
  );
}

function MuteBtn({
  isMuted,
  onPress,
}: {
  isMuted: boolean;
  onPress: () => void;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onPress });
  return (
    <button
      ref={ref}
      type="button"
      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all ${focused ? 'bg-white/20 scale-105' : 'bg-white/5'}`}
    >
      <span className="material-symbols-outlined text-white/70">
        {isMuted ? 'mic_off' : 'mic'}
      </span>
      <span className="text-sm font-bold text-white/70">
        {isMuted ? 'Unmute' : 'Mute'}
      </span>
    </button>
  );
}
