'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getWebSocketToken } from '@/services/api/client';

export interface RoomEvent {
    type: 'participant_joined' | 'participant_left' | 'room_deleted' | 'room_updated' | 'join_request_received';
    room_code: string;
    user_id?: string;
    username?: string;
    reason?: string;
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

    const connect = useCallback(async () => {
        if (!enabled || !roomCode) return;

        // Close any existing connection first
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        const token = await getWebSocketToken();
        if (!token) {
            console.error('Failed to get WebSocket token');
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
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as RoomEvent;
                onEvent(data);
            } catch {
                // Failed to parse WebSocket message
            }
        };

        ws.onclose = () => {
            wsRef.current = null;

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
        };
    }, [enabled, roomCode, onEvent]);

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
    }, [enabled, connect, disconnect]);

    return { disconnect };
}
