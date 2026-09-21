import { describe, expect, it } from 'vitest';
import {
  displayName,
  memberNames,
  peersToDrop,
  presentMemberIds,
} from '@/features/watch-party/theatre/lib/roster';

describe('presentMemberIds', () => {
  it('keeps connected members', () => {
    expect(
      presentMemberIds([{ id: 'a' }, { id: 'b', disconnected: false }]),
    ).toEqual(['a', 'b']);
  });

  it('drops a disconnected member, which is how a closed tab appears', () => {
    // This is the bug: Agora presence LEAVE sets `disconnected` and leaves the
    // member in room.members, so the avatar used to sit in its chair for the
    // full two-minute grace period.
    expect(
      presentMemberIds([
        { id: 'stays' },
        { id: 'closed-tab', disconnected: true },
      ]),
    ).toEqual(['stays']);
  });

  it('tolerates the holes and missing ids the member list actually contains', () => {
    expect(
      presentMemberIds([
        null,
        undefined,
        { id: undefined },
        { id: null },
        { id: '' },
        { id: 'real' },
      ]),
    ).toEqual(['real']);
  });

  it('returns empty for a missing roster rather than throwing', () => {
    expect(presentMemberIds(null)).toEqual([]);
    expect(presentMemberIds(undefined)).toEqual([]);
    expect(presentMemberIds([])).toEqual([]);
  });
});

describe('peersToDrop', () => {
  it('drops a peer the roster no longer lists', () => {
    expect(
      peersToDrop({
        knownPeerIds: ['gone', 'here'],
        presentIds: ['me', 'here'],
        acknowledged: new Set(['gone', 'here']),
      }),
    ).toEqual(['gone']);
  });

  it('keeps everyone the roster still lists', () => {
    expect(
      peersToDrop({
        knownPeerIds: ['a', 'b'],
        presentIds: ['me', 'a', 'b'],
        acknowledged: new Set(['a', 'b']),
      }),
    ).toEqual([]);
  });

  it('does not cull a peer whose pose beat their join event', () => {
    // The network hook trusts a pose from an unknown id on purpose. If
    // reconciliation ignored `acknowledged`, that avatar would flicker in and
    // straight back out before MEMBER_JOINED reached room.members.
    expect(
      peersToDrop({
        knownPeerIds: ['early-pose'],
        presentIds: ['me'],
        acknowledged: new Set(),
      }),
    ).toEqual([]);
  });

  it('drops that same peer once the roster has vouched for them and then lost them', () => {
    const acknowledged = new Set<string>();

    // pass 1: pose arrived first, roster has not caught up — keep them
    expect(
      peersToDrop({
        knownPeerIds: ['p'],
        presentIds: ['me'],
        acknowledged,
      }),
    ).toEqual([]);

    // pass 2: roster confirms them
    acknowledged.add('p');
    expect(
      peersToDrop({
        knownPeerIds: ['p'],
        presentIds: ['me', 'p'],
        acknowledged,
      }),
    ).toEqual([]);

    // pass 3: they leave — now removable
    expect(
      peersToDrop({
        knownPeerIds: ['p'],
        presentIds: ['me'],
        acknowledged,
      }),
    ).toEqual(['p']);
  });

  it('drops nothing while the roster is empty, so a loading party is not wiped', () => {
    // The local user is always a member of their own party, so an empty roster
    // means "not loaded", never "deserted".
    expect(
      peersToDrop({
        knownPeerIds: ['a', 'b', 'c'],
        presentIds: [],
        acknowledged: new Set(['a', 'b', 'c']),
      }),
    ).toEqual([]);
  });

  it('drops several at once when a party empties out', () => {
    expect(
      peersToDrop({
        knownPeerIds: ['a', 'b', 'c'],
        presentIds: ['me'],
        acknowledged: new Set(['a', 'b', 'c']),
      }),
    ).toEqual(['a', 'b', 'c']);
  });

  it('is idempotent — a second pass after removal drops nothing', () => {
    const acknowledged = new Set(['gone']);
    const first = peersToDrop({
      knownPeerIds: ['gone'],
      presentIds: ['me'],
      acknowledged,
    });
    expect(first).toEqual(['gone']);

    // caller has since deleted the buffer
    expect(
      peersToDrop({ knownPeerIds: [], presentIds: ['me'], acknowledged }),
    ).toEqual([]);
  });

  it('lets a peer come back after rejoining', () => {
    const acknowledged = new Set(['p']);
    expect(
      peersToDrop({
        knownPeerIds: ['p'],
        presentIds: ['me', 'p'],
        acknowledged,
      }),
    ).toEqual([]);
  });

  it('recovers a missed MEMBER_LEFT without needing the event at all', () => {
    // The whole point of reconciling: nothing in the frontend emits MEMBER_LEFT,
    // so correctness cannot depend on it arriving.
    expect(
      peersToDrop({
        knownPeerIds: ['ghost'],
        presentIds: ['me', 'other'],
        acknowledged: new Set(['ghost', 'other']),
      }),
    ).toEqual(['ghost']);
  });
});

