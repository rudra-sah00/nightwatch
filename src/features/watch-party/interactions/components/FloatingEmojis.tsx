'use client';

import { memo } from 'react';
import type { FloatingEmoji } from '../hooks/use-floating-emojis';
import { useFloatingEmojis } from '../hooks/use-floating-emojis';

const FloatingEmojiItem = memo(
  ({
    emoji,
    left,
    duration,
    rotation,
    wiggleOffsets,
    userName,
  }: Omit<FloatingEmoji, 'id'>) => {
    return (
      <div
        className="emoji-float absolute bottom-28 flex flex-col items-center gap-2"
        style={
          {
            left: `${left}%`,
            '--duration': `${duration}s`,
            '--wiggle-1': `${wiggleOffsets[0]}px`,
            '--wiggle-2': `${wiggleOffsets[1]}px`,
            '--wiggle-3': `${wiggleOffsets[2]}px`,
            '--rot': `${rotation}deg`,
          } as React.CSSProperties
        }
      >
        <span className="text-4xl md:text-6xl drop-shadow-2xl select-none filter transition-transform duration-500 hover:scale-125">
          {emoji}
        </span>
        <span className="text-[10px] md:text-xs font-bold text-primary-foreground bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full shadow-lg border border-white/20 whitespace-nowrap select-none">
          {userName}
        </span>
      </div>
    );
  },
);

FloatingEmojiItem.displayName = 'FloatingEmojiItem';

export function FloatingEmojis() {
  const { activeEmojis } = useFloatingEmojis();

  return (
    <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden">
      <style>{`
                @keyframes floating-up {
                    0% {
                        transform: translate3d(0, 20px, 0) scale(0);
                        opacity: 0;
                    }
                    20% {
                        opacity: 1;
                        transform: translate3d(var(--wiggle-1), -10vh, 0) scale(1.1);
                    }
                    100% {
                        transform: translate3d(var(--wiggle-2), -25vh, 0) scale(0.8);
                        opacity: 0;
                    }
                }
                .emoji-float {
                    will-change: transform, opacity;
                    animation: floating-up var(--duration) ease-out forwards;
                }
            `}</style>
      {activeEmojis.map((e) => (
        <FloatingEmojiItem
          key={e.id}
          emoji={e.emoji}
          userName={e.userName}
          left={e.left}
          duration={e.duration}
          rotation={e.rotation}
          wiggleOffsets={e.wiggleOffsets}
        />
      ))}
    </div>
  );
}
