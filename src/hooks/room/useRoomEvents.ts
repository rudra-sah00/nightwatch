'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getWebSocketToken } from '@/services/api/client';

export interface PlaybackUpdateEvent {
    type: 'playback_update';
    room_code: string;
    is_playing: boolean;
    current_time: number;
    playback_rate: number;
    updated_by: string;
}

export interface VideoSelectedEvent {
    type: 'video_selected';
    room_code: string;
    video_id: string;
    video_title: string;
    episode_id?: string;
}

export interface RoomEvent {
    type: 'participant_joined' | 'participant_left' | 'room_deleted' | 'room_updated' | 'join_request_received' | 'playback_update' | 'video_selected';
    room_code: string;
    user_id?: string;
    username?: string;
    reason?: string;
    // Playback update fields
    is_playing?: boolean;
    current_time?: number;
    playback_rate?: number;
    updated_by?: string;
    // Video selected fields
    video_id?: string;
    video_title?: string;
    episode_id?: string;
}

interface UseRoomEventsProps {
    roomCode: string;
    enabled: boolean;
    onEvent: (event: RoomEvent) => void;
}

/**
 * Hook to subscribe to real-time room events via WebSocket
 */
export function useRoomEvents({ roomCode, enabled, onEvent }: UseRoomEventsProps) {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;
    const onEventRef = useRef(onEvent);
    const isConnectingRef = useRef(false);
    
    // Keep onEvent ref updated without triggering reconnects
    useEffect(() => {
        onEventRef.current = onEvent;
    }, [onEvent]);

    const connect = useCallback(async () => {
        if (!enabled || !roomCode) return;
        
        // Prevent multiple simultaneous connection attempts
        if (isConnectingRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }
        isConnectingRef.current = true;

        // Close any existing connection first
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        const token = await getWebSocketToken();
        if (!token) {
            console.error('Failed to get WebSocket token');
            isConnectingRef.current = false;
            return;
        }

        // WebSocket must connect directly to backend (not through Next.js proxy)
        // Use NEXT_PUBLIC_BACKEND_URL for direct backend connection
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
        const wsUrl = backendUrl.replace(/^http/, 'ws');
        const url = `${wsUrl}/api/rooms/${roomCode.toUpperCase()}/ws?token=${encodeURIComponent(token)}`;

        console.log('Connecting to room WebSocket:', url);
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('Room WebSocket connected to', roomCode);
            reconnectAttemptsRef.current = 0;
            isConnectingRef.current = false;
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as RoomEvent;
                onEventRef.current(data);
            } catch {
                // Failed to parse WebSocket message
            }
        };

        ws.onclose = () => {
            wsRef.current = null;
            isConnectingRef.current = false;

            // Attempt reconnection with exponential backoff
            if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
                reconnectAttemptsRef.current++;
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, delay);
            }
        };

        ws.onerror = (error) => {
            console.error('Room WebSocket error:', error);
            isConnectingRef.current = false;
        };
    }, [enabled, roomCode]); // Removed onEvent - using ref instead

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
    }, []);

    useEffect(() => {
        if (enabled) {
            connect();
        } else {
            disconnect();
        }

        return () => {
            disconnect();
        };
    }, [enabled, roomCode, connect, disconnect]); // Added roomCode to reconnect on room change

    return { disconnect };
}
