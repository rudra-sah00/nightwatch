import { apiFetch } from '@/lib/fetch';
import { getSocket } from '@/lib/socket';
import type {
  ChatMessage, // New
  InteractionPayload,
  MemberPermissionsUpdate,
  PartyAdminRequest,
  PartyClosed,
  PartyCreatePayload,
  PartyEvent, // New
  PartyJoinApproved,
  PartyJoinRejected,
  PartyJoinRequestPayload,
  PartyKicked,
  PartyMemberJoined,
  PartyMemberLeft,
  PartyPermissionsUpdate,
  PartyPingPayload, // New
  PartyStateUpdate,
  PartySyncPayload,
  PartyThemeUpdate,
  RoomMember,
  RoomPreview,
  SketchAction,
  WatchPartyRoom,
} from '../types';

/**
 * REST API endpoints for room discovery and initial state retrieval.
 */

/**
 * Check if a room exists
 * Returns detailed status for lobby UI
 */
export async function checkRoomExists(roomId: string): Promise<{
  exists: boolean;
  preview?: RoomPreview;
  reason?: string;
  message?: string;
}> {
  try {
    const data = await apiFetch<{
      exists: boolean;
      title: string;
      type: 'movie' | 'series';
      season?: number;
      episode?: number;
      hostName: string;
      memberCount: number;
      reason?: string;
      message?: string;
    }>(`/api/rooms/${roomId}/exists`);

    if (data.exists) {
      return {
        exists: true,
        preview: {
          id: roomId.toUpperCase(),
          title: data.title,
          type: data.type,
          season: data.season,
          episode: data.episode,
          hostName: data.hostName,
          memberCount: data.memberCount,
        },
      };
    }

    return {
      exists: false,
      reason: data.reason || 'not_found',
      message:
        data.message || 'This watch party has ended or the code is invalid.',
    };
  } catch (_error) {
    return {
      exists: false,
      reason: 'network_error',
      message: 'Unable to check room status. Please check your connection.',
    };
  }
}

/**
 * Get room details
 */
export async function getRoomDetails(
  roomId: string,
): Promise<WatchPartyRoom | null> {
  return apiFetch<WatchPartyRoom>(`/api/rooms/${roomId}`).catch(() => null);
}

/**
 * Socket.IO API for real-time room management and playback synchronization.
 */

type Callback<T> = (
  response: { success: boolean; error?: string; code?: string } & T,
) => void;

/**
 * Emit ping for clock synchronization
 */
export function emitPing(
  payload: PartyPingPayload,
  callback?: Callback<{ t1: number; serverTime: number }>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback?.({
      success: false,
      error: 'Not connected',
      t1: 0,
      serverTime: 0,
    });
    return;
  }
  socket.emit('party:ping', payload, callback);
}

/**
 * Emit party event (play/pause/seek/rate)
 */
export function emitPartyEvent(
  payload: PartyEvent,
  callback?: Callback<{ serverTime: number }>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback?.({
      success: false,
      error: 'Not connected',
      serverTime: 0,
    });
    return;
  }
  socket.emit('party:event', payload, callback);
}

/**
 * Create a watch party room
 */
export function createPartyRoom(
  payload: PartyCreatePayload,
  callback: Callback<{ room?: WatchPartyRoom; streamToken?: string }>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback({ success: false, error: 'Not connected' });
    return;
  }

  socket.emit('party:create', payload, callback);
}

// ... (skipping other functions unchanged) ...

// ============ Chat API ============

