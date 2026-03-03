'use client';

import { useCallback, useEffect, useState } from 'react';
import { onPartyInteraction } from '../../room/services/watch-party.api';

export interface FloatingEmoji {
  id: string;
  emoji: string;
  userName: string;
  left: number;
  duration: number;
  rotation: number;
  wiggleOffsets: number[];
}

export function useFloatingEmojis() {
  const [activeEmojis, setActiveEmojis] = useState<FloatingEmoji[]>([]);

  const spawnEmoji = useCallback((emoji: string, userName: string) => {
    const burstCount = 4 + Math.floor(Math.random() * 3); // 4 to 6 emojis

    for (let i = 0; i < burstCount; i++) {
      const id = Math.random().toString(36).substring(2, 11);
      const delay = i * 80 + Math.random() * 50;

      setTimeout(() => {
        const newEmoji: FloatingEmoji = {
          id,
          emoji,
          userName,
          left: Math.random() * 80 + 10,
          duration: 1.2 + Math.random() * 0.8,
          rotation: Math.random() * 60 - 30,
          wiggleOffsets: [
            Math.random() * 40 - 20,
            Math.random() * 80 - 40,
            Math.random() * 120 - 60,
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

  return { activeEmojis, spawnEmoji };
}
