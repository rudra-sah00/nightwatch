// Watch Party Types

export interface RoomMember {
  id: string;
  name: string;
  profilePhoto?: string;
  isHost: boolean;
  permissions?: {
    canDraw?: boolean;
    canPlaySound?: boolean;
    canChat?: boolean;
  };
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
  type: 'movie' | 'series' | 'livestream';
  season?: number;
  episode?: number;
  streamUrl: string;
  posterUrl?: string;
  captionUrl?: string;
  providerId?: 's1' | 's2' | 's3';
  subtitleTracks?: {
    id: string;
    label: string;
    language: string;
    src: string;
  }[];
  spriteVtt?: string;
  /** Quality options for local playback switching (Server 1 HLS variants / Server 2 MP4 resolutions) */
  qualities?: { quality: string; url: string }[];
  /** S2 audio dub tracks pre-fetched when the room was created */
  audioTracks?: {
    id: string;
    label: string;
    language: string;
    streamUrl: string;
  }[];
  members: RoomMember[];
  pendingMembers: RoomMember[]; // New
  state: RoomState;
  permissions: {
    canGuestsDraw: boolean;
    canGuestsPlaySounds: boolean;
    canGuestsChat: boolean;
  };
  streamToken?: string; // New: Shared stream token for members
  createdAt: number;
}

export interface RoomPreview {
  id: string;
  title: string;
  type: 'movie' | 'series' | 'livestream';
  season?: number;
  episode?: number;
  hostId?: string;
  hostName: string;
  memberCount: number;
}

// Socket.IO Events
export interface PartyCreatePayload {
  contentId: string;
  title: string;
  type: 'movie' | 'series' | 'livestream';
  streamUrl: string;
  posterUrl?: string; // New
  season?: number;
  episode?: number;
  captionUrl?: string;
  /** Server used when the room was created — drives S2 audio track discovery */
  providerId?: 's1' | 's2' | 's3';
  subtitleTracks?: {
    id: string;
    label: string;
    language: string;
    src: string;
  }[];
  spriteVtt?: string;
  qualities?: { quality: string; url: string }[];
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
  clientId?: string;
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

export interface SketchAction {
  id: string;
  type:
    | 'freehand'
    | 'pencil'
    | 'arrow'
    | 'line'
    | 'circle'
    | 'rectangle'
    | 'triangle'
    | 'star'
    | 'text'
    | 'bubble'
    | 'sticker'
    | 'laser';
  color: string;
  strokeWidth: number;
  videoTimestamp: number;
  data: number[];
  text?: string;
  userId?: string;
  userName?: string;
  fill?: boolean;
  opacity?: number;
  x?: number;
  y?: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
}

export interface PartyPermissionsUpdate {
  permissions: Partial<WatchPartyRoom['permissions']>;
}

export interface MemberPermissionsUpdate {
  memberId: string;
  permissions: Partial<NonNullable<RoomMember['permissions']>>;
}
