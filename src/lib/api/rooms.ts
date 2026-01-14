// Room API Module - Watch Party Management

import { apiRequest } from './client';

export interface Participant {
    user_id: string;
    username: string;
    role: 'host' | 'admin' | 'member';
    permissions: {
        can_control_playback: boolean;
        can_chat: boolean;
    };
}

export interface PlaybackState {
    is_playing: boolean;
    current_time: number;
    playback_rate: number;
    updated_at: string;
    updated_by: string;
}

export interface Room {
    code: string;
    host_id: string;
    host_name: string;
    video_id?: string;
    video_title?: string;
    participants: Participant[];
    settings: {
        chat_enabled: boolean;
        sync_playback: boolean;
        require_approval: boolean;
    };
    playback: PlaybackState;
    livekit_room_name: string;
}

export interface CreateRoomResponse {
    code: string;
    room: Room;
    livekit_token: string;
}

export interface JoinRoomResponse {
    room: Room;
    livekit_token: string;
}

export interface JoinPendingResponse {
    message: string;
    status: 'pending';
}

// ============ Room CRUD ============

export interface CreateRoomBody {
    require_approval: boolean;
    video_id?: string;
    video_title?: string;
}

export async function createRoom(videoId?: string, videoTitle?: string) {
    const body: CreateRoomBody = {
        require_approval: true,
    };
    
    if (videoId && videoTitle) {
        body.video_id = videoId;
        body.video_title = videoTitle;
    }
    
    return apiRequest<CreateRoomResponse>('/api/rooms', {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export async function joinRoom(code: string) {
    return apiRequest<JoinRoomResponse | JoinPendingResponse>(`/api/rooms/${code.toUpperCase()}/join`, {
        method: 'POST',
    });
}

export async function getRoom(code: string) {
    return apiRequest<{ room: Room }>(`/api/rooms/${code.toUpperCase()}`);
}

export async function leaveRoom(code: string) {
    return apiRequest<{ message: string }>(`/api/rooms/${code.toUpperCase()}/leave`, {
        method: 'POST',
    });
}

// ============ Join Requests ============

export interface JoinRequest {
    user_id: string;
    username: string;
    requested_at: string;
}

export interface HandleJoinRequestResponse {
    message: string;
    success: boolean;
}

export async function getPendingRequests(code: string) {
    return apiRequest<{ requests: JoinRequest[] }>(`/api/rooms/${code.toUpperCase()}/requests`);
}

export async function handleJoinRequest(code: string, userId: string, approve: boolean) {
    return apiRequest<HandleJoinRequestResponse>(`/api/rooms/${code.toUpperCase()}/requests`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, approve }),
    });
}

// ============ Playback Sync ============

export async function updatePlayback(code: string, isPlaying: boolean, currentTime: number, playbackRate?: number) {
    return apiRequest<{ playback: PlaybackState }>(`/api/rooms/${code.toUpperCase()}/playback`, {
        method: 'PUT',
        body: JSON.stringify({
            is_playing: isPlaying,
            current_time: currentTime,
            playback_rate: playbackRate,
        }),
    });
}

export async function getPlaybackState(code: string) {
    const result = await getRoom(code);
    return result.data ? { data: result.data.room.playback } : { error: result.error };
}

// ============ Chat ============

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
