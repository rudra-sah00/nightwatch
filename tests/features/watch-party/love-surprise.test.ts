import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isLoveCommand,
  useLoveSurprise,
} from '@/features/watch-party/love/store';
import {
  dispatchRtmMessage,
  onLoveAnswer,
  onLoveSurprise,
} from '@/features/watch-party/room/services/rtm-events';
import type { RTMMessage } from '@/features/watch-party/room/types/rtm-messages';

afterEach(() => useLoveSurprise.getState().reset());

describe('isLoveCommand', () => {
  it('matches the exact command, trimmed and case-insensitive', () => {
    expect(isLoveCommand('/my-girl')).toBe(true);
    expect(isLoveCommand('  /MY-GIRL  ')).toBe(true);
  });

  it('does not match ordinary chat that merely mentions it', () => {
    expect(isLoveCommand('try /my-girl')).toBe(false);
    expect(isLoveCommand('/my-girl please')).toBe(false);
    expect(isLoveCommand('my-girl')).toBe(false);
  });
});

describe('useLoveSurprise', () => {
  it('runs playing -> question -> answered -> idle', () => {
    const s = useLoveSurprise.getState();
    s.start('me');
    expect(useLoveSurprise.getState()).toMatchObject({
      phase: 'playing',
      initiatorId: 'me',
    });
    s.toQuestion();
    expect(useLoveSurprise.getState().phase).toBe('question');
    s.setAnswer('Her', 'also-yes');
    expect(useLoveSurprise.getState()).toMatchObject({
      phase: 'answered',
      answer: { userName: 'Her', answer: 'also-yes' },
    });
    s.reset();
    expect(useLoveSurprise.getState().phase).toBe('idle');
  });

  it('ignores a stale "ended" once the film is no longer playing', () => {
    useLoveSurprise.getState().toQuestion();
    expect(useLoveSurprise.getState().phase).toBe('idle');
  });
});

describe('love RTM subscribers', () => {
  it('delivers a surprise start with its sender', () => {
    const cb = vi.fn();
    const off = onLoveSurprise(cb);
    dispatchRtmMessage({ type: 'LOVE_SURPRISE', userId: 'u1', at: 1 });
    off();
    expect(cb).toHaveBeenCalledWith({ userId: 'u1' });
  });

  it('delivers a valid answer and drops a malformed one', () => {
    const cb = vi.fn();
    const off = onLoveAnswer(cb);
    dispatchRtmMessage({
      type: 'LOVE_ANSWER',
      userId: 'u2',
      userName: 'Her',
      answer: 'yes',
    });
    dispatchRtmMessage({
      type: 'LOVE_ANSWER',
      userId: 'u2',
      userName: 'Her',
      answer: 'no',
    } as unknown as RTMMessage);
    off();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({
      userId: 'u2',
      userName: 'Her',
      answer: 'yes',
    });
  });
});
