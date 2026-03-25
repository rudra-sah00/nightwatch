'use client';

import type AgoraRTMType from 'agora-rtm-sdk';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { RTMMessage } from '../../room/types/rtm-messages';

/**
 * Connection states for the Agora RTM client.
 */
export type RtmConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTING';

// Export RTMMessage so other hooks can type their handlers
export type { RTMMessage };

/**
 * Options passed into `useAgoraRtm`.
 */
interface UseAgoraRtmOptions {
  /** Agora App ID */
  appId: string;
  /** RTM token from /api/agora/rtm-token */
  token: string | null;
  /** RTM channel name — matches the room code (uppercase) */
  channel: string;
  /** Current user's ID (string — RTM uses string UIDs) */
  userId: string | undefined;
  /** Called whenever an RTM message arrives from *another* user */
  onMessage?: (message: RTMMessage, senderId: string) => void;
  /** Called whenever a user joins or leaves the channel */
  onPresence?: (event: { action: 'JOIN' | 'LEAVE'; userId: string }) => void;
}

/**
 * Core hook for Agora RTM (Real-Time Messaging / signaling) in Watch Party.
 *
 * Replaces the Socket.IO transport layer for all data-plane events:
 * playback sync, chat, member events, permissions, sketch, and interactions.
 *
 * @remarks
 * - A single AgoraRTM client instance is created per mount and torn down
 *   on unmount or when `token`/`channel`/`userId` change.
 * - Messages from the local user are NOT fired via `onMessage` — only messages
 *   received from other participants trigger the callback.
 * - The hook automatically reconnects after transient network failures.
 * - Log level is suppressed in production to avoid console noise.
 *
 * @example
 * ```ts
 * const { sendMessage, connectionState, isConnected } = useAgoraRtm({
 *   appId, token, channel, userId,
 *   onMessage: (msg, senderId) => {
 *     if (msg.type === 'PLAY_EVENT') { ... }
 *   },
 * });
 * ```
 */
