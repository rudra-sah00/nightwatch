'use client';

import { useFocusable } from '@noriginmedia/norigin-spatial-navigation';
import { memo, useCallback, useState } from 'react';

const EMOJIS = ['👍', '❤️', '😂', '🔥', '😮', '👏'];

interface TvEmojiBarProps {
  onReact: (emoji: string) => void;
}

/**
 * Horizontal emoji reaction bar for TV watch-together.
 * Appears when controls are visible. Each emoji is focusable.
 */
export const TvEmojiBar = memo(function TvEmojiBar({
  onReact,
}: TvEmojiBarProps) {
  return (
    <div className="absolute bottom-32 left-8 z-30 flex gap-2">
      {EMOJIS.map((emoji) => (
        <EmojiBtn key={emoji} emoji={emoji} onPress={() => onReact(emoji)} />
      ))}
    </div>
  );
});

function EmojiBtn({ emoji, onPress }: { emoji: string; onPress: () => void }) {
  const { ref, focused } = useFocusable({ onEnterPress: onPress });
  return (
    <button
      ref={ref}
      type="button"
      className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all ${
        focused ? 'bg-white/20 scale-125' : 'bg-black/40'
      }`}
    >
      {emoji}
    </button>
  );
}

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
}

/**
 * Floating emoji animation overlay. Emojis float up and fade out.
 */
export function TvEmojiOverlay({ reactions }: { reactions: FloatingEmoji[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {reactions.map((r) => (
        <span
          key={r.id}
          className="absolute bottom-20 text-4xl animate-[floatUp_2s_ease-out_forwards]"
          style={{ left: `${r.x}%` }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}

/**
 * Hook to manage emoji reactions (local display + emit to party).
 */
export function useTvEmojis(onEmit?: (emoji: string) => void) {
  const [reactions, setReactions] = useState<FloatingEmoji[]>([]);

  const addReaction = useCallback(
    (emoji: string) => {
      const id = Date.now() + Math.random();
      const x = 10 + Math.random() * 80;
      setReactions((r) => [...r.slice(-10), { id, emoji, x }]);
      onEmit?.(emoji);
      // Auto-remove after animation
      setTimeout(() => {
        setReactions((r) => r.filter((e) => e.id !== id));
      }, 2100);
    },
    [onEmit],
  );

  return { reactions, addReaction };
}
