'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getAccessToken } from '@/services/api/client';

export interface RoomEvent {
    type: 'participant_joined' | 'participant_left' | 'room_deleted' | 'room_updated';
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
 * Hook to subscribe to real-time room events via SSE
 */
export function useRoomEvents({ roomCode, enabled, onEvent }: UseRoomEventsProps) {
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;

    const connect = useCallback(() => {
        if (!enabled || !roomCode) return;

        const token = getAccessToken();
        if (!token) {
            return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const url = `${apiUrl}/api/rooms/${roomCode.toUpperCase()}/events?token=${encodeURIComponent(token)}`;

        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            reconnectAttemptsRef.current = 0;
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as RoomEvent;
                onEvent(data);
            } catch {
                // Failed to parse SSE event
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
            eventSourceRef.current = null;

            // Attempt reconnection with exponential backoff
            if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
                reconnectAttemptsRef.current++;
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, delay);
            } else {
                // Max reconnection attempts reached or SSE disabled
            }
        };
    }, [enabled, roomCode, onEvent]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
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
