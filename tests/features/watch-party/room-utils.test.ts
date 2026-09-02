import { describe, expect, it } from 'vitest';
import type { WatchPartyRoom } from '@/features/watch-party/room/types';
import {
  generateRoomId,
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