export function sendPartyMessage(
  content: string,
  callback?: Callback<{ message?: ChatMessage }>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback?.({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('party:send_message', { content }, callback);
}

export function getPartyMessages(
  callback: Callback<{ messages?: ChatMessage[] }>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback?.({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('party:get_messages', {}, callback);
}

/**
 * Emit typing start event
 */
export function emitTypingStart(): void {
  const socket = getSocket();
  if (!socket) return;
  socket.emit('party:typing_start');
}

/**
 * Emit typing stop event
 */
export function emitTypingStop(): void {
  const socket = getSocket();
  if (!socket) return;
  socket.emit('party:typing_stop');
}

/**
 * Emit social interaction (emoji, sound, animation)
 */
export function emitPartyInteraction(
  payload: Omit<InteractionPayload, 'userId' | 'userName' | 'timestamp'>,
  callback?: Callback<Partial<{ timestamp: string | number }>>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback?.({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('party:interaction', payload, callback);
}

/**
 * Request to join a watch party room
 */
export function requestJoinPartyRoom(
  payload: PartyJoinRequestPayload,
  callback: Callback<{
    status?: 'pending';
    room?: WatchPartyRoom;
    guestToken?: string;
    streamToken?: string;
  }>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('party:join_request', payload, callback);
}

/**
 * Approve a join request (Host only)
 */
export function approveJoinRequest(
  memberId: string,
  callback: Callback<object>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('party:approve_request', { memberId }, callback);
}

/**
 * Reject a join request (Host only)
 */
export function rejectJoinRequest(
  memberId: string,
  callback: Callback<object>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('party:reject_request', { memberId }, callback);
}

/**
 * Kick a member (Host only)
 */
export function kickMember(memberId: string, callback: Callback<object>): void {
  const socket = getSocket();
  if (!socket) {
    callback({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('party:kick_member', { memberId }, callback);
}

/**
 * Leave the current watch party
 */
export function leavePartyRoom(callback: Callback<object>): void {
  const socket = getSocket();
  if (!socket) {
    callback({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('party:leave', callback);
}

/**
 * Sync playback state (host only)
 */
export function syncPartyState(
  payload: PartySyncPayload,
  callback?: Callback<object>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback?.({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('party:sync', payload, callback);
}

/**
 * Request current playback state from server (for guests/reconnection)
 */
export function requestPartyState(
  callback: Callback<{ state?: PartyStateUpdate }>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('party:request_state', {}, callback);
}

/**
 * Get room info via Socket.IO
 */
export function getPartyRoom(
  roomId: string,
  callback: Callback<{ room?: WatchPartyRoom }>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('party:get_room', { roomId }, callback);
}

/**
 * Update room content (Host only)
 */
export function updatePartyContent(
  payload: {
    title: string;
    type: 'movie' | 'series';
    season?: number;
    episode?: number;
  },
  callback: Callback<{ room?: WatchPartyRoom }>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('party:update_content', payload, callback);
}

/**
 * Get a new stream token (for content updates)
 */
export function getPartyStreamToken(
  callback: Callback<{ token?: string }>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('party:get_stream_token', {}, callback);
}

/**
 * Fetch pending join requests (Host only)
 * Fallback for when WebSocket notifications are missed
 */
export function fetchPendingRequests(
  roomId: string,
  callback: Callback<{
    pendingMembers?: Array<{
      id: string;
      name: string;
      profilePhoto?: string | null;
      isHost: boolean;
      joinedAt: number;
    }>;
  }>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('party:fetch_pending', { roomId }, callback);
}

/**
 * Socket.IO event listeners for room membership and playback updates.
 */

export function onPartyStateUpdate(
  callback: (data: PartyStateUpdate) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('party:state_update', callback);
  return () => socket.off('party:state_update', callback);
}

export function onPartyMemberJoined(
  callback: (data: PartyMemberJoined) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('party:member_joined', callback);
  return () => socket.off('party:member_joined', callback);
}

export function onPartyMemberLeft(
  callback: (data: PartyMemberLeft) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('party:member_left', callback);
  return () => socket.off('party:member_left', callback);
}

export function onPartyClosed(
  callback: (data: PartyClosed) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('party:closed', callback);
  return () => socket.off('party:closed', callback);
}

export function onPartyContentUpdated(
  callback: (data: { room: WatchPartyRoom }) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('party:content_updated', callback);
  return () => socket.off('party:content_updated', callback);
}

// New Admin/Guest Listeners

export function onPartyAdminRequest(
  callback: (data: PartyAdminRequest) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('party:admin_request', callback);
  return () => socket.off('party:admin_request', callback);
}

export function onPartyJoinApproved(
  callback: (data: PartyJoinApproved) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('party:join_approved', callback);
  return () => socket.off('party:join_approved', callback);
}

export function onPartyJoinRejected(
  callback: (data: PartyJoinRejected) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('party:join_rejected', callback);
  return () => socket.off('party:join_rejected', callback);
}

export function onPartyKicked(
  callback: (data: PartyKicked) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('party:kicked', callback);
  return () => socket.off('party:kicked', callback);
}

export function onPartyMemberRejected(
  callback: (data: { memberId: string }) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('party:member_rejected', callback);
  return () => socket.off('party:member_rejected', callback);
}

// ============ Chat API ============

export function onPartyMessage(
  callback: (message: ChatMessage) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('party:message', callback);
  return () => socket.off('party:message', callback);
}

export function onUserTyping(
  callback: (data: {
    userId: string;
    userName: string;
    isTyping: boolean;
  }) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('party:user_typing', callback);
  return () => socket.off('party:user_typing', callback);
}

export function onPartyHostDisconnected(
  callback: (data: { graceSeconds: number; message: string }) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('party:host_disconnected', callback);
  return () => socket.off('party:host_disconnected', callback);
}

export function onPartyHostReconnected(callback: () => void): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('party:host_reconnected', callback);
  return () => socket.off('party:host_reconnected', callback);
}

export function onPartyInteraction(
  callback: (data: InteractionPayload) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('party:interaction', callback);
  return () => socket.off('party:interaction', callback);
}

// ============ Soundboard API ============

export interface SoundItem {
  name: string;
  slug: string;
  sound: string;
  color: string;
}

export interface SoundboardResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SoundItem[];
}

/**
 * Fetch trending sounds from the backend
 */
export async function getTrendingSounds(page = 1): Promise<SoundboardResponse> {
  return apiFetch<SoundboardResponse>(`/api/soundboard?page=${page}`);
}

/**
 * Search sounds from the backend
 */
export async function searchSounds(
  query: string,
  page = 1,
): Promise<SoundboardResponse> {
  return apiFetch<SoundboardResponse>(
    `/api/soundboard/search?q=${encodeURIComponent(query)}&page=${page}`,
  );
}

// ============ Permissions & Sketch API ============

export function updatePartyPermissions(
  permissions: Partial<WatchPartyRoom['permissions']>,
  callback?: Callback<{ permissions?: WatchPartyRoom['permissions'] }>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback?.({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('party:update_permissions', { permissions }, callback);
}

export function updateMemberPermissions(
  memberId: string,
  permissions: Partial<NonNullable<RoomMember['permissions']>>,
  callback?: Callback<{
    memberId?: string;
    permissions?: RoomMember['permissions'];
  }>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback?.({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit(
    'party:update_member_permissions',
    { memberId, permissions },
    callback,
  );
}

export function onPartyPermissionsUpdated(
  callback: (data: PartyPermissionsUpdate) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('party:permissions_updated', callback);
  return () => socket.off('party:permissions_updated', callback);
}

export function onPartyMemberPermissionsUpdated(
  callback: (data: MemberPermissionsUpdate) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('party:member_permissions_updated', callback);
  return () => socket.off('party:member_permissions_updated', callback);
}

export function emitSketchDraw(
  payload: SketchAction,
  callback?: Callback<object>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback?.({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('sketch:draw', payload, callback);
}

export function emitSketchClear(
  payload: { type: 'all' | 'self' },
  callback?: Callback<object>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback?.({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('sketch:clear', payload, callback);
}

export function onSketchDraw(
  callback: (data: SketchAction) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('sketch:draw', callback);
  return () => socket.off('sketch:draw', callback);
}

export function onSketchClear(
  callback: (data: { userId: string; type: 'all' | 'self' }) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('sketch:clear', callback);
  return () => socket.off('sketch:clear', callback);
}

// Emitted by a new user joining the room
export function emitSketchRequestSync(): void {
  const socket = getSocket();
  if (!socket) return;
  socket.emit('sketch:request_sync');
}

// Received by the Host when someone asks for sync
export function onSketchProvideSync(
  callback: (data: { requesterId: string }) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('sketch:provide_sync', callback);
  return () => socket.off('sketch:provide_sync', callback);
}

// Emitted by the Host with all current canvas elements
export function emitSketchSyncState(
  requesterId: string,
  elements: SketchAction[],
): void {
  const socket = getSocket();
  if (!socket) return;
  socket.emit('sketch:sync_state', { requesterId, elements });
}

// Received by the requester with the current canvas elements
export function onSketchSyncState(
  callback: (data: { elements: SketchAction[] }) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('sketch:sync_state', callback);
  return () => socket.off('sketch:sync_state', callback);
}

// Undo the user's last drawing action and broadcast to the room
export function emitSketchUndo(
  payload: { actionId: string },
  callback?: Callback<object>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback?.({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('sketch:undo', payload, callback);
}

// Received when another user undoes one of their actions
export function onSketchUndo(
  callback: (data: { userId: string; actionId: string }) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('sketch:undo', callback);
  return () => socket.off('sketch:undo', callback);
}

// ============ Theme Sync API ============

/**
 * Host emits this to sync their sidebar colour theme to all members.
 */
export function updatePartyTheme(
  payload: { theme: string; customColor: string },
  callback?: Callback<object>,
): void {
  const socket = getSocket();
  if (!socket) {
    callback?.({ success: false, error: 'Not connected' });
    return;
  }
  socket.emit('party:update_theme', payload, callback);
}

/**
 * Subscribe to theme updates broadcast by the host.
 */
export function onPartyThemeUpdated(
  callback: (data: PartyThemeUpdate) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};
  socket.on('party:theme_updated', callback);
  return () => socket.off('party:theme_updated', callback);
}
