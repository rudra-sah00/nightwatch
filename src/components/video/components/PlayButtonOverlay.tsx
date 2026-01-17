'use client';

import React from 'react';
import { PlayIcon } from '@heroicons/react/24/solid';
import { Lock } from 'lucide-react';

interface PlayButtonOverlayProps {
  isPlaying: boolean;
  locked?: boolean;
  onTogglePlay: () => void;
}

export function PlayButtonOverlay({ isPlaying, locked = false, onTogglePlay }: PlayButtonOverlayProps) {
  if (isPlaying) return null;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center z-10 ${
        locked ? 'cursor-not-allowed' : 'cursor-pointer'
      }`}
      onClick={locked ? undefined : onTogglePlay}
    >
      <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-200 ${
        locked 
          ? 'bg-white/50' 
          : 'bg-white/90 hover:bg-white hover:scale-110'
      }`}>
        {locked ? (
          <Lock className="w-8 h-8 text-black/50" />
        ) : (
          <PlayIcon className="w-10 h-10 text-black ml-1" />
        )}
      </div>
      {locked && (
        <div className="absolute bottom-1/3 text-white/80 text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
          Waiting for host to play
        </div>
      )}
    </div>
  );
}
