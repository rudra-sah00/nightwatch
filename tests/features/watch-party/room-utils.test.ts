import { describe, expect, it } from 'vitest';
import type { WatchPartyRoom } from '@/features/watch-party/room/types';
import {
  generateRoomId,
  isPartyHost,
  mergeMembers,
  normalizeRoomUrls,
} from '@/features/watch-party/room/utils';

const TOKEN = 'PARTYTOKEN123';

function room(overrides: Partial<WatchPartyRoom> = {}): WatchPartyRoom {
  return {
    id: 'R1',
    hostId: 'H1',
    title: 'T',
    type: 'movie',
    contentId: 'c1',
    streamUrl: 'https://api.test/api/stream/hls/OLDTOKEN/movie-1/master.m3u8',
    members: [],
    pendingMembers: [],
    state: {
      currentTime: 0,
      isPlaying: false,
      lastUpdated: 0,
      playbackRate: 1,
    },
    permissions: {
      canGuestsDraw: true,
      canGuestsPlaySounds: true,
      canGuestsChat: true,
    },
    createdAt: 0,
    ...overrides,
  } as WatchPartyRoom;
}

describe('generateRoomId', () => {
  it('returns 10 lowercase alphanumeric characters', () => {
    expect(generateRoomId()).toMatch(/^[a-z0-9]{10}$/);
  });
});

describe('isPartyHost', () => {
  it('is true only when both ids exist and match', () => {
    expect(isPartyHost(room({ hostId: 'H1' }), 'H1')).toBe(true);
  });

  it('is false for a different user', () => {
    expect(isPartyHost(room({ hostId: 'H1' }), 'G1')).toBe(false);
  });

  /*
    The regression this function exists for.

    `user?.id === room?.hostId` is `undefined === undefined` before the room
    loads, so every viewer — including a guest, who has no `user` at all — was
    briefly reported as host. That window is exactly when `JOIN_APPROVED` delivers
    a guest's `initialState`, and `onStateUpdate` drops updates while the viewer
    is believed to be host (the host must not apply its own broadcasts).

    On VOD the guest recovered the moment the host touched the scrubber. On live
    TV the host never touches anything, so the guest stayed on the "Host controls
    playback" lock overlay — which is deliberately not clickable for guests — for
    the whole party, with a healthy stream loaded underneath.
  */
  it('is false while the room has not loaded, for a guest with no user id', () => {
    expect(isPartyHost(null, undefined)).toBe(false);
    expect(isPartyHost(undefined, undefined)).toBe(false);
  });

  it('is false while the room has not loaded, for an authenticated viewer', () => {
    expect(isPartyHost(null, 'H1')).toBe(false);
  });

  it('is false when the room has no host id', () => {
    expect(isPartyHost({ hostId: '' }, '')).toBe(false);
    expect(isPartyHost({ hostId: '' }, 'H1')).toBe(false);
  });

  it('accepts a bare hostId holder, not just a full room', () => {
    expect(isPartyHost({ hostId: 'H9' }, 'H9')).toBe(true);
  });
});

