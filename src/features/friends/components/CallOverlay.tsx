'use client';

import { Mic, MicOff, Phone, PhoneOff } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useCall } from '@/features/friends/hooks/use-call';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function CallOverlay() {
  const {
    callState,
    peer,
    isMuted,
    callDuration,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
  } = useCall();

  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  const isActive = callState !== 'idle' && !!peer;

  // Enter animation
  useEffect(() => {
    if (isActive) {
      setExiting(false);
      // Small delay for mount → animate
      requestAnimationFrame(() => setVisible(true));
    }
  }, [isActive]);

  // Exit animation
  useEffect(() => {
    if (!isActive && visible) {
      setExiting(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setExiting(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isActive, visible]);

  if (!visible && !isActive) return null;

  return (
    <div
      className={`fixed top-4 right-4 z-[90] transition-all duration-300 ease-out ${
        exiting
          ? 'opacity-0 translate-y-[-20px] scale-95'
          : isActive
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-[-20px] scale-95'
      }`}
    >
      <div className="w-72 bg-black/30 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
        {peer && (
          <>
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
              {peer.photo ? (
                <Image
                  src={peer.photo}
                  alt={peer.name}
                  width={40}
                  height={40}
                  className="rounded-full border-2 border-white/20 object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-10 h-10 rounded-full border-2 border-white/20 bg-white/10 flex items-center justify-center font-headline font-black text-sm uppercase text-white">
                  {peer.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-headline font-bold text-sm truncate text-white">
                  {peer.name}
                </p>
                <p className="text-xs text-white/60 font-headline uppercase tracking-widest">
                  {callState === 'incoming' && 'Incoming call...'}
                  {callState === 'outgoing' && 'Calling...'}
                  {callState === 'active' && formatDuration(callDuration)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 px-4 pb-4">
              {callState === 'incoming' && (
                <>
                  <button
                    type="button"
                    onClick={rejectCall}
                    className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                    aria-label="Decline"
                  >
                    <PhoneOff className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={acceptCall}
                    className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors"
                    aria-label="Accept"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                </>
              )}

              {(callState === 'outgoing' || callState === 'active') && (
                <>
                  <button
                    type="button"
                    onClick={toggleMute}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isMuted
                        ? 'bg-red-500/30 text-red-400'
                        : 'bg-white/15 text-white'
                    }`}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? (
                      <MicOff className="w-4 h-4" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={endCall}
                    className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                    aria-label={
                      callState === 'outgoing' ? 'Cancel' : 'End call'
                    }
                  >
                    <PhoneOff className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
