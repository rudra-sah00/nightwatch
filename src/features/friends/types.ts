export interface FriendActivity {
  type: string;
  title: string;
  season: number | null;
  episode: number | null;
  episodeTitle: string | null;
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

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  replyToId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface ConversationPreview {
  friendId: string;
  name: string;
  username: string | null;
  profilePhoto: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isOnline: boolean;
  activity: FriendActivity | null;
}

export interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
}
