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

interface RtmPlayEvent {
  type: 'PLAY_EVENT';
  videoTime: number;
  playbackRate: number;
  /** Sender wall-clock time (ms) for clock offset estimation */
  serverTime: number;
}

interface RtmPauseEvent {
  type: 'PAUSE_EVENT';
  videoTime: number;
  serverTime: number;
}

interface RtmSeekEvent {
  type: 'SEEK_EVENT';
  videoTime: number;
  playbackRate: number;
  wasPlaying: boolean;
  serverTime: number;
}

interface RtmRateEvent {
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
interface RtmSyncState {
  type: 'SYNC';
  currentTime: number;
  videoTime: number;
  isPlaying: boolean;
  playbackRate: number;
  serverTime: number;
  eventType?: 'play' | 'pause' | 'seek' | 'rate' | 'init';
  fromHost?: boolean;
}

interface RtmSyncRequest {
  type: 'SYNC_REQUEST';
  userId: string;
}

// ============ Member Lifecycle ============

interface RtmJoinApproved {
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

interface RtmJoinRejected {
  type: 'JOIN_REJECTED';
  reason: string;
}

interface RtmMemberJoined {
  type: 'MEMBER_JOINED';
  member: RoomMember;
}

interface RtmMemberLeft {
  type: 'MEMBER_LEFT';
  userId: string;
}

interface RtmPartyClosed {
  type: 'PARTY_CLOSED';
  reason: string;
}

interface RtmKick {
  type: 'KICK';
  targetUserId: string;
  reason: string;
}

// ============ Host Connectivity ============

interface RtmHostDisconnected {
  type: 'HOST_DISCONNECTED';
  graceSeconds: number;
  message: string;
}

interface RtmHostReconnected {
  type: 'HOST_RECONNECTED';
}

// ============ Chat ============

interface RtmChatMessage {
  type: 'CHAT';
  messageId: string;
  userId: string;
  userName: string;
  content: string;
  isSystem: boolean;
  timestamp: number;
}

interface RtmTypingStart {
  type: 'TYPING_START';
  userId: string;
  userName: string;
}

interface RtmTypingStop {
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

interface RtmSketchUndo {
  type: 'SKETCH_UNDO';
  actionId: string;
  userId: string;
}

interface RtmSketchClear {
  type: 'SKETCH_CLEAR';
  mode: 'all' | 'self';
  userId: string;
}

interface RtmSketchRequestSync {
  type: 'SKETCH_REQUEST_SYNC';
  requesterId: string;
}

interface RtmSketchSyncState {
  type: 'SKETCH_SYNC_STATE';
  elements: SketchAction[];
  targetId: string;
}

interface RtmSketchMoveZ {
  type: 'SKETCH_MOVE_Z';
  actionId: string;
  direction: 'front' | 'back';
}

interface RtmSketchCursorMove {
  type: 'SKETCH_CURSOR_MOVE';
  x: number;
  y: number;
  userName: string;
  color: string;
  userId: string;
}

interface RtmSketchReaction {
  type: 'SKETCH_REACTION';
  kind: 'heart' | 'star' | 'fire' | 'sparkle';
  x: number;
  y: number;
  color: string;
  userId: string;
}

// ============ Permissions & Settings ============

interface RtmPermissionsUpdated {
  type: 'PERMISSIONS_UPDATED';
  permissions: Partial<WatchPartyRoom['permissions']>;
}

interface RtmMemberPermissionsUpdated {
  type: 'MEMBER_PERMISSIONS_UPDATED';
  memberId: string;
  permissions: Partial<NonNullable<RoomMember['permissions']>>;
}

interface RtmContentUpdated {
  type: 'CONTENT_UPDATED';
  room: WatchPartyRoom;
}

// ============ Stream Token ============

interface RtmStreamToken {
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
