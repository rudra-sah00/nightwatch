'use client';

import type React from 'react';
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Socket } from 'socket.io-client';
import { crashLog, reportError } from '@/lib/analytics';
import {
  disconnectSocket,
  getSocket,
  initSocket,
  offForceLogout,
} from '@/lib/socket';
import type { ForceLogoutPayload } from '@/types';

interface SocketContextType {
  /** Current socket instance — null until connected */
  socket: Socket | null;
  /** Whether the socket is currently connected */
  isConnected: boolean;
  /** Connect socket with user credentials */
  connect: (
    userId: string,
    sessionId: string,
    userName?: string,
    profilePhoto?: string,
  ) => Promise<void>;
  /** Connect socket as guest (for watch party) */
  connectGuest: () => Promise<void>;
  /** Disconnect and clean up */
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const forceLogoutRef = useRef<((payload: ForceLogoutPayload) => void) | null>(
    null,
  );

  // Wire up connect/disconnect state tracking whenever socket changes
  useEffect(() => {
    if (!socket) {
      setIsConnected(false);
      return;
    }

    const onConnect = () => setIsConnected(true);
    const onDisconnect = (reason: string) => {
      setIsConnected(false);
      crashLog(`Socket disconnected: ${reason}`);
      if (reason === 'transport error' || reason === 'transport close') {
        reportError(`Socket transport failure: ${reason}`);
      }
    };
    const onConnectError = (err: Error) => {
      crashLog(`Socket connect_error: ${err.message}`);
      reportError(`Socket connect_error: ${err.message}`);
    };

    // If already connected (e.g. fast reconnect), set immediately
    if (socket.connected) {
      setIsConnected(true);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };
  }, [socket]);

  const connect = useCallback(
    async (
      userId: string,
      sessionId: string,
      userName?: string,
      profilePhoto?: string,
    ) => {
      const s = await initSocket(
        userId,
        sessionId,
        false,
        userName,
        profilePhoto,
      );
      setSocket(s);
    },
    [],
  );

  const connectGuest = useCallback(async () => {
    // Prevent re-creating socket if one already exists (avoids infinite loop)
    const existing = getSocket();
    if (existing) {
      setSocket(existing);
      return;
    }
    const s = await initSocket(undefined, undefined, true);
    setSocket(s);
  }, []);

  const disconnect = useCallback(() => {
    if (forceLogoutRef.current) {
      offForceLogout(forceLogoutRef.current);
      forceLogoutRef.current = null;
    }
    disconnectSocket();
    setSocket(null);
  }, []);

  // Sync with existing module-level socket on mount
  // (covers the case where AuthProvider already called initSocket before this provider renders)
  useEffect(() => {
    const existing = getSocket();
    if (existing) {
      setSocket(existing);
    }
  }, []);

  const value: SocketContextType = useMemo(
    () => ({
      socket,
      isConnected,
      connect,
      connectGuest,
      disconnect,
    }),
    [socket, isConnected, connect, connectGuest, disconnect],
  );

  return <SocketContext value={value}>{children}</SocketContext>;
}

/**
 * Hook to access the global socket instance reactively.
 * Re-renders when the socket connects/disconnects/changes.
 */
export function useSocket(): SocketContextType {
  const context = use(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
