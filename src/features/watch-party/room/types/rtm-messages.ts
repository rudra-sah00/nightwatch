/**
 * Agora RTM Message Schema for Watch Party Signaling
 *
 * All real-time watch party events are transmitted via Agora RTM channel
 * messages encoded as JSON strings. This file defines the discriminated union
 * type for every RTM message used in the Watch Party feature.
 *
 * @remarks
 * - Every message has a `type` discriminant field.
 * - The host is the sole broadcaster for playback events (PLAY, PAUSE, SEEK,
 *   RATE, SYNC). All other users are read-only for those events.
 * - Messages carrying server time (SEEK_EVENT, PLAY_EVENT, SYNC) include a
 *   `serverTime` field set to `Date.now()` at the moment of send, so receivers
 *   can compute clock offset.
 */

import type { RoomMember, SketchAction, WatchPartyRoom } from '../types';

// ============ Playback Events ============

export interface RtmPlayEvent {
  type: 'PLAY_EVENT';
  videoTime: number;
  playbackRate: number;
  /** Sender wall-clock time (ms) for clock offset estimation */
  serverTime: number;
}

export interface RtmPauseEvent {
  type: 'PAUSE_EVENT';
  videoTime: number;
  serverTime: number;
}

export interface RtmSeekEvent {
  type: 'SEEK_EVENT';
  videoTime: number;
  playbackRate: number;
  wasPlaying: boolean;
  serverTime: number;
}

export interface RtmRateEvent {
  type: 'RATE_EVENT';
  playbackRate: number;
  videoTime: number;
  wasPlaying: boolean;
  serverTime: number;
}

/**
 * Full state broadcast — used during reconnection, initial join, and
 * periodic host sync.
 */
export interface RtmSyncState {
  type: 'SYNC';
  currentTime: number;
  videoTime: number;
  isPlaying: boolean;
  playbackRate: number;
  serverTime: number;
  eventType?: 'play' | 'pause' | 'seek' | 'rate' | 'init';
  fromHost?: boolean;
}

export interface RtmSyncRequest {
  type: 'SYNC_REQUEST';
  userId: string;
}

// ============ Member Lifecycle ============

export interface RtmJoinApproved {
  type: 'JOIN_APPROVED';
  room: WatchPartyRoom;
  streamToken: string;
  initialState?: {
    currentTime: number;
    videoTime?: number;
    isPlaying: boolean;
    playbackRate?: number;
    timestamp?: number;
    serverTime?: number;
  };
}

export interface RtmJoinRejected {
  type: 'JOIN_REJECTED';
  reason: string;
}

export interface RtmMemberJoined {
  type: 'MEMBER_JOINED';
  member: RoomMember;
}

export interface RtmMemberLeft {
  type: 'MEMBER_LEFT';
  userId: string;
}

export interface RtmPartyClosed {
  type: 'PARTY_CLOSED';
  reason: string;
}

export interface RtmKick {
  type: 'KICK';
  targetUserId: string;
  reason: string;
}

// ============ Host Connectivity ============

export interface RtmHostDisconnected {
  type: 'HOST_DISCONNECTED';
  graceSeconds: number;
  message: string;
}

export interface RtmHostReconnected {
  type: 'HOST_RECONNECTED';
}

// ============ Chat ============

export interface RtmChatMessage {
  type: 'CHAT';
  messageId: string;
  userId: string;
  userName: string;
  content: string;
  isSystem: boolean;
  timestamp: number;
}

export interface RtmTypingStart {
  type: 'TYPING_START';
  userId: string;
  userName: string;
}

export interface RtmTypingStop {
  type: 'TYPING_STOP';
  userId: string;
}

// ============ Interactions (emoji / sound / animation) ============

export interface RtmInteraction {
  type: 'INTERACTION';
  kind: 'emoji' | 'sound' | 'animation';
  emoji?: string;
  sound?: string;
  value?: string;
  userId: string;
  userName?: string;
  name?: string;
  timestamp?: number;
}

// ============ Sketch ============

export interface RtmSketchDraw {
  type: 'SKETCH_DRAW';
  action: SketchAction;
}

export interface RtmSketchUndo {
  type: 'SKETCH_UNDO';
  actionId: string;
  userId: string;
}

export interface RtmSketchClear {
  type: 'SKETCH_CLEAR';
  mode: 'all' | 'self';
  userId: string;
}

export interface RtmSketchRequestSync {
  type: 'SKETCH_REQUEST_SYNC';
  requesterId: string;
}

export interface RtmSketchSyncState {
  type: 'SKETCH_SYNC_STATE';
  elements: SketchAction[];
  targetId: string;
}

export interface RtmSketchMoveZ {
  type: 'SKETCH_MOVE_Z';
  actionId: string;
  direction: 'front' | 'back';
}

export interface RtmSketchCursorMove {
  type: 'SKETCH_CURSOR_MOVE';
  x: number;
  y: number;
  userName: string;
  color: string;
  userId: string;
}

export interface RtmSketchReaction {
  type: 'SKETCH_REACTION';
  kind: 'heart' | 'star' | 'fire' | 'sparkle';
  x: number;
  y: number;
  color: string;
  userId: string;
}

// ============ Permissions & Settings ============

export interface RtmPermissionsUpdated {
  type: 'PERMISSIONS_UPDATED';
  permissions: Partial<WatchPartyRoom['permissions']>;
}

export interface RtmMemberPermissionsUpdated {
  type: 'MEMBER_PERMISSIONS_UPDATED';
  memberId: string;
  permissions: Partial<NonNullable<RoomMember['permissions']>>;
}

export interface RtmContentUpdated {
  type: 'CONTENT_UPDATED';
  room: WatchPartyRoom;
}

// ============ Stream Token ============

export interface RtmStreamToken {
  type: 'STREAM_TOKEN';
  token: string;
}

// ============ Union Type ============

/**
 * Discriminated union of every Agora RTM message that can be sent in a
 * Watch Party channel.
 */
export type RTMMessage =
  | RtmPlayEvent
  | RtmPauseEvent
  | RtmSeekEvent
  | RtmRateEvent
  | RtmSyncState
  | RtmSyncRequest
  | RtmJoinApproved
  | RtmJoinRejected
  | RtmMemberJoined
  | RtmMemberLeft
  | RtmPartyClosed
  | RtmKick
  | RtmHostDisconnected
  | RtmHostReconnected
  | RtmChatMessage
  | RtmTypingStart
  | RtmTypingStop
  | RtmInteraction
  | RtmSketchDraw
  | RtmSketchUndo
  | RtmSketchClear
  | RtmSketchRequestSync
  | RtmSketchSyncState
  | RtmSketchMoveZ
  | RtmSketchCursorMove
  | RtmSketchReaction
  | RtmPermissionsUpdated
  | RtmMemberPermissionsUpdated
  | RtmContentUpdated
  | RtmStreamToken;

/** Narrow the message type for specific handling */
export type RTMMessageOfType<T extends RTMMessage['type']> = Extract<
  RTMMessage,
  { type: T }
>;
