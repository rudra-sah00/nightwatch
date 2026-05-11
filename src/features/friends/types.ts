/**
 * Describes a friend's current activity.
 *
 * Supported `type` values:
 * - `'movie'`   — Watching a movie.
 * - `'series'`  — Watching a TV series episode.
 * - `'live'`    — Watching a livestream.
 * - `'music'`   — Listening to a song.
 * - `'game'`    — Playing a game.
 * - `'reading'` — Reading manga/book (future).
 */
export interface FriendActivity {
  type: string;
  title: string;
  /** Artist name (music). */
  artist: string | null;
  season: number | null;
  episode: number | null;
  episodeTitle: string | null;
  posterUrl: string | null;
  /** Second poster/logo (e.g. team2 in a live match). */
  secondaryPosterUrl: string | null;
}

/** A friend's profile including online status and current activity. */
export interface FriendProfile {
  id: string;
  name: string;
  username: string | null;
  profilePhoto: string | null;
  isOnline: boolean;
  activity: FriendActivity | null;
}

/** An incoming friend request awaiting the user's response. */
export interface FriendRequest {
  id: string;
  senderId: string;
  createdAt: string;
  name: string;
  username: string | null;
  profilePhoto: string | null;
}

/** An outgoing friend request the user has sent. */
export interface SentRequest {
  id: string;
  receiverId: string;
  createdAt: string;
  name: string;
  username: string | null;
  profilePhoto: string | null;
}
