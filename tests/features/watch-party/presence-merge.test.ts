import { describe, expect, it, vi } from 'vitest';
import { createPresenceMerger } from '@/features/watch-party/room/lib/presence-merge';

function setup() {
  const emit = vi.fn();
  return { m: createPresenceMerger(emit), emit };
}

describe('createPresenceMerger', () => {
  /* The bug: RTM drops mid-party while the member is still on the relay. */
  it('does not report a member gone while the server still sees them', () => {
    const { m, emit } = setup();
    m.rtm('u', true);
    m.socket('u', true);
    m.rtm('u', false);
    expect(emit.mock.calls).toEqual([[{ action: 'JOIN', userId: 'u' }]]);
  });

  it('reports gone only when both sources say so', () => {
    const { m, emit } = setup();
    m.rtm('u', true);
    m.socket('u', true);
    m.rtm('u', false);
    m.socket('u', false);
    expect(emit).toHaveBeenLastCalledWith({ action: 'LEAVE', userId: 'u' });
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it('counts a relay-only member as present', () => {
    const { m, emit } = setup();
    m.socket('u', true);
    expect(emit).toHaveBeenCalledWith({ action: 'JOIN', userId: 'u' });
  });

  /* Against a backend without socket presence, behaviour is exactly RTM's. */
  it('passes RTM presence through unchanged when the socket side is silent', () => {
    const { m, emit } = setup();
    m.rtm('u', true);
    m.rtm('u', false);
    m.rtm('u', true);
    expect(emit.mock.calls.map(([c]) => c.action)).toEqual([
      'JOIN',
      'LEAVE',
      'JOIN',
    ]);
  });

  it('emits only on a change of combined state', () => {
    const { m, emit } = setup();
    m.rtm('u', true);
    m.rtm('u', true);
    m.socket('u', true);
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('a snapshot notices members who left while this socket was away', () => {
    const { m, emit } = setup();
    m.socketSnapshot(['a', 'b']);
    emit.mockClear();
    m.socketSnapshot(['a']);
    expect(emit.mock.calls).toEqual([[{ action: 'LEAVE', userId: 'b' }]]);
  });

  it('reset forgets everything', () => {
    const { m, emit } = setup();
    m.socket('u', true);
    m.reset();
    m.socket('u', true);
    expect(emit).toHaveBeenCalledTimes(2);
  });
});
