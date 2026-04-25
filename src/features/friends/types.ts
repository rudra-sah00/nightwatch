export interface FriendActivity {
  type: string;
  title: string;
  season: number | null;
  episode: number | null;
  episodeTitle: string | null;
  posterUrl: string | null;
}

export interface FriendProfile {
  id: string;
  name: string;
  username: string | null;
  profilePhoto: string | null;
  isOnline: boolean;
  activity: FriendActivity | null;
}

export interface FriendRequest {
  id: string;
  senderId: string;
  createdAt: string;
  name: string;
  username: string | null;
  profilePhoto: string | null;
}

export interface SentRequest {
  id: string;
  receiverId: string;
  createdAt: string;
  name: string;
  username: string | null;
  profilePhoto: string | null;
}
