'use client';

import Image from 'next/image';
import type { DiscoverSong } from '../api';

interface DiscoverCardStackProps {
  nextSong?: DiscoverSong;
  thirdSong?: DiscoverSong;
  animating: boolean;
}

export function DiscoverCardStack({
  nextSong,
  thirdSong,
  animating,
}: DiscoverCardStackProps) {
  return (
    <>
      {/* Third card — behind, shifted down more */}
      {thirdSong && (
        <div
          className="absolute w-full max-w-[340px] aspect-[3/4] rounded-3xl overflow-hidden border-2 border-border/30 transition-all duration-300"
          style={{
            opacity: animating ? 0.5 : 0.35,
            transform: animating
              ? 'scale(0.95) translateY(12px)'
              : 'scale(0.9) translateY(20px)',
          }}
        >
          <Image src={thirdSong.image} alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      {/* Second card — directly behind, shifted down slightly */}
      {nextSong && (
        <div
          className="absolute w-full max-w-[340px] aspect-[3/4] rounded-3xl overflow-hidden border-2 border-border/50 transition-all duration-300"
          style={{
            opacity: animating ? 0.85 : 0.6,
            transform: animating
              ? 'scale(1) translateY(0px)'
              : 'scale(0.95) translateY(10px)',
          }}
        >
          <Image src={nextSong.image} alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-black/20" />
        </div>
      )}
    </>
  );
}
