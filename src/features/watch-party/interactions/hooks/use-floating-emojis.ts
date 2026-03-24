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

  const spawnEmoji = useCallback((emoji: string, userName = 'Someone') => {
    const id = Math.random().toString(36).substring(2, 9);

    // Premium animation parameters
    const left = 5 + Math.random() * 90; // 5% to 95% width
    const duration = 2 + Math.random() * 2; // 2s to 4s
    const rotation = -20 + Math.random() * 40; // -20deg to 20deg
    const wiggleOffsets = [
      -20 + Math.random() * 40,
      -40 + Math.random() * 80,
      -60 + Math.random() * 120,
    ];

    setActiveEmojis((current) => [
      ...current,
      { id, emoji, userName, left, duration, rotation, wiggleOffsets },
    ]);

    // Remove emoji after animation (4s max)
    setTimeout(() => {
      setActiveEmojis((current) => current.filter((e) => e.id !== id));
    }, 4500);
  }, []);

  useEffect(() => {
    const cleanup = onPartyInteraction(
      (msg: {
        type?: string;
        kind?: string;
        emoji?: string;
        userName?: string;
      }) => {
        if (msg.type === 'INTERACTION' && msg.kind === 'emoji' && msg.emoji) {
          spawnEmoji(msg.emoji, msg.userName || 'Someone');
        }
      },
    );
    return cleanup;
  }, [spawnEmoji]);

  return {
    activeEmojis,
    spawnEmoji,
  };
}
