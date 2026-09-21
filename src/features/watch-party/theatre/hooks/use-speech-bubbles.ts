'use client';

import { useEffect, useRef, useState } from 'react';
import { onChatMessage } from '../../room/services/watch-party.api';

/** How long a line stays above the avatar's head. */
const BUBBLE_MS = 6000;

/**
 * Latest chat line per user, for speech bubbles in 3D.
 *
 * Reads the same RTM chat stream the 2D sidebar uses rather than keeping its own
 * history — there is one conversation, and a message said in 3D must appear in
 * the sidebar for anyone in 2D, and vice versa. This only tracks the most recent
 * line per speaker, since a bubble is a transient thing, not a log.
 */
export function useSpeechBubbles(enabled: boolean) {
  const [bubbles, setBubbles] = useState<Record<string, string>>({});
  /** userId -> display name, learned from chat so labels are not raw ids. */
  const [names, setNames] = useState<Record<string, string>>({});
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!enabled) {
      setBubbles({});
      return;
    }
    const unsubscribe = onChatMessage((m) => {
      setBubbles((prev) => ({ ...prev, [m.userId]: m.text }));
      if (m.userName) {
        setNames((prev) =>
          prev[m.userId] === m.userName
            ? prev
            : { ...prev, [m.userId]: m.userName },
        );
      }

      // restart the timer so a fast talker's bubble does not vanish mid-sentence
      const existing = timers.current.get(m.userId);
      if (existing) clearTimeout(existing);
      timers.current.set(
        m.userId,
        setTimeout(() => {
          setBubbles((prev) => {
            const next = { ...prev };
            delete next[m.userId];
            return next;
          });
          timers.current.delete(m.userId);
        }, BUBBLE_MS),
      );
    });
    return () => {
      unsubscribe();
      for (const t of timers.current.values()) clearTimeout(t);
      timers.current.clear();
    };
  }, [enabled]);

  return { bubbles, names };
}