describe('normalizeRoomUrls', () => {
  it('leaves the stream url alone unless injectStream is set', () => {
    const r = room();
    expect(normalizeRoomUrls(r, TOKEN).streamUrl).toBe(r.streamUrl);
  });

  it('swaps the member token into our own hls stream urls', () => {
    const out = normalizeRoomUrls(room(), TOKEN, { injectStream: true });
    expect(out.streamUrl).toContain(`/hls/${TOKEN}/movie-1/`);
    expect(out.streamUrl).not.toContain('OLDTOKEN');
  });

  it('proxies relative caption, sprite and subtitle paths', () => {
    const out = normalizeRoomUrls(
      room({
        captionUrl: 'subs/c.srt',
        spriteVtt: 'sprites/s.vtt',
        subtitleTracks: [
          { id: 'en-0', label: 'EN', language: 'en', src: 'subs/en.vtt' },
        ],
      }),
      TOKEN,
    );

    expect(out.captionUrl).toContain(`/api/stream/cdn/${TOKEN}/`);
    expect(out.spriteVtt).toContain(`/api/stream/cdn/${TOKEN}/`);
    expect(out.subtitleTracks?.[0]?.src).toContain(`/api/stream/cdn/${TOKEN}/`);
  });

  it('leaves absolute caption urls alone — they are already final', () => {
    const captionUrl = 'https://cdn.test/c.srt';
    expect(normalizeRoomUrls(room({ captionUrl }), TOKEN).captionUrl).toBe(
      captionUrl,
    );
  });

  it('passes quality urls through untouched', () => {
    const qualities = [{ quality: '1080p', url: 'https://cdn.test/1080.m3u8' }];
    expect(normalizeRoomUrls(room({ qualities }), TOKEN).qualities).toEqual(
      qualities,
    );
  });

  // Regression: live TV played solo but buffered forever in a watch party.
  // `injectTokenIntoUrl` targets our own `/api/stream/hls/TOKEN/ID` shape, but
  // matched any url with an `hls` or `cdn` path segment — which upstream IPTV
  // urls routinely have — and overwrote the segment after it.
  describe('livestream rooms', () => {
    const IPTV_URLS = [
      'https://stitcher-ipv4.pluto.tv/v1/stitch/embed/hls/channel/5f8c8f0a/master.m3u8?deviceType=web',
      'https://cdn.example.com/hls/abc123/index.m3u8',
      'https://x.example.com/cdn/live/chan/playlist.m3u8',
      'https://samsung.example.com/live/playlist.m3u8',
      '/api/livestream/iptv/proxy-playlist/ch1',
    ];

    it.each(IPTV_URLS)('preserves %s verbatim', (streamUrl) => {
      const out = normalizeRoomUrls(
        room({ type: 'livestream', streamUrl }),
        TOKEN,
        { injectStream: true },
      );
      expect(out.streamUrl).toBe(streamUrl);
    });

    it('never leaks the party token into a live stream url', () => {
      for (const streamUrl of IPTV_URLS) {
        const out = normalizeRoomUrls(
          room({ type: 'livestream', streamUrl }),
          TOKEN,
          { injectStream: true },
        );
        expect(out.streamUrl).not.toContain(TOKEN);
      }
    });

    it('still proxies livestream captions', () => {
      const out = normalizeRoomUrls(
        room({ type: 'livestream', captionUrl: 'subs/c.srt' }),
        TOKEN,
        { injectStream: true },
      );
      expect(out.captionUrl).toContain(`/api/stream/cdn/${TOKEN}/`);
    });
  });
});

describe('mergeMembers', () => {
  /**
   * Membership comes from the server, liveness stays local.
   *
   * The backend emits `MEMBERS_UPDATED` on every membership change and is the only
   * signal that somebody has genuinely been removed. It knows nothing about
   * `disconnected`, which the presence layer maintains — so a straight replace
   * would resurrect a member whose tab had died as present, and in the 3D theatre
   * put their avatar straight back into a chair.
   */
  it('takes the server roster', () => {
    const merged = mergeMembers(
      [{ id: 'a' }, { id: 'gone' }],
      [{ id: 'a' }, { id: 'new' }],
    );
    expect(merged.map((m) => m.id)).toEqual(['a', 'new']);
  });

  it('keeps a local disconnected flag the server cannot know about', () => {
    const merged = mergeMembers(
      [{ id: 'a' }, { id: 'b', disconnected: true }],
      [{ id: 'a' }, { id: 'b' }],
    );
    expect(merged.find((m) => m.id === 'b')?.disconnected).toBe(true);
  });

  it('clears the flag once presence says they are back', () => {
    const merged = mergeMembers(
      [{ id: 'b', disconnected: false }],
      [{ id: 'b', disconnected: true }],
    );
    expect(merged.find((m) => m.id === 'b')?.disconnected).toBe(false);
  });

  it('trusts the server for someone it has never seen', () => {
    const merged = mergeMembers([], [{ id: 'new', disconnected: true }]);
    expect(merged[0].disconnected).toBe(true);
  });

  it('survives a roster with holes in it', () => {
    // Members arrive asynchronously; nulls and id-less rows are real.
    const merged = mergeMembers(
      [null, undefined, { name: 'no id' } as { id?: string }],
      [{ id: 'a' }],
    );
    expect(merged.map((m) => m.id)).toEqual(['a']);
  });

  it('returns the same object when nothing changed, so React can bail out', () => {
    const row = { id: 'a', disconnected: false };
    expect(mergeMembers([{ id: 'a', disconnected: false }], [row])[0]).toBe(
      row,
    );
  });
});
