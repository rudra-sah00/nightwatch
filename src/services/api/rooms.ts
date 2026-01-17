// Rooms Service
// Handles all watch party room-related API calls

import { apiRequest, ApiResponse } from './client';
import type { CompleteVideoData } from '@/types/content';

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
    current_time: number;
    playback_rate: number;
    updated_at: string;
    updated_by: string;
}

export interface Room {
    id: string;
    code: string;
    host_id: string;
    video_id?: string;
    video_title?: string;
    episode_id?: string;
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
    currentTime: number,
    playbackRate: number = 1.0
): Promise<ApiResponse<{ playback: PlaybackState }>> {
    return apiRequest<{ playback: PlaybackState }>(
        `/api/rooms/${code.toUpperCase()}/playback`,
        {
            method: 'POST',
            body: JSON.stringify({
                is_playing: isPlaying,
                current_time: currentTime,
                playback_rate: playbackRate,
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

/**
 * Load video for room (host only)
 * Backend fetches video data via Playwright and broadcasts to all participants
 * This is the optimized flow: ONE Playwright call per video, not per participant
 */
export async function loadVideoForRoom(
    code: string,
    videoId: string,
    episodeId?: string
): Promise<ApiResponse<{ message: string; video_id: string; video_title: string; video: CompleteVideoData }>> {
    return apiRequest<{ message: string; video_id: string; video_title: string; video: CompleteVideoData }>(
        `/api/rooms/${code.toUpperCase()}/video`,
        {
            method: 'PUT',
            body: JSON.stringify({
                video_id: videoId,
                episode_id: episodeId,
            }),
        }
    );
}

// Alias for backward compatibility
export const updateRoomVideo = loadVideoForRoom;


// ============ Backward Compatibility Aliases ============

export const joinRoom = requestToJoinRoom;

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
