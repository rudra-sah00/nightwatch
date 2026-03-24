import { apiFetch } from '@/lib/fetch';
import type {
  ChatMessage,
  PartyCreatePayload,
  PartyJoinRequestPayload,
  RoomPreview,
  WatchPartyRoom,
} from '../types';

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
      hostId?: string;
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
          hostId: data.hostId,
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

// =========================================================================
// WATCH PARTY REST EXPORTS
// These replace the old Socket.IO emit-with-callback functions.
// All real-time delivery happens via RTM messages (fired from the hook),
// but state mutations that require backend validation use these REST calls.
// =========================================================================

/**
 * Create a watch party room
 */
export async function createPartyRoom(
  roomId: string,
  payload: PartyCreatePayload,
): Promise<{ room?: WatchPartyRoom; streamToken?: string; error?: string }> {
  try {
    const data = await apiFetch<{ room: WatchPartyRoom; streamToken: string }>(
      `/api/rooms/${roomId}/create`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    return data;
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Request to join a watch party room
 */
export async function requestJoinPartyRoom(
  roomId: string,
  payload: PartyJoinRequestPayload,
): Promise<{
  status?: 'pending';
  room?: WatchPartyRoom;
  guestToken?: string;
  streamToken?: string;
  error?: string;
}> {
  try {
    const data = await apiFetch<Record<string, unknown>>(
      `/api/rooms/${roomId}/join`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    return data;
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Approve a join request (Host only)
 */
export async function approveJoinRequest(
  roomId: string,
  memberId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiFetch(`/api/rooms/${roomId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Reject a join request (Host only)
 */
export async function rejectJoinRequest(
  roomId: string,
  memberId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiFetch(`/api/rooms/${roomId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Kick a member (Host only)
 */
export async function kickMember(
  roomId: string,
  memberId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiFetch(`/api/rooms/${roomId}/kick`, {
      method: 'POST',
      body: JSON.stringify({ memberId }),
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Leave the current watch party
 */
export async function leavePartyRoom(
  roomId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const guestToken =
      typeof window !== 'undefined'
        ? sessionStorage.getItem('guest_token')
        : undefined;
    await apiFetch(`/api/rooms/${roomId}/leave`, {
      method: 'POST',
      body: guestToken ? JSON.stringify({ guestId: guestToken }) : undefined,
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Request current playback state from server (for guests/reconnection)
 */
export async function requestPartyState(
  roomId: string,
): Promise<{ state?: Record<string, unknown>; error?: string }> {
  try {
    const data = await apiFetch<Record<string, unknown>>(
      `/api/rooms/${roomId}/state`,
    );
    return { state: data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Sync playback state (host only)
 */
export async function syncPartyState(
  roomId: string,
  payload: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiFetch(`/api/rooms/${roomId}/state`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Get room info via REST
 */
export async function getPartyRoom(
  roomId: string,
): Promise<{ room?: WatchPartyRoom; error?: string }> {
  try {
    const room = await getRoomDetails(roomId);
    if (!room) return { error: 'Not found' };
    return { room };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Update room content (Host only)
 */
export async function updatePartyContent(
  roomId: string,
  payload: {
    title: string;
    type: 'movie' | 'series';
    season?: number;
    episode?: number;
  },
): Promise<{ room?: WatchPartyRoom; error?: string }> {
  try {
    const data = await apiFetch<{ room: WatchPartyRoom }>(
      `/api/rooms/${roomId}/content`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    return { room: data.room };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Get a new stream token (for content updates)
 */
export async function getPartyStreamToken(
  roomId: string,
): Promise<{ token?: string; error?: string }> {
  try {
    const data = await apiFetch<{ token: string }>(
      `/api/rooms/${roomId}/stream-token`,
    );
    return { token: data.token };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Fetch pending join requests (Host only)
 */
export async function fetchPendingRequests(roomId: string): Promise<{
  pendingMembers?: Array<{
    id: string;
    name: string;
    profilePhoto?: string | null;
    isHost: boolean;
    joinedAt: number;
  }>;
  error?: string;
}> {
  try {
    const data = await apiFetch<{
      pendingMembers: Array<{
        id: string;
        name: string;
        profilePhoto?: string | null;
        isHost: boolean;
        joinedAt: number;
      }>;
    }>(`/api/rooms/${roomId}/pending`);
    return { pendingMembers: data.pendingMembers };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Update room global permissions
 */
export async function updatePartyPermissions(
  roomId: string,
  permissions: Partial<WatchPartyRoom['permissions']>,
): Promise<{ permissions?: WatchPartyRoom['permissions']; error?: string }> {
  try {
    const data = await apiFetch<{ permissions: WatchPartyRoom['permissions'] }>(
      `/api/rooms/${roomId}/permissions`,
      {
        method: 'POST',
        body: JSON.stringify({ permissions }),
      },
    );
    return { permissions: data.permissions };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Update individual member permissions
 */
export async function updateMemberPermissions(
  roomId: string,
  memberId: string,
  permissions: Record<string, unknown>,
): Promise<{
  memberId?: string;
  permissions?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const data = await apiFetch<Record<string, unknown>>(
      `/api/rooms/${roomId}/members/${memberId}/permissions`,
      {
        method: 'POST',
        body: JSON.stringify({ permissions }),
      },
    );
    return data;
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============ Chat REST API ============

export async function sendPartyMessage(
  roomId: string,
  content: string,
): Promise<{ message?: ChatMessage; error?: string }> {
  try {
    const data = await apiFetch<{ message: ChatMessage }>(
      `/api/rooms/${roomId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      },
    );
    return { message: data.message };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getPartyMessages(
  roomId: string,
): Promise<{ messages?: ChatMessage[]; error?: string }> {
  try {
    const data = await apiFetch<{ messages: ChatMessage[] }>(
      `/api/rooms/${roomId}/messages`,
    );
    return { messages: data.messages };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
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

// =========================================================================
// RTM EVENT DISPATCHER & LISTENERS
// These restore the old Socket.IO "on" API by bridging RTM messages
// to a local event emitter. This minimizes refactoring in UI components.
// =========================================================================

type RtmListener = (data: Record<string, unknown>) => void;
const rtmListeners: Record<string, Set<RtmListener>> = {};

/**
 * Internal: Dispatch an incoming RTM message to all local subscribers
 */
export function dispatchRtmMessage(msg: Record<string, unknown>) {
  const eventType = msg.type as string;
  if (rtmListeners[eventType]) {
    rtmListeners[eventType].forEach((cb) => {
      cb(msg);
    });
  }
  // Also dispatch to the generic "INTERACTION" listener if it's an interaction
  if (eventType === 'INTERACTION' && rtmListeners.INTERACTION) {
    rtmListeners.INTERACTION.forEach((cb) => {
      cb(msg);
    });
  }
}

function subscribe(event: string, callback: RtmListener) {
  if (!rtmListeners[event]) rtmListeners[event] = new Set();
  rtmListeners[event].add(callback);
  return () => {
    rtmListeners[event].delete(callback);
  };
}

export const onSketchDraw = <T = unknown>(callback: (action: T) => void) =>
  subscribe('SKETCH_DRAW', (msg) => callback(msg.action as unknown as T));

export const onSketchClear = <
  T extends { userId: string; type: 'all' | 'self' } = {
    userId: string;
    type: 'all' | 'self';
  },
>(
  callback: (data: T) => void,
) =>
  subscribe('SKETCH_CLEAR', (msg) =>
    callback({
      userId: msg.userId as string,
      type: msg.mode as 'all' | 'self',
    } as unknown as T),
  );

export const onSketchUndo = <
  T extends { userId: string; actionId: string } = {
    userId: string;
    actionId: string;
  },
>(
  callback: (data: T) => void,
) =>
  subscribe('SKETCH_UNDO', (msg) =>
    callback({
      userId: msg.userId as string,
      actionId: msg.actionId as string,
    } as unknown as T),
  );

export const onSketchProvideSync = <
  T extends { requesterId: string } = { requesterId: string },
>(
  callback: (data: T) => void,
) =>
  subscribe('SKETCH_REQUEST_SYNC', (msg) =>
    callback({ requesterId: msg.requesterId as string } as unknown as T),
  );

export const onSketchSyncState = <T = unknown[]>(
  callback: (data: { elements: T }) => void,
) =>
  subscribe('SKETCH_SYNC_STATE', (msg) =>
    callback({ elements: msg.elements as T }),
  );

export const onPartyInteraction = <T = unknown>(
  callback: (interaction: T) => void,
) => subscribe('INTERACTION', (msg) => callback(msg as unknown as T));