describe('memberNames', () => {
  it('maps ids to roster names, which is what the sidebar shows', () => {
    expect(
      memberNames([
        { id: 'u1', name: 'Rudra' },
        { id: 'u2', name: 'Asha' },
      ]),
    ).toEqual({ u1: 'Rudra', u2: 'Asha' });
  });

  it('keeps a disconnected member name so a reconnect does not flash an id', () => {
    expect(
      memberNames([{ id: 'u1', name: 'Rudra', disconnected: true }]),
    ).toEqual({ u1: 'Rudra' });
  });

  it('skips blank and missing names rather than mapping them to empty strings', () => {
    expect(
      memberNames([
        { id: 'a', name: '' },
        { id: 'b', name: '   ' },
        { id: 'c', name: null },
        { id: 'd' },
        { id: 'e', name: 'Real' },
      ]),
    ).toEqual({ e: 'Real' });
  });

  it('trims surrounding whitespace', () => {
    expect(memberNames([{ id: 'a', name: '  Rudra  ' }])).toEqual({
      a: 'Rudra',
    });
  });

  it('tolerates a missing or holey roster', () => {
    expect(memberNames(null)).toEqual({});
    expect(memberNames([null, undefined, { id: null, name: 'x' }])).toEqual({});
  });
});

describe('displayName', () => {
  it('uses the real name when there is one', () => {
    expect(displayName('guest_a1b2c3', 'Rudra')).toBe('Rudra');
    expect(displayName('user_9', 'Asha')).toBe('Asha');
  });

  it('never prints a raw id — this was the bug', () => {
    // The old fallback was `userId.slice(0, 8)`, so an unnamed guest rendered
    // "guest_a1" above their head.
    const label = displayName('guest_a1b2c3');
    expect(label).toBe('Guest');
    expect(label).not.toContain('a1b2');
  });

  it('says Member for an unnamed signed-in user', () => {
    expect(displayName('user_9f2c')).toBe('Member');
  });

  it('treats blank names as absent', () => {
    expect(displayName('guest_x', '   ')).toBe('Guest');
    expect(displayName('user_x', '')).toBe('Member');
    expect(displayName('user_x', null)).toBe('Member');
  });

  it('matches the convention used elsewhere in the party UI', () => {
    // src/features/watch-party/interactions/hooks/use-soundboard.ts:173
    //   userName || (userId?.startsWith('guest') ? 'Guest' : 'Member')
    const convention = (userId: string, userName?: string) =>
      userName || (userId?.startsWith('guest') ? 'Guest' : 'Member');

    for (const [id, name] of [
      ['guest_1', undefined],
      ['user_1', undefined],
      ['guest_1', 'Rudra'],
      ['user_1', 'Asha'],
    ] as const) {
      expect(displayName(id, name)).toBe(convention(id, name));
    }
  });
});

describe('roster names beat chat-learned names', () => {
  it('prefers the roster name, falling back to chat for unlisted peers', () => {
    // TheatreScene merges as { ...chatNames, ...memberNames }
    const chatNames = { u1: 'Old Nickname', stranger: 'From Chat' };
    const roster = memberNames([{ id: 'u1', name: 'Rudra' }]);
    const merged = { ...chatNames, ...roster };

    expect(merged.u1).toBe('Rudra');
    expect(merged.stranger).toBe('From Chat');
  });

  it('gives a watching member a name even though they never chatted', () => {
    const chatNames: Record<string, string> = {};
    const roster = memberNames([{ id: 'silent', name: 'Asha' }]);
    const merged = { ...chatNames, ...roster };

    expect(displayName('silent', merged.silent)).toBe('Asha');
  });
});

describe('presentMemberIds + peersToDrop together', () => {
  it('removes a peer the moment presence marks them disconnected', () => {
    const members = [{ id: 'me' }, { id: 'peer', disconnected: false }];
    const acknowledged = new Set(['peer']);

    expect(
      peersToDrop({
        knownPeerIds: ['peer'],
        presentIds: presentMemberIds(members),
        acknowledged,
      }),
    ).toEqual([]);

    // Agora presence LEAVE fires; the member stays in the list, flagged.
    members[1].disconnected = true;

    expect(
      peersToDrop({
        knownPeerIds: ['peer'],
        presentIds: presentMemberIds(members),
        acknowledged,
      }),
    ).toEqual(['peer']);
  });
});
