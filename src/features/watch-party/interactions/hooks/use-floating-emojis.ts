import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { onPartyInteraction } from '../../room/services/watch-party.api';

/** Describes a single floating emoji animation instance. */
export interface FloatingEmoji {
  id: string;
  emoji: string;
  userName: string;
  left: number;
  duration: number;
  rotation: number;
  wiggleOffsets: number[];
}

/**
 * Manages the list of active floating emoji animations.
 *
 * Listens for incoming `INTERACTION` events via {@link onPartyInteraction}
 * and spawns animated emoji instances that auto-remove after their animation
 * completes (~4.5 s).
 *
 * @returns The active emoji list and a manual `spawnEmoji` helper.
 */
export function useFloatingEmojis() {
  const [activeEmojis, setActiveEmojis] = useState<FloatingEmoji[]>([]);
  const t = useTranslations('party.fallback');
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      for (const id of timeoutsRef.current) clearTimeout(id);
    };
  }, []);

  const spawnEmoji = useCallback(
    (emoji: string, userName = t('someone')) => {
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
      const timerId = setTimeout(() => {
        timeoutsRef.current.delete(timerId);
        setActiveEmojis((current) => current.filter((e) => e.id !== id));
      }, 4500);
      timeoutsRef.current.add(timerId);
    },
    [t],
  );

  useEffect(() => {
    const cleanup = onPartyInteraction(
      (msg: {
        type?: string;
        kind?: string;
        emoji?: string;
        userName?: string;
      }) => {
        if (msg.type === 'INTERACTION' && msg.kind === 'emoji' && msg.emoji) {
          spawnEmoji(msg.emoji, msg.userName || t('someone'));
        }
      },
    );
    return cleanup;
  }, [spawnEmoji, t]);

  return {
    activeEmojis,
    spawnEmoji,
  };
}
