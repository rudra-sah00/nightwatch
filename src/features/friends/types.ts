/** Describes what a friend is currently watching. */
export interface FriendActivity {
  type: string;
  title: string;
  season: number | null;
  episode: number | null;
  episodeTitle: string | null;
  posterUrl: string | null;
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
