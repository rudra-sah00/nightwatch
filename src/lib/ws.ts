import { io, Socket } from 'socket.io-client';
import { env } from './env';
import { ForceLogoutPayload } from '@/types';
import { WS_EVENTS } from './constants';

let socket: Socket | null = null;

/**
 * Initialize WebSocket connection with user credentials
 */
export function initSocket(userId: string, sessionId: string): Socket {
    if (socket?.connected) {
        socket.disconnect();
    }

    socket = io(env.WS_URL, {
        query: { userId, sessionId },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
        console.log('🔌 WebSocket connected');
    });

    socket.on('disconnect', (reason) => {
        console.log('🔌 WebSocket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error.message);
    });

    return socket;
}

/**
 * Disconnect WebSocket
 */
export function disconnectSocket(): void {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

/**
 * Get current socket instance
 */
export function getSocket(): Socket | null {
    return socket;
}

/**
 * Register force logout handler
 */
export function onForceLogout(callback: (payload: ForceLogoutPayload) => void): void {
    if (socket) {
        socket.on(WS_EVENTS.FORCE_LOGOUT, callback);
    }
}

/**
 * Remove force logout handler
 */
export function offForceLogout(callback?: (payload: ForceLogoutPayload) => void): void {
    if (socket) {
        if (callback) {
            socket.off(WS_EVENTS.FORCE_LOGOUT, callback);
        } else {
            socket.off(WS_EVENTS.FORCE_LOGOUT);
        }
    }
}
