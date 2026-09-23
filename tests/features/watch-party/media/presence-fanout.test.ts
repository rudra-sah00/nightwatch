import { describe, expect, it } from 'vitest';
import {
  presenceMemberEvents,
  type RtmPresenceEvent,
} from '@/features/watch-party/media/lib/presence';

/**
 * Agora RTM presence, mapped to membership changes.
 *
 * Event shapes are from the installed `agora-rtm-sdk@2.3.0` typings:
 * `PresenceEvent.snapshot: UserState[] | null` where `UserState` has `userId`, and
 * `PresenceEvent.interval: IntervalDetail | null` where `join`, `leave` and
 * `timeout` are each `{ users: string[] }`.
 */

function event(overrides: Partial<RtmPresenceEvent>): RtmPresenceEvent {
  return { eventType: 'REMOTE_JOIN', publisher: 'alice', ...overrides };
}

describe('presenceMemberEvents', () => {
  it('reports a per-user join', () => {
    expect(presenceMemberEvents(event({}), 'me')).toEqual([
      { action: 'JOIN', userId: 'alice' },
    ]);
  });

  it('reports a per-user leave', () => {
    expect(
      presenceMemberEvents(event({ eventType: 'REMOTE_LEAVE' }), 'me'),
    ).toEqual([{ action: 'LEAVE', userId: 'alice' }]);
  });

  it('treats a timeout as a departure', () => {
    // A closed tab or dropped socket surfaces as REMOTE_TIMEOUT, never
    // REMOTE_LEAVE, and it is the commonest way anybody leaves a party.
    expect(
      presenceMemberEvents(event({ eventType: 'REMOTE_TIMEOUT' }), 'me'),
    ).toEqual([{ action: 'LEAVE', userId: 'alice' }]);
  });

  it('adopts everyone in the snapshot delivered on subscribe', () => {
    /*
      Previously dropped. Without it a joining client learns about existing members
      only when they next speak or move: a silent member did not exist at all, and
      in the 3D theatre their chair stood empty until their next heartbeat.
    */
    expect(
      presenceMemberEvents(
        event({
          eventType: 'SNAPSHOT',
          snapshot: [{ userId: 'alice' }, { userId: 'bob' }],
        }),
        'me',
      ),
    ).toEqual([
      { action: 'JOIN', userId: 'alice' },
      { action: 'JOIN', userId: 'bob' },
    ]);
  });

  it('unpacks a batched interval, including its timeout list', () => {
    /*
      Also previously dropped, and the more serious of the two: under load Agora
      sends INTERVAL *instead of* the per-user events, so a client that ignores it
      sees no departures at all — the exact failure that leaves a body sitting in a
      chair.
    */
    expect(
      presenceMemberEvents(
        event({
          eventType: 'INTERVAL',
          interval: {
            join: { users: ['carol'] },
            leave: { users: ['alice'] },
            timeout: { users: ['bob'] },
          },
        }),
        'me',
      ),
    ).toEqual([
      { action: 'JOIN', userId: 'carol' },
      { action: 'LEAVE', userId: 'alice' },
      { action: 'LEAVE', userId: 'bob' },
    ]);
  });

  it('never reports the local user, who cannot leave their own party', () => {
    expect(
      presenceMemberEvents(
        event({ eventType: 'REMOTE_LEAVE', publisher: 'me' }),
        'me',
      ),
    ).toEqual([]);
    expect(
      presenceMemberEvents(
        event({
          eventType: 'INTERVAL',
          interval: { leave: { users: ['me'] } },
        }),
        'me',
      ),
    ).toEqual([]);
    expect(
      presenceMemberEvents(
        event({ eventType: 'SNAPSHOT', snapshot: [{ userId: 'me' }] }),
        'me',
      ),
    ).toEqual([]);
  });

  it('tolerates the nulls the SDK sends on unrelated events', () => {
    expect(
      presenceMemberEvents(
        event({ eventType: 'SNAPSHOT', snapshot: null, interval: null }),
        'me',
      ),
    ).toEqual([]);
    expect(
      presenceMemberEvents(
        event({ eventType: 'INTERVAL', interval: {} }),
        'me',
      ),
    ).toEqual([]);
  });

  it('ignores an id-less entry rather than announcing an empty member', () => {
    expect(
      presenceMemberEvents(
        event({ eventType: 'SNAPSHOT', snapshot: [{}, { userId: '' }] }),
        'me',
      ),
    ).toEqual([]);
    expect(
      presenceMemberEvents(
        event({ eventType: 'REMOTE_JOIN', publisher: undefined }),
        'me',
      ),
    ).toEqual([]);
  });

  it('ignores state changes and unknown future types, which carry no membership', () => {
    for (const eventType of [
      'REMOTE_STATE_CHANGED',
      'NONE',
      'ERROR_OUT_OF_SERVICE',
      'SOMETHING_NEW',
    ]) {
      expect(presenceMemberEvents(event({ eventType }), 'me')).toEqual([]);
    }
  });

  it('reports everybody when the local id is unknown', () => {
    // A guest's id can arrive after the subscription does.
    expect(presenceMemberEvents(event({}), undefined)).toEqual([
      { action: 'JOIN', userId: 'alice' },
    ]);
  });
});
