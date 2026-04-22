export interface FriendProfile {
  id: string;
  name: string;
  username: string | null;
  profilePhoto: string | null;
  isOnline: boolean;
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
}

export interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
}