export function useAgoraRtm(options: UseAgoraRtmOptions) {
  const { appId, token, channel, userId, onMessage } = options;
  // --- Refs for SDK objects ---
  const clientRef = useRef<typeof AgoraRTMType.RTM.prototype | null>(null);
  const channelRef = useRef<string | null>(null);
  // Stable ref so the message listener can call the latest callback without
  // needing to be re-registered on every re-render.
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const onPresenceRef = useRef(options.onPresence);
  onPresenceRef.current = options.onPresence;

  // --- State ---
  const [connectionState, setConnectionState] =
    useState<RtmConnectionState>('DISCONNECTED');
  const [isConnected, setIsConnected] = useState(false);

  /**
   * Send a typed RTM message to all participants in the current channel.
   * Message is serialised to JSON before transmission.
   */
  const sendMessage = useCallback(
    async (message: RTMMessage) => {
      const client = clientRef.current;
      const currentChannel = channelRef.current;

      if (!client || !currentChannel || !isConnected) {
        return;
      }

      try {
        await client.publish(currentChannel, JSON.stringify(message));
      } catch (_error) {
        // RTM Publish Error
      }
    },
    [isConnected],
  );

  const sendMessageToPeer = useCallback(
    async (targetUserId: string, message: RTMMessage) => {
      const client = clientRef.current;
      if (!client || !isConnected) {
        return;
      }

      try {
        const peerChannel = `user:${targetUserId}`;
        await client.publish(peerChannel, JSON.stringify(message));
      } catch (_error) {
        // Peer Publish Error
      }
    },
    [isConnected],
  );

  /**
   * Core RTM initialisation effect.
   * Creates the client, subscribes to the channel, and attach event listeners.
   * Tears down entirely when dependencies change or component unmounts.
   */
  useEffect(() => {
    if (!token || !appId || !channel || !userId) return;

    let cleaned = false;
    let client: typeof AgoraRTMType.RTM.prototype | null = null;
    let fallbackCleanup = () => {};

    // IIFE to dynamically import client and login to handle SSR environment safely
    (async () => {
      try {
        const AgoraRTM = (await import('agora-rtm-sdk')).default;
        if (cleaned) return;

        // Suppress SDK logs in production
        const logLevel =
          process.env.NODE_ENV === 'production' ? 'none' : 'warn';

        client = new AgoraRTM.RTM(appId, userId, { logLevel });
        clientRef.current = client;
        channelRef.current = channel;

        const userChannel = `user:${userId}`;

        // --- Event listeners ---

        // Channel message received from another user
        const handleMessage = (rtmEvent: {
          publisher: string;
          message: string | Uint8Array;
        }) => {
          if (cleaned) return;
          // Skip own messages (RTM delivers them back to sender)
          if (rtmEvent.publisher === userId) return;
          // Only process text messages (ignore binary)
          if (typeof rtmEvent.message !== 'string') return;

          try {
            const parsed = JSON.parse(rtmEvent.message) as RTMMessage;
            onMessageRef.current?.(parsed, rtmEvent.publisher);
          } catch {
            // Malformed message — silently ignore
          }
        };

        // Connection state changes
        const handleStatus = (event: { state: string; reason: string }) => {
          if (cleaned) return;
          const state = event.state as RtmConnectionState;
          setConnectionState(state);
          setIsConnected(state === 'CONNECTED');

          if (state === 'RECONNECTING') {
            toast.warning('Reconnecting to signaling server…', {
              id: 'rtm-connection',
              duration: 10000,
            });
          } else if (state === 'CONNECTED') {
            toast.dismiss('rtm-connection');
          } else if (state === 'DISCONNECTED' && event.reason !== 'LOGOUT') {
            toast.error('Disconnected from signaling server', {
              id: 'rtm-connection',
            });
          }
        };

        // Presence events
        const handlePresence = (event: {
          eventType: string;
          channelName: string;
          publisher: string;
        }) => {
          if (cleaned) return;
          if (event.channelName !== channelRef.current) return;

          if (event.eventType === 'REMOTE_JOIN') {
            onPresenceRef.current?.({
              action: 'JOIN',
              userId: event.publisher,
            });
          } else if (
            event.eventType === 'REMOTE_LEAVE' ||
            event.eventType === 'REMOTE_TIMEOUT'
          ) {
            onPresenceRef.current?.({
              action: 'LEAVE',
              userId: event.publisher,
            });
          }
        };

        client.addEventListener('message', handleMessage);
        client.addEventListener('status', handleStatus);
        client.addEventListener('presence', handlePresence);

        fallbackCleanup = () => {
          if (!client) return;
          client.removeEventListener('message', handleMessage);
          client.removeEventListener('status', handleStatus);
          client.removeEventListener('presence', handlePresence);

          client.unsubscribe(channel).catch(() => {});
          client.unsubscribe(userChannel).catch(() => {});
          client
            .logout()
            .catch(() => {})
            .finally(() => {
              if (clientRef.current === client) {
                clientRef.current = null;
                channelRef.current = null;
              }
              setConnectionState('DISCONNECTED');
            });
        };

        if (cleaned) {
          fallbackCleanup();
          return;
        }

        setConnectionState('CONNECTING');
        await client.login({ token });

        if (cleaned) {
          fallbackCleanup();
          return;
        }

        const subPromises = [
          client.subscribe(channel, {
            withMessage: true,
            withPresence: true,
          }),
          client.subscribe(userChannel, {
            withMessage: true,
            withPresence: false,
          }),
        ];

        await Promise.all(subPromises);

        if (cleaned) {
          fallbackCleanup();
          return;
        }

        setConnectionState('CONNECTED');
        setIsConnected(true);
      } catch (error) {
        if (!cleaned) {
          const _msg = error instanceof Error ? error.message : 'Unknown error';
          if (process.env.NODE_ENV !== 'production') {
          }
          toast.error('Failed to connect to signaling server');
          setConnectionState('DISCONNECTED');
          setIsConnected(false);
        }
      }
    })();

    return () => {
      cleaned = true;
      setConnectionState('DISCONNECTING');
      setIsConnected(false);
      fallbackCleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, appId, channel, userId]);

  return {
    /** Send a channel message to all watch party participants */
    sendMessage,
    /** Send a direct message to a specific participant (e.g. join approval) */
    sendMessageToPeer,
    /** Current RTM connection state */
    connectionState,
    /** Whether the RTM client is connected and ready to send/receive */
    isConnected,
  };
}
