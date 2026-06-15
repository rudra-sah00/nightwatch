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
      {/* Third card */}
      {thirdSong && (
        <div
          className="absolute w-[calc(100%-6rem)] max-w-[300px] aspect-[3/4] rounded-3xl overflow-hidden border-2 border-border/30 scale-[0.88] translate-y-4 transition-all duration-300"
          style={{ opacity: animating ? 0.6 : 0.4 }}
        >
          <Image src={thirdSong.image} alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      {/* Second card */}
      {nextSong && (
        <div
          className="absolute w-[calc(100%-4.5rem)] max-w-[320px] aspect-[3/4] rounded-3xl overflow-hidden border-2 border-border/50 transition-all duration-300"
          style={{
            opacity: animating ? 0.8 : 0.6,
            transform: animating
              ? 'scale(1) translateY(0px)'
              : 'scale(0.94) translateY(8px)',
          }}
        >
          <Image src={nextSong.image} alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-black/20" />
        </div>
      )}
    </>
  );
}
