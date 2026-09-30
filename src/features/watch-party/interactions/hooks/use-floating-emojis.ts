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
 * Ceiling on emoji animating at once.
 *
 * The list was previously bounded only by each entry's own 4.5 s timer, which bounds nothing when
 * arrivals outpace expiry. Measured before this cap: 500 distinct emoji strings produced 500
 * simultaneous entries, and 200 senders of the *same* emoji produced 200, because the dedup below
 * keys on emoji and sender together and so does not constrain either axis. Every entry is a live
 * animated DOM node, and emoji is one of the message kinds with no permission to revoke, so there
 * was no way to stop a flood once it started.
 *
 * 40 is well above anything a real party produces — ten members reacting every couple of seconds
 * sits around 20 — and far below a number that costs frames.
 */
const MAX_ACTIVE_EMOJIS = 40;

/**
 * Longest string accepted as an emoji.
 *
 * `emoji` arrives off the wire and is rendered as text with no length check: a 100,000-character
 * string was accepted and stored verbatim. A ZWJ sequence with skin-tone modifiers — a family
 * emoji is the worst realistic case — stays under about 25 UTF-16 units, so this rejects abuse
 * without rejecting anything a picker can legitimately send.
 */
const MAX_EMOJI_LENGTH = 32;

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

      setActiveEmojis((current) => {
        const next = [
          ...current,
          { id, emoji, userName, left, duration, rotation, wiggleOffsets },
        ];
        /*
          Drop from the front when over the ceiling. The oldest entries are the ones furthest
          through their animation, so they are the least disruptive to lose — and losing the tail
          of an animation is a far better failure than an unbounded number of them.

          Their expiry timers are left alone deliberately: each filters by id and becomes a no-op
          once its entry is already gone, and cancelling them here would mean tracking which ids
          were dropped for no benefit.
        */
        return next.length > MAX_ACTIVE_EMOJIS
          ? next.slice(next.length - MAX_ACTIVE_EMOJIS)
          : next;
      });

      // Remove emoji after animation (4s max)
      const timerId = setTimeout(() => {
        timeoutsRef.current.delete(timerId);
        setActiveEmojis((current) => current.filter((e) => e.id !== id));
      }, 4500);
      timeoutsRef.current.add(timerId);
    },
    [t],
  );

  const recentEmojiIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const cleanup = onPartyInteraction(
      (msg: {
        type?: string;
        kind?: string;
        emoji?: string;
        userName?: string;
        messageId?: string;
      }) => {
        if (msg.type === 'INTERACTION' && msg.kind === 'emoji' && msg.emoji) {
          /*
            `emoji` is rendered as text straight off the wire. It was accepted at any length — a
            100,000-character string was stored and rendered verbatim — and `typeof` was never
            checked, so a non-string would reach the dedup key and the DOM. The WP-C1 sender gate
            does not cover INTERACTION (there is no emoji permission to consult), so shape is the
            only check available here.
          */
          if (
            typeof msg.emoji !== 'string' ||
            msg.emoji.length > MAX_EMOJI_LENGTH
          ) {
            return;
          }
          // Deduplicate RTM retries using messageId if present
          const dedupKey =
            msg.messageId ||
            `${msg.emoji}-${msg.userName}-${Math.floor(Date.now() / 500)}`;
          if (recentEmojiIds.current.has(dedupKey)) return;
          recentEmojiIds.current.add(dedupKey);
          /*
            Registered in `timeoutsRef` like `spawnEmoji`'s removal timer, so the unmount effect
            clears it too. It was previously the one timer in this hook left untracked — harmless in
            effect, since the callback only mutates a ref that is about to be collected, but it is
            the same class of leak the sibling timer was deliberately tracked to avoid.
          */
          const dedupTimer = setTimeout(() => {
            timeoutsRef.current.delete(dedupTimer);
            recentEmojiIds.current.delete(dedupKey);
          }, 2000);
          timeoutsRef.current.add(dedupTimer);
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
