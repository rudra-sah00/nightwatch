import { describe, expect, it } from 'vitest';
import {
  isInterruption,
  isSpeculative,
  MAX_HISTORY,
  nextTurn,
  upsertTurn,
} from '@/features/ask-ai/lib/conversation';
import type { AskAiMessage } from '@/features/ask-ai/types';

describe('upsertTurn', () => {
  it('appends turns in order', () => {
    let history: AskAiMessage[] = [];
    history = upsertTurn(history, 'user', 'play something', 'user-1');
    history = upsertTurn(
      history,
      'assistant',
      'Playing it now.',
      'assistant-2',
    );

    expect(history.map((m) => [m.role, m.content])).toEqual([
      ['user', 'play something'],
      ['assistant', 'Playing it now.'],
    ]);
  });

  it('updates the tail in place while text streams', () => {
    let history = upsertTurn([], 'assistant', 'Play', 'assistant-1');
    history = upsertTurn(history, 'assistant', 'Playing it', 'assistant-1');
    history = upsertTurn(
      history,
      'assistant',
      'Playing it now.',
      'assistant-1',
    );

    expect(history).toHaveLength(1);
    expect(history[0].content).toBe('Playing it now.');
  });

  it('replaces a draft with a differing final copy instead of duplicating', () => {
    // The bug this replaced: Nova Sonic sends assistant text twice per turn,
    // SPECULATIVE then FINAL. Exact repeats could be deduped, but a FINAL that
    // differed by punctuation produced a second near-identical bubble.
    let history = upsertTurn([], 'assistant', 'Playing it now', 'assistant-1');
    history = upsertTurn(
      history,
      'assistant',
      'Playing it now.',
      'assistant-1',
    );

    expect(history).toHaveLength(1);
    expect(history[0].content).toBe('Playing it now.');
  });

  it('starts a new bubble when the turn key changes', () => {
    let history = upsertTurn([], 'assistant', 'Same words', 'assistant-1');
    history = upsertTurn(history, 'assistant', 'Same words', 'assistant-3');
    expect(history).toHaveLength(2);
  });

  it('trims surrounding whitespace', () => {
    expect(upsertTurn([], 'user', '  hello  ', 'user-1')[0].content).toBe(
      'hello',
    );
  });

  it('ignores blank content', () => {
    expect(upsertTurn([], 'user', '', 'user-1')).toHaveLength(0);
    expect(upsertTurn([], 'user', '   ', 'user-1')).toHaveLength(0);
  });

  it('returns the same array when nothing changed', () => {
    const history = upsertTurn([], 'user', 'hi', 'user-1');
    expect(upsertTurn(history, 'user', 'hi', 'user-1')).toBe(history);
  });

  it('does not mutate the input array', () => {
    const original = upsertTurn([], 'user', 'first', 'user-1');
    const next = upsertTurn(original, 'assistant', 'second', 'assistant-2');
    expect(original).toHaveLength(1);
    expect(next).toHaveLength(2);
  });

  it('caps history length, dropping the oldest turns', () => {
    let history: AskAiMessage[] = [];
    for (let i = 0; i < MAX_HISTORY + 10; i++) {
      history = upsertTurn(history, 'user', `turn ${i}`, `user-${i}`);
    }
    expect(history).toHaveLength(MAX_HISTORY);
    expect(history[0].content).toBe('turn 10');
    expect(history.at(-1)?.content).toBe(`turn ${MAX_HISTORY + 9}`);
  });
});

describe('nextTurn', () => {
  it('keeps one key while the same speaker continues', () => {
    // SPECULATIVE and FINAL blocks of one reply must share a bubble.
    const first = nextTurn({ role: null, sequence: 0 }, 'assistant');
    const second = nextTurn(first, 'assistant');
    expect(second.key).toBe(first.key);
  });

  it('starts a new key when the speaker changes', () => {
    const user = nextTurn({ role: null, sequence: 0 }, 'user');
    const assistant = nextTurn(user, 'assistant');
    const userAgain = nextTurn(assistant, 'user');

    expect(new Set([user.key, assistant.key, userAgain.key]).size).toBe(3);
    expect(user.key).toBe('user-1');
    expect(assistant.key).toBe('assistant-2');
    expect(userAgain.key).toBe('user-3');
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
