import { injectTokenIntoUrl, wrapInProxy } from '@/features/watch/utils';
import type { WatchPartyRoom } from './types';

/**
 * Whether `userId` is the host of `room`.
 *
 * Exists because the obvious inline form is wrong in a way that is invisible on
 * the host and breaks every guest:
 *
 * ```ts
 * const isHost = user?.id === room?.hostId; // true while room is null!
 * ```
 *
 * Before the room lands both sides are `undefined`, so `undefined === undefined`
 * reports the viewer as host. That window is precisely when a guest receives its
 * first party state — `JOIN_APPROVED` carries `initialState`, and the guest's
 * `onStateUpdate` is gated on `if (isHostRef.current) return` because the host
 * must not apply its own broadcasts. So the one update that tells a guest the
 * party is already playing was dropped, and `usePredictiveSync` skipped
 * registering its apply/enforce effects for the same reason.
 *
 * On live TV that is unrecoverable rather than merely late: the host never
 * touches the controls on a channel, so no further `PLAY_EVENT` is ever emitted,
 * and the guest sits on the "Host controls playback" lock overlay — an overlay
 * that is deliberately not clickable for guests — with a perfectly healthy
 * stream loaded underneath.
 *
 * A missing id on either side means "not the host", never "maybe".
 *
 * @param room - Current room, or `null` before it has loaded.
 * @param userId - The viewer's id. Guests legitimately have none yet.
 * @returns `true` only when both ids exist and match.
 */
export function isPartyHost(
  room: Pick<WatchPartyRoom, 'hostId'> | null | undefined,
  userId: string | null | undefined,
): boolean {
  if (!room?.hostId || !userId) return false;
  return room.hostId === userId;
}

/**
 * Fold the server's authoritative member list into the local one.
 *
 * The backend emits `MEMBERS_UPDATED` to `room:<id>` whenever membership changes,
 * and it is the only signal that a member has genuinely been REMOVED — Agora
 * presence merely reports that someone's connection went away, which is a
 * different claim and is why `disconnected` exists.
 *
 * The two must not overwrite each other. Taking the server list verbatim would
 * wipe every local `disconnected` flag, which is worse than ignoring the event
 * entirely: the flag is what excludes someone from `presentMemberIds`, so a
 * member whose tab died would be resurrected as present, and the 3D theatre would
 * put their avatar back in a chair for the rest of the party.
 *
 * So membership comes from the server and liveness stays local: rows present in
 * both keep whatever the presence layer last decided about them.
 *
 * @param local - The member list this client currently holds.
 * @param incoming - The list the server just published.
 * @returns The server's roster, carrying local presence flags forward.
 */
export function mergeMembers<
  T extends { id?: string | null; disconnected?: boolean },
>(local: readonly (T | null | undefined)[], incoming: readonly T[]): T[] {
  const flags = new Map<string, boolean | undefined>();
  for (const m of local) {
    if (!m || typeof m.id !== 'string') continue;
    flags.set(m.id, m.disconnected);
  }

  return incoming.map((m) => {
    if (!m || typeof m.id !== 'string') return m;
    if (!flags.has(m.id)) return m; // new to us — take the server's word for it
    const disconnected = flags.get(m.id);
    return disconnected === m.disconnected ? m : { ...m, disconnected };
  });
}

/**
 * Generate a random alphanumeric room ID
 * Format: 10 characters (e.g. 5x9a2b7c1d)
 */ export function generateRoomId(): string {
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
