// Rooms Service
// Handles all watch party room-related API calls

import { apiRequest, ApiResponse } from './client';

// ============ Room Types ============

export interface ParticipantPermissions {
    can_control_playback: boolean;
    can_invite_others: boolean;
}

export interface Participant {
    user_id: string;
    username: string;
    name: string;
    is_host: boolean;
    joined_at: string;
    permissions: ParticipantPermissions;
}

export interface PlaybackState {
    is_playing: boolean;
    position_seconds: number;
    updated_at: string;
}

export interface Room {
    id: string;
    code: string;
    host_id: string;
    video_id?: string;
    video_title?: string;
    playback: PlaybackState;
    participants: Participant[];
    created_at: string;
}

export interface JoinRequest {
    user_id: string;
    username: string;
    name: string;
    requested_at: string;
}

export interface CreateRoomResponse {
    room: Room;
    livekit_token?: string;
    code?: string;
}

export interface JoinRoomResponse {
    room: Room;
    livekit_token: string;
}

export interface JoinPendingResponse {
    message: string;
    status: 'pending' | 'rejected';
}

// ============ Room Management Functions ============

/**
 * Create a new watch party room
 */
export async function createRoom(
    videoId?: string,
    videoTitle?: string
): Promise<ApiResponse<CreateRoomResponse>> {
    return apiRequest<CreateRoomResponse>('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ video_id: videoId, video_title: videoTitle }),
    });
}

/**
 * Get room details by code
 */
export async function getRoom(
    code: string
): Promise<ApiResponse<{ room: Room }>> {
    return apiRequest<{ room: Room }>(`/api/rooms/${code.toUpperCase()}`);
}

/**
 * Request to join a room
 */
export async function requestToJoinRoom(
    code: string
): Promise<ApiResponse<JoinRoomResponse | JoinPendingResponse>> {
    return apiRequest<JoinRoomResponse | JoinPendingResponse>(
        `/api/rooms/${code.toUpperCase()}/join`,
        { method: 'POST' }
    );
}

/**
 * Leave a room (or delete if host)
 */
export async function leaveRoom(
    code: string
): Promise<ApiResponse<{ message: string }>> {
    return apiRequest<{ message: string }>(
        `/api/rooms/${code.toUpperCase()}/leave`,
        { method: 'POST' }
    );
}

// ============ Host-Only Functions ============

/**
 * Get pending join requests (host only)
 */
export async function getPendingRequests(
    code: string
): Promise<ApiResponse<{ requests: JoinRequest[] }>> {
    return apiRequest<{ requests: JoinRequest[] }>(
        `/api/rooms/${code.toUpperCase()}/requests`
    );
}

/**
 * Approve a join request (host only)
 */
export async function approveJoinRequest(
    code: string,
    userId: string
): Promise<ApiResponse<{ room: Room; livekit_token: string }>> {
    return apiRequest<{ room: Room; livekit_token: string }>(
        `/api/rooms/${code.toUpperCase()}/requests/${userId}/approve`,
        { method: 'POST' }
    );
}

/**
 * Reject a join request (host only)
 */
export async function rejectJoinRequest(
    code: string,
    userId: string
): Promise<ApiResponse<{ message: string }>> {
    return apiRequest<{ message: string }>(
        `/api/rooms/${code.toUpperCase()}/requests/${userId}/reject`,
        { method: 'POST' }
    );
}

/**
 * Update playback state (host only)
 */
export async function updatePlaybackState(
    code: string,
    isPlaying: boolean,
    positionSeconds: number
): Promise<ApiResponse<{ playback: PlaybackState }>> {
    return apiRequest<{ playback: PlaybackState }>(
        `/api/rooms/${code.toUpperCase()}/playback`,
        {
            method: 'PUT',
            body: JSON.stringify({
                is_playing: isPlaying,
                position_seconds: positionSeconds,
            }),
        }
    );
}

// ============ Chat Functions ============

export interface ChatMessage {
    id: string;
    user_id: string;
    username: string;
    message: string;
    created_at: string;
}

export interface SendChatResponse {
    message: ChatMessage;
}

export async function sendChat(code: string, message: string) {
    return apiRequest<SendChatResponse>(`/api/rooms/${code.toUpperCase()}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message }),
    });
}

export async function getChat(code: string) {
    return apiRequest<{ messages: ChatMessage[] }>(`/api/rooms/${code.toUpperCase()}/chat`);
}

// ============ Backward Compatibility Aliases ============

export const joinRoom = requestToJoinRoom;

/**
 * Legacy wrapper for updatePlaybackState to match old signature
 */
export async function updatePlayback(
    code: string,
    isPlaying: boolean,
    currentTime: number,
    _playbackRate?: number
) {
    return updatePlaybackState(code, isPlaying, currentTime);
}

export async function getPlaybackState(code: string) {
    const result = await getRoom(code);
    return result.data ? { data: result.data.room.playback } : { error: result.error };
}

export async function handleJoinRequest(code: string, userId: string, approve: boolean) {
    if (approve) {
        return approveJoinRequest(code, userId);
    } else {
        return rejectJoinRequest(code, userId);
    }
}
