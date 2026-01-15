'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getAccessToken } from '@/lib/api/client';

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
            console.error('No auth token available for SSE');
            return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
        const url = `${apiUrl}/api/rooms/${roomCode.toUpperCase()}/events?token=${encodeURIComponent(token)}`;

        console.log('Connecting to room events SSE...');
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            console.log('SSE connection established');
            reconnectAttemptsRef.current = 0;
        };

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as RoomEvent;
                console.log('Received room event:', data);
                onEvent(data);
            } catch (err) {
                console.error('Failed to parse SSE event:', err);
            }
        };

        eventSource.onerror = (error) => {
            console.error('SSE error:', error);
            eventSource.close();
            eventSourceRef.current = null;

            // Attempt reconnection with exponential backoff
            if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
                reconnectAttemptsRef.current++;
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
                console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
                
                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, delay);
            } else {
                console.error('Max reconnection attempts reached or SSE disabled');
            }
        };
    }, [enabled, roomCode, onEvent]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (eventSourceRef.current) {
            console.log('Closing SSE connection');
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
