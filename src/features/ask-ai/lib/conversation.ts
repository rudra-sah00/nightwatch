import type { AskAiMessage, AskAiRole } from '../types';

/**
 * Conversation history accumulation.
 *
 * Nova Sonic streams assistant text twice per turn: a SPECULATIVE draft that
 * updates live, then a FINAL settled version. Only finalised turns belong in
 * history, while the draft drives the live caption.
 *
 * Kept pure so the append/dedupe rules can be tested without a socket.
 */

/** Upper bound on retained turns, so a long session cannot grow without limit. */
export const MAX_HISTORY = 100;

let counter = 0;

/** Monotonic id — history entries are append-only, so a counter is enough. */
function nextId(): string {
  counter += 1;
  return `askai-${counter}`;
}

/** Resets the id counter. Test helper. */
export function __resetIdCounter(): void {
  counter = 0;
}

/**
 * Appends a finalised turn.
 *
 * Ignores blank content, and collapses a repeat of the previous turn from the
 * same role. Nova Sonic can emit the same finalised text more than once (for
 * example when a turn ends and the transcript is re-sent), and duplicated
 * bubbles are worse than a missed one.
 */
export function appendMessage(
  history: readonly AskAiMessage[],
  role: AskAiRole,
  content: string,
): AskAiMessage[] {
  const trimmed = content.trim();
  if (!trimmed) return history as AskAiMessage[];

  const last = history.at(-1);
  if (last && last.role === role && last.content === trimmed) {
    return history as AskAiMessage[];
  }

  const next = [...history, { id: nextId(), role, content: trimmed }];
  return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
}

/**
 * True when an assistant text event is the settled version of a turn.
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
