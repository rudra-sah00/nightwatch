import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetIdCounter,
  appendMessage,
  isInterruption,
  isSpeculative,
  MAX_HISTORY,
} from '@/features/ask-ai/lib/conversation';
import type { AskAiMessage } from '@/features/ask-ai/types';

beforeEach(() => {
  __resetIdCounter();
});

describe('appendMessage', () => {
  it('appends turns in order with distinct ids', () => {
    let history: AskAiMessage[] = [];
    history = appendMessage(history, 'user', 'play something');
    history = appendMessage(history, 'assistant', 'Playing it now.');

    expect(history.map((m) => [m.role, m.content])).toEqual([
      ['user', 'play something'],
      ['assistant', 'Playing it now.'],
    ]);
    expect(new Set(history.map((m) => m.id)).size).toBe(2);
  });

  it('trims surrounding whitespace', () => {
    const history = appendMessage([], 'user', '  hello  ');
    expect(history[0].content).toBe('hello');
  });

  it('ignores blank and whitespace-only content', () => {
    expect(appendMessage([], 'user', '')).toHaveLength(0);
    expect(appendMessage([], 'user', '   ')).toHaveLength(0);
    expect(appendMessage([], 'assistant', '\n\t')).toHaveLength(0);
  });

  it('collapses an immediate repeat from the same role', () => {
    // Nova Sonic can re-send a finalised turn; duplicate bubbles are worse
    // than a missed one.
    let history = appendMessage([], 'assistant', 'Playing it now.');
    history = appendMessage(history, 'assistant', 'Playing it now.');
    expect(history).toHaveLength(1);
  });

  it('keeps identical content from a different role', () => {
    let history = appendMessage([], 'user', 'One Piece');
    history = appendMessage(history, 'assistant', 'One Piece');
    expect(history).toHaveLength(2);
  });

  it('keeps a repeat that is not consecutive', () => {
    let history = appendMessage([], 'user', 'next');
    history = appendMessage(history, 'assistant', 'Skipping.');
    history = appendMessage(history, 'user', 'next');
    expect(history).toHaveLength(3);
  });

  it('caps history length, dropping the oldest turns', () => {
    let history: AskAiMessage[] = [];
    for (let i = 0; i < MAX_HISTORY + 10; i++) {
      history = appendMessage(history, 'user', `turn ${i}`);
    }
    expect(history).toHaveLength(MAX_HISTORY);
    expect(history[0].content).toBe('turn 10');
    expect(history.at(-1)?.content).toBe(`turn ${MAX_HISTORY + 9}`);
  });

  it('does not mutate the input array', () => {
    const original: AskAiMessage[] = [];
    const next = appendMessage(original, 'user', 'hi');
    expect(original).toHaveLength(0);
    expect(next).toHaveLength(1);
  });
});

describe('isSpeculative', () => {
  it('detects the SPECULATIVE generation stage', () => {
    expect(
      isSpeculative(JSON.stringify({ generationStage: 'SPECULATIVE' })),
    ).toBe(true);
  });

  it('treats FINAL as settled', () => {
    expect(isSpeculative(JSON.stringify({ generationStage: 'FINAL' }))).toBe(
      false,
    );
  });

  it('errs toward final for missing or malformed fields', () => {
    // Better to record a turn than silently drop it.
    expect(isSpeculative(undefined)).toBe(false);
    expect(isSpeculative('')).toBe(false);
    expect(isSpeculative('not json')).toBe(false);
    expect(isSpeculative('{}')).toBe(false);
  });
});

describe('isInterruption', () => {
  it('detects the INTERRUPTED stop reason', () => {
    expect(isInterruption({ stopReason: 'INTERRUPTED' })).toBe(true);
  });

  it('detects the sentinel text payload', () => {
    expect(isInterruption({ content: '{ "interrupted" : true }' })).toBe(true);
  });

  it('ignores ordinary turn ends and text', () => {
    expect(isInterruption({ stopReason: 'END_TURN' })).toBe(false);
    expect(isInterruption({})).toBe(false);
    expect(isInterruption({ content: 'Playing it now.' })).toBe(false);
    expect(isInterruption({ content: '{"interrupted":false}' })).toBe(false);
  });
});
