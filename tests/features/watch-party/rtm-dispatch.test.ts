import { describe, expect, it, vi } from 'vitest';
import {
  dispatchRtmMessage,
  onPartyInteraction,
} from '@/features/watch-party/room/services/rtm-events';
import type { RTMMessage } from '@/features/watch-party/room/types/rtm-messages';

/**
 * The RTM event bus fans one incoming message out to local subscribers.
 *
 * Exactly once. There used to be a second pass for `INTERACTION` — "also dispatch
 * to the generic INTERACTION listener" — but the generic pass already matched it,
 * because the message's own `type` IS `'INTERACTION'`. Both passes walked the same
 * Set, so every subscriber ran twice.
 */
describe('dispatchRtmMessage', () => {
  it('delivers an INTERACTION once, not twice', () => {
    /*
      This was audible rather than theoretical: `use-soundboard` reacts to each
      event by stopping whatever remote clip is playing and starting a new one, so
      one soundboard press played, cut itself off milliseconds later, and restarted.
    */
    const seen = vi.fn();
    const off = onPartyInteraction(seen);

    dispatchRtmMessage({
      type: 'INTERACTION',
      kind: 'sound',
      sound: 'https://cdn/a.mp3',
      name: 'airhorn',
      userId: 'u1',
      userName: 'Alice',
    } as unknown as RTMMessage);

    expect(seen).toHaveBeenCalledTimes(1);
    off();
  });

  it('delivers every other message type once', () => {
    const seen = vi.fn();
    const off = onPartyInteraction(seen);
    dispatchRtmMessage({ type: 'CHAT' } as unknown as RTMMessage);
    // Not an interaction — the interaction subscriber must not see it at all.
    expect(seen).not.toHaveBeenCalled();
    off();
  });

  it('stops delivering once unsubscribed', () => {
    const seen = vi.fn();
    onPartyInteraction(seen)();
    dispatchRtmMessage({
      type: 'INTERACTION',
      kind: 'emoji',
    } as unknown as RTMMessage);
    expect(seen).not.toHaveBeenCalled();
  });

  it('delivers to every subscriber, once each', () => {
    const a = vi.fn();
    const b = vi.fn();
    const offA = onPartyInteraction(a);
    const offB = onPartyInteraction(b);
    dispatchRtmMessage({
      type: 'INTERACTION',
      kind: 'emoji',
    } as unknown as RTMMessage);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    offA();
    offB();
  });

  it('is a no-op for a type nobody listens for', () => {
    expect(() =>
      dispatchRtmMessage({ type: 'NOT_A_REAL_TYPE' } as unknown as RTMMessage),
    ).not.toThrow();
  });
});
