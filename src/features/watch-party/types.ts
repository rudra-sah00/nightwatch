// Watch Party Types

export interface RoomMember {
  id: string;
  name: string;
  profilePhoto?: string;
  isHost: boolean;
  joinedAt: number;
}

export interface RoomState {
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
  lastUpdated: number;
}

export interface WatchPartyRoom {
  id: string;
  hostId: string;
  contentId: string;
  title: string;
  type: 'movie' | 'series';
  season?: number;
  episode?: number;
  streamUrl: string;
  posterUrl?: string; // New
  captionUrl?: string;
  subtitleTracks?: {
    id: string;
    label: string;
    language: string;
    src: string;
  }[];
  spriteVtt?: string;
  members: RoomMember[];
  pendingMembers: RoomMember[]; // New
  state: RoomState;
  createdAt: number;
}

export interface RoomPreview {
  id: string;
  title: string;
  type: 'movie' | 'series';
  season?: number;
  episode?: number;
  hostName: string;
  memberCount: number;
}

// WebSocket Events
export interface PartyCreatePayload {
  contentId: string;
  title: string;
  type: 'movie' | 'series';
  streamUrl: string;
  posterUrl?: string; // New
  season?: number;
  episode?: number;
  captionUrl?: string;
  subtitleTracks?: {
    id: string;
    label: string;
    language: string;
    src: string;
  }[];
  spriteVtt?: string;
}

export interface PartyJoinRequestPayload {
  roomId: string;
  name?: string;
  captchaToken?: string;
}

export interface PartyJoinRejected {
  roomId: string;
  reason: string;
}

export interface PartyAdminRequest {
  member: RoomMember;
}

export interface PartyJoinApproved {
  room: WatchPartyRoom;
  streamToken: string;
  guestToken?: string;
  refreshToken?: string;
  initialState?: {
    currentTime: number;
    videoTime?: number;
    isPlaying: boolean;
    playbackRate?: number;
    timestamp?: number;
    serverTime?: number;
  };
}

export interface PartyKicked {
  reason: string;
}

export interface PartySyncPayload {
  currentTime: number;
  isPlaying: boolean;
  playbackRate?: number;
}

export interface PartyStateUpdate {
  currentTime: number;
  videoTime?: number; // New: Current video time at serverTime
  isPlaying: boolean;
  playbackRate?: number;
  timestamp: number;
  serverTime?: number; // New: Server timestamp for clock sync
  eventType?: 'play' | 'pause' | 'seek' | 'rate' | 'init';
  fromHost?: boolean;
}

export interface PartyPingPayload {
  t1: number;
}

export interface PartyEvent {
  eventType: 'play' | 'pause' | 'seek' | 'rate';
  videoTime: number;
  playbackRate?: number;
  wasPlaying?: boolean;
}

export interface PartyMemberJoined {
  member: RoomMember;
}

export interface PartyMemberLeft {
  userId: string;
}

export interface PartyClosed {
  reason: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  content: string;
  isSystem: boolean;
  timestamp: number;
}

export interface InteractionPayload {
  type: 'emoji' | 'sound' | 'animation';
  value: string;
  userId: string;
  userName?: string;
  timestamp: string | number;
}
