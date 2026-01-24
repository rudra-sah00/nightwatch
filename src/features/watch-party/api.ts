import { getSocket } from '@/lib/ws';
import type {
  ChatMessage, // New
  PartyAdminRequest,
  PartyClosed,
  PartyCreatePayload,
  PartyJoinApproved,
  PartyJoinRejected,
  PartyJoinRequestPayload,
  PartyKicked,
  PartyMemberJoined,
  PartyMemberLeft,
  PartyStateUpdate,
  PartySyncPayload,
  RoomPreview,
  WatchPartyRoom,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

// ============ REST API ============

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
    const res = await fetch(`${API_URL}/api/rooms/${roomId}/exists`);
    const data = await res.json();

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
          maxMembers: data.maxMembers || 10,
          isFull: data.isFull || false,
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
  const res = await fetch(`${API_URL}/api/rooms/${roomId}`, {
    credentials: 'include',
  });

  if (!res.ok) return null;
  return res.json();
}

// ============ WebSocket API ============

type Callback<T> = (response: { success: boolean; error?: string } & T) => void;

/**
 * Create a watch party room
 */
export function createPartyRoom(
  payload: PartyCreatePayload,
  callback: Callback<{ room?: WatchPartyRoom }>,
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
 * Request to join a watch party room
 */
export function requestJoinPartyRoom(
  payload: PartyJoinRequestPayload,
  callback: Callback<{ status?: 'pending'; room?: WatchPartyRoom }>,
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
 * Get room info via WebSocket
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

// ============ Event Listeners ============

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

// ============ Chat API ============

export function onPartyMessage(
  callback: (message: ChatMessage) => void,
): () => void {
  const socket = getSocket();
  if (!socket) return () => {};

  socket.on('party:message', callback);
  return () => socket.off('party:message', callback);
}
