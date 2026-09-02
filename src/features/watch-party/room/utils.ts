import { injectTokenIntoUrl, wrapInProxy } from '@/features/watch/utils';
import type { WatchPartyRoom } from './types';

/**
 * Generate a random alphanumeric room ID
 * Format: 10 characters (e.g. 5x9a2b7c1d)
 */
export function generateRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Rewrites a room's URLs so the joining member can actually fetch them, using
 * the stream token shared by the host.
 *
 * Captions, sprites, and subtitle tracks are wrapped in the CDN proxy. The
 * stream URL itself is only re-tokenized when `injectStream` is set, because
 * only the join paths have a token to inject.
 *
 * @param room - Room as returned by the API or the `JOIN_APPROVED` message.
 * @param token - Stream token shared by all members of the room.
 * @param options.injectStream - Also rewrite `room.streamUrl`.
 */
export function normalizeRoomUrls(
  room: WatchPartyRoom,
  token: string,
  { injectStream = false }: { injectStream?: boolean } = {},
): WatchPartyRoom {
  return {
    ...room,
    // Livestreams are excluded: their URLs are upstream IPTV/CDN URLs, not our
    // own `/api/stream/hls/TOKEN/ID` shape, and `injectTokenIntoUrl` overwrites
    // whatever path segment happens to follow an `hls` or `cdn` one — Pluto's
    // `/v1/stitch/embed/hls/channel/<id>/master.m3u8` comes back as
    // `/v1/stitch/embed/hls/TOKEN/<id>/master.m3u8`, having lost `channel`,
    // and `/hls/<id>/index.m3u8` loses `<id>` itself. Either way the URL 404s,
    // which manifests as a live channel buffering forever in a watch party
    // while playing fine solo. There is no per-member token for live TV anyway;
    // the backend marks these rooms with the `LIVESTREAM` sentinel.
    ...(injectStream &&
      room.type !== 'livestream' && {
        streamUrl: injectTokenIntoUrl(room.streamUrl, token) || room.streamUrl,
      }),
    captionUrl: room.captionUrl
      ? wrapInProxy(room.captionUrl, token)
      : room.captionUrl,
    spriteVtt: room.spriteVtt
      ? wrapInProxy(room.spriteVtt, token)
      : room.spriteVtt,
    subtitleTracks: (room.subtitleTracks || []).map((track) => ({
      ...track,
      src: wrapInProxy(track.src, token),
    })),
    // Quality URLs are CDN proxy URLs stored with the host token — pass through
    // unchanged so each member can use the shared stream token to access them.
    qualities: room.qualities,
  };
}
