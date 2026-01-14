'use client';

import React from 'react';
import { PlayIcon } from '@heroicons/react/24/solid';

interface PlayButtonOverlayProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
}

export function PlayButtonOverlay({ isPlaying, onTogglePlay }: PlayButtonOverlayProps) {
  if (isPlaying) return null;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
      onClick={onTogglePlay}
    >
      <div className="w-20 h-20 bg-white/90 rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all duration-200 shadow-2xl">
        <PlayIcon className="w-10 h-10 text-black ml-1" />
      </div>
    </div>
  );
}
