import { io, type Socket } from 'socket.io-client';
import type { ForceLogoutPayload } from '@/types';
import { WS_EVENTS } from './constants';
import { env } from './env';

let socket: Socket | null = null;

/**
 * Initialize WebSocket connection with user credentials or as guest
 */
export function initSocket(
  userId?: string,
  sessionId?: string,
  isGuest = false,
  userName?: string,
  profilePhoto?: string,
): Socket {
  if (socket?.connected) {
    socket.disconnect();
  }

  const query: Record<string, string> = {};
  if (userId) query.userId = userId;
  if (sessionId) query.sessionId = sessionId;
  if (userName) query.userName = userName;
  if (profilePhoto) query.profilePhoto = profilePhoto;
  if (isGuest) {
    query.isGuest = 'true';
    // Check storage for existing guest token
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem('guest_token');
      if (token) query.guestToken = token;
    }
  }

  socket = io(env.WS_URL, {
    query,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity, // Keep trying indefinitely
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000, // Cap delay at 5s
    timeout: 20000, // Connection timeout
  });

  socket.on('connect', () => {});

  socket.on('disconnect', () => {});

  socket.on('connect_error', () => {});

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
export function onForceLogout(
  callback: (payload: ForceLogoutPayload) => void,
): void {
  if (socket) {
    socket.on(WS_EVENTS.FORCE_LOGOUT, callback);
  }
}

/**
 * Remove force logout handler
 */
export function offForceLogout(
  callback?: (payload: ForceLogoutPayload) => void,
): void {
  if (socket) {
    if (callback) {
      socket.off(WS_EVENTS.FORCE_LOGOUT, callback);
    } else {
      socket.off(WS_EVENTS.FORCE_LOGOUT);
    }
  }
}
