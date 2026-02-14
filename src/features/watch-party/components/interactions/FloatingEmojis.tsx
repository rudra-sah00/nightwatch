'use client';

import { memo, useCallback, useEffect, useState } from 'react';
import { onPartyInteraction } from '../../api';

interface FloatingEmoji {
  id: string;
  emoji: string;
  userName: string;
  left: number;
  duration: number;
  rotation: number;
  wiggleOffsets: number[];
}

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
        <span className="text-[10px] md:text-xs font-bold text-white bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full shadow-lg border border-white/20 whitespace-nowrap select-none">
          {userName}
        </span>
      </div>
    );
  },
);

FloatingEmojiItem.displayName = 'FloatingEmojiItem';

export function FloatingEmojis() {
  const [activeEmojis, setActiveEmojis] = useState<FloatingEmoji[]>([]);

  const spawnEmoji = useCallback((emoji: string, userName: string) => {
    const burstCount = 4 + Math.floor(Math.random() * 3); // 4 to 6 emojis

    for (let i = 0; i < burstCount; i++) {
      const id = Math.random().toString(36).substring(2, 11);
      const delay = i * 80 + Math.random() * 50; // Snappier staggered spawn

      setTimeout(() => {
        const newEmoji: FloatingEmoji = {
          id,
          emoji,
          userName,
          left: Math.random() * 80 + 10,
          duration: 1.2 + Math.random() * 0.8, // Faster: 1.2s to 2s
          rotation: Math.random() * 60 - 30,
          wiggleOffsets: [
            Math.random() * 40 - 20, // wiggle 1
            Math.random() * 80 - 40, // wiggle 2
            Math.random() * 120 - 60, // wiggle 3
          ],
        };

        setActiveEmojis((prev) => [...prev, newEmoji]);

        setTimeout(
          () => {
            setActiveEmojis((prev) => prev.filter((e) => e.id !== id));
          },
          newEmoji.duration * 1000 + 100,
        );
      }, delay);
    }
  }, []);

  useEffect(() => {
    return onPartyInteraction((data) => {
      if (data.type === 'emoji') {
        spawnEmoji(data.value, data.userName || 'Guest');
      }
    });
  }, [spawnEmoji]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[100] overflow-hidden">
      <style jsx global>{`
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
