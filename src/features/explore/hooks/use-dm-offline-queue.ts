'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useSocket } from '@/providers/socket-provider';

interface QueuedMessage {
  clientId: string;
  peerId: string;
  content: string;
  replyToId?: string;
  metadata?: {
    type: string;
    url: string;
    filename?: string;
    duration?: number;
  };
}

const STORAGE_KEY = 'dm:offline-queue';

function loadQueue(): QueuedMessage[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveQueue(q: QueuedMessage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(q));
}

/**
 * Queues DM messages when offline and flushes on reconnect.
 */
export function useDmOfflineQueue() {
  const { socket, isConnected } = useSocket();
  const flushing = useRef(false);

  const enqueue = useCallback(
    (msg: Omit<QueuedMessage, 'clientId'>) => {
      const clientId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const full: QueuedMessage = { ...msg, clientId };
      if (socket?.connected) {
        socket.emit('dm:send', full);
      } else {
        const q = loadQueue();
        q.push(full);
        saveQueue(q);
      }
      return clientId;
    },
    [socket],
  );

  // Flush queued messages on reconnect
  useEffect(() => {
    if (!isConnected || !socket || flushing.current) return;
    const q = loadQueue();
    if (!q.length) return;
    flushing.current = true;
    for (const msg of q) {
      socket.emit('dm:send', msg);
    }
    saveQueue([]);
    flushing.current = false;
  }, [isConnected, socket]);

  return { enqueue };
}
