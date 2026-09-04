import type { AskAiMessage, AskAiRole } from '../types';

/**
 * Conversation history accumulation.
 *
 * Nova Sonic streams text in pieces and sends assistant text twice per turn: a
 * SPECULATIVE draft that updates as it generates, then a FINAL settled version.
 * Appending each payload produced duplicate bubbles — exact repeats could be
 * deduped, but a FINAL copy that differs from the draft by so much as a comma
 * could not, so the same line showed twice.
 *
 * Instead each turn carries a key, and text for a key already at the tail of the
 * history replaces it rather than appending. Streaming updates the last bubble
 * in place, and the FINAL copy overwrites the draft.
 *
 * Kept pure so these rules can be tested without a socket.
 */

/** Upper bound on retained turns, so a long session cannot grow without limit. */
export const MAX_HISTORY = 100;

/**
 * Inserts or updates the text for a turn.
 *
 * Appends when `turnKey` is new; replaces the tail when it matches, which is
 * what makes streaming and the draft→final transition idempotent.
 */
export function upsertTurn(
  history: readonly AskAiMessage[],
  role: AskAiRole,
  content: string,
  turnKey: string,
): AskAiMessage[] {
  const trimmed = content.trim();
  if (!trimmed) return history as AskAiMessage[];

  const last = history.at(-1);
  if (last && last.turnKey === turnKey && last.role === role) {
    if (last.content === trimmed) return history as AskAiMessage[];
    const next = history.slice(0, -1);
    next.push({ ...last, content: trimmed });
    return next;
  }

  const next = [...history, { id: turnKey, turnKey, role, content: trimmed }];
  return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
}

/**
 * Builds a turn key, starting a new one whenever the speaker changes.
 *
 * Consecutive content blocks from the same role — the SPECULATIVE and FINAL
 * halves of one reply — share a key and therefore one bubble.
 */
export function nextTurn(
  previous: { role: AskAiRole | null; sequence: number },
  role: AskAiRole,
): { role: AskAiRole; sequence: number; key: string } {
  const sequence =
    previous.role === role ? previous.sequence : previous.sequence + 1;
  return { role, sequence, key: `${role}-${sequence}` };
}

/**
 * True when an assistant text event is a draft rather than the settled turn.
 *
 * `additionalModelFields` arrives as a JSON string on contentStart. Anything
 * other than an explicit SPECULATIVE stage is treated as final, so a missing or
 * malformed field errs toward recording the turn rather than dropping it.
 */
export function isSpeculative(additionalModelFields?: string): boolean {
  if (!additionalModelFields) return false;
  try {
    const parsed = JSON.parse(additionalModelFields) as {
      generationStage?: string;
    };
    return parsed.generationStage === 'SPECULATIVE';
  } catch {
    return false;
  }
}

/**
 * Detects Nova Sonic's barge-in signal.
 *
 * The service reports an interruption either as a `stopReason` on contentEnd or
 * as a sentinel text payload, depending on where in the turn it happens. Both
 * mean the same thing: stop talking and discard queued audio.
 */
export function isInterruption(input: {
  stopReason?: string;
  content?: string;
}): boolean {
  if (input.stopReason === 'INTERRUPTED') return true;
  if (!input.content) return false;
  try {
    const parsed = JSON.parse(input.content) as { interrupted?: boolean };
    return parsed.interrupted === true;
  } catch {
    return false;
  }
}
