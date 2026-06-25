'use client';

import { SmilePlus } from 'lucide-react';
import { useState } from 'react';

const QUICK_EMOJIS = [
  '❤️',
  '🔥',
  '😂',
  '👀',
  '💯',
  '👏',
  '😮',
  '🎬',
  '🍿',
  '🎵',
  '🎮',
  '💀',
  '🫡',
  '✨',
];

interface ReactionBarProps {
  reactionsMap: Record<string, number>;
  totalReactions: number;
  onReact: (emoji: string) => void;
  onRemove: (emoji: string) => void;
}

/**
 * Discord-style reaction bar — shows existing reactions as pills,
 * plus a picker button to add new ones.
 */
export function ReactionBar({
  reactionsMap,
  totalReactions,
  onReact,
  onRemove,
}: ReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const activeReactions = Object.entries(reactionsMap).filter(
    ([, count]) => count > 0,
  );

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Existing reactions */}
      {activeReactions.map(([emoji, count]) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onRemove(emoji)}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full border border-border bg-muted/50 hover:bg-muted text-xs transition-colors"
        >
          <span>{emoji}</span>
          <span className="text-foreground/60">{count}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setPickerOpen(!pickerOpen)}
          className="flex items-center gap-1 p-1.5 rounded-full text-foreground/40 hover:text-foreground/70 hover:bg-muted transition-colors"
        >
          <SmilePlus className="w-4 h-4" />
          {totalReactions > 0 && activeReactions.length === 0 && (
            <span className="text-xs">{totalReactions}</span>
          )}
        </button>

        {/* Emoji picker popup */}
        {pickerOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setPickerOpen(false)}
            />
            <div className="absolute bottom-8 left-0 z-20 bg-card border border-border rounded-xl shadow-lg p-2 flex flex-wrap gap-1 w-[280px]">
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onReact(emoji);
                    setPickerOpen(false);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-base"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
