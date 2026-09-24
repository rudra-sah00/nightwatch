'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import {
  getPartyMessages,
  sendPartyMessage,
} from '../../room/services/watch-party.api';
import type { ChatMessage, WatchPartyRoom } from '../../room/types';
import type { RTMMessage } from '../../room/types/rtm-messages';

/**
 * One `Audio` for the whole tab, reused.
 *
 * A busy room with the chat panel closed used to construct a fresh `Audio` per
 * message, each one fetching and decoding the same file. Rewinding a single
 * element is both cheaper and what browsers expect for a notification sound.
 *
 * Lazily created because this module is imported during SSR, where `Audio` does
 * not exist.
 */
let chime: HTMLAudioElement | null = null;

function playChatChime() {
  if (typeof window === 'undefined') return;
  try {
    if (!chime) chime = new Audio('/msg-received.mp3');
    chime.currentTime = 0;
    void chime.play().catch(() => {});
  } catch {
    // Autoplay policy, or no audio device. A missing chime is not worth a throw.
  }
}

/**
 * Configuration options for the {@link useWatchPartyChat} hook.
 */
interface UseWatchPartyChatOptions {
  /** The current watch party room, if available. */
  room?: WatchPartyRoom | null;
  /** Function to broadcast an RTM message to all room participants. */
  rtmSendMessage?: (msg: RTMMessage) => void;
  /** The current user's unique identifier. */
  userId?: string;
  /** The current user's display name. */
  currentUserName?: string;
}

/**
 * Hook managing the full chat lifecycle for a watch party room.
 *
 * Provides optimistic message sending with backend persistence and RTM broadcast,
 * typing indicator signalling, and incoming RTM message handling (chat messages,
 * typing start/stop events) with duplicate detection and notification sounds.
 *
 * @param options - Chat configuration including room, user info, and RTM sender.
 * @returns Chat state (messages, typing users) and handlers for sending, typing, and incoming RTM messages.
 */
export function useWatchPartyChat({
  room,
  rtmSendMessage,
  userId,
  currentUserName,
}: UseWatchPartyChatOptions = {}) {
  const t = useTranslations('common.toasts');
  const MAX_CHAT_MESSAGES = 200;
  const [messages, _setMessages] = useState<ChatMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false);
  /*
    How many messages the list may hold, which GROWS as history is loaded.

    The cap exists to stop a long party accumulating thousands of DOM nodes, and it
    trims from the front — the oldest. That is right for the live tail and exactly
    wrong for scrollback: loading 40 older messages and then receiving one new line
    ran the trim and threw all 40 away again, so the user's history vanished the
    moment anybody spoke. Raising the ceiling by what was prepended keeps both
    properties: the live tail is still bounded, and read history is not silently
    discarded underneath the person reading it.
  */
  const capRef = useRef(MAX_CHAT_MESSAGES);
  const setMessages = useCallback(
    (update: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      _setMessages((prev) => {
        const next = typeof update === 'function' ? update(prev) : update;
        return next.length > capRef.current
          ? next.slice(next.length - capRef.current)
          : next;
      });
    },
    [],
  );
  const [typingUsers, setTypingUsers] = useState<
    Array<{ userId: string; userName: string }>
  >([]);
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const lastSendTimeRef = useRef<number>(0);
  const SEND_RATE_LIMIT_MS = 300;

  // Cleanup typing timeouts on unmount
  useEffect(() => {
    return () => {
      for (const t of typingTimeoutsRef.current.values()) clearTimeout(t);
    };
  }, []);

  /*
    What is currently rendered, for code that needs to READ the list.

    `loadMoreMessages` used to read it by calling the setter with an updater that
    captured `prev.length` and returned `prev` unchanged. That does not work: React
    runs an updater when it processes the queue, not at the moment it is called, so
    the value was read after the request had already been sent — normally still 0.
    The cursor was therefore almost always "from the newest message", and load-more
    fetched the page the client already had, every time.

    Synced from an effect rather than written inside the updater, because an updater
    must stay a pure function of its argument. By the time a user can click
    load-more the effect has long since run.
  */
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /*
    ---- load older messages ----

    Paged on the OLDEST message we hold (`beforeId`), not on how many messages are
    in the list. The count was wrong in two further ways even once read correctly,
    because the backend reads `before` as an offset from the END of an append-only
    Redis list:

     - Any message that arrived while the request was in flight appended to that
       list and shifted the whole window, so the page overlapped what we already
       had. The dedup filter hid the overlap and the page silently came back short.
     - The list is capped, so past the cap `messages.length` stopped growing while
       the true offset kept growing. The offset then pointed at a window we already
       held, every page was fully deduplicated away, and load-more appeared to do
       nothing at all for the rest of the party.

    A message id is stable under appends and independent of what this client has
    trimmed, so none of the three failures is reachable. `before` is still sent as a
    fallback for a backend that predates `beforeId`.
  */
  const loadMoreMessages = useCallback(async () => {
    if (!room?.id || isLoadingMoreRef.current || !hasMoreMessages) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const held = messagesRef.current;
      const oldest = held[0];
      // A `temp-` id is an unconfirmed local message and exists on no server, so
      // it can never be a cursor. It is also always at the tail, never the head.
      const oldestId =
        oldest && !oldest.id.startsWith('temp-') ? oldest.id : undefined;

      const response = await getPartyMessages(room.id, {
        limit: 40,
        before: held.length,
        beforeId: oldestId,
      });
      if (response.messages) {
        if (response.messages.length === 0) {
          setHasMoreMessages(false);
        } else {
          _setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = response.messages!.filter(
              (m) => !existingIds.has(m.id),
            );
            // Nothing new means we are at the start of the backlog, whatever the
            // page length said.
            if (newMsgs.length === 0) {
              setHasMoreMessages(false);
              return prev;
            }
            // Read history must survive the live-tail trim — see `capRef`.
            capRef.current += newMsgs.length;
            return [...newMsgs, ...prev];
          });
        }
      }
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [room?.id, hasMoreMessages]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!room?.id || !userId || !currentUserName) return;

      const now = Date.now();
      if (now - lastSendTimeRef.current < SEND_RATE_LIMIT_MS) return;
      lastSendTimeRef.current = now;

      // Optimistically add to UI
      // One id, used for both fields. Two `Date.now()` calls could disagree, and
      // `clientId` is the React key — a key that changes when the server id lands
      // remounts the row instead of updating it.
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg: ChatMessage = {
        id: tempId,
        clientId: tempId,
        roomId: room.id,
        userId: userId,
        userName: currentUserName,
        content,
        isSystem: false,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, optimisticMsg]);

      // Broadcast via RTM
      rtmSendMessage?.({
        type: 'CHAT',
        messageId: optimisticMsg.id,
        userId: userId,
        userName: currentUserName,
        content,
        isSystem: false,
        timestamp: optimisticMsg.timestamp,
      });
      trackEvent('party_chat_send', { roomId: room.id });

      // Persist to backend
      const response = await sendPartyMessage(room.id, content);
      if (response.message) {
        // Swap temp ID with real DB ID
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMsg.id
              ? { ...response.message!, clientId: optimisticMsg.id }
              : m,
          ),
        );
      } else {
        /*
          Keyed on the absence of a persisted message rather than on
          `response.error`, because those are not the same condition: a 2xx whose
          body lacked `message` — no error string either — left the optimistic copy
          in the list under its `temp-` id forever, neither confirmed nor rolled
          back. The one invariant worth branching on is whether the server stored
          anything.

          The server's own words are preferred over the generic fallback, as the
          approve/reject/kick paths already do. Now that `canChat` is enforced
          server-side, the likeliest failure here is a host-imposed mute ("Chat is
          disabled for you in this room") rather than a network fault — and this
          path only opens at all when the host mutes someone mid-keystroke, since
          `WatchPartySidebar` otherwise hides the composer. Reporting that as
          "message failed" told the member to retry something that will never work.
        */
        toast.error(response.error || t('messageFailed'));
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      }
    },
    [room?.id, userId, currentUserName, rtmSendMessage, t, setMessages],
  );

  const handleTypingStart = useCallback(() => {
    if (!userId || !currentUserName) return;
    rtmSendMessage?.({
      type: 'TYPING_START',
      userId: userId,
      userName: currentUserName,
    });
  }, [userId, currentUserName, rtmSendMessage]);

  const handleTypingStop = useCallback(() => {
    if (!userId) return;
    rtmSendMessage?.({
      type: 'TYPING_STOP',
      userId: userId,
    });
  }, [userId, rtmSendMessage]);

  const handleIncomingRtmMessage = useCallback(
    (msg: RTMMessage) => {
      switch (msg.type) {
        case 'CHAT': {
          /*
            Whether to chime, decided BEFORE the state update rather than inside it.

            This used to query the DOM and construct an `Audio` from within the
            `setMessages` updater. An updater must be a pure function of its
            argument — React may call it more than once — so a side effect in there
            can play the sound twice, and a DOM read in there is a layout read at
            whatever moment React happens to schedule the update.
          */
          const fromSomeoneElse = msg.userId !== userId;
          const chatVisible =
            !!document.getElementById('wp-floating-chat') ||
            document
              .getElementById('wp-sidebar-chat-container')
              ?.getAttribute('data-active') === 'true';

          let appended = false;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.messageId)) return prev;
            appended = true;
            return [
              ...prev,
              {
                id: msg.messageId,
                roomId: room?.id || '',
                userId: msg.userId,
                userName: msg.userName,
                content: msg.content,
                isSystem: msg.isSystem,
                timestamp: msg.timestamp,
              },
            ];
          });

          if (appended && fromSomeoneElse && !chatVisible) playChatChime();
          break;
        }

        case 'TYPING_START': {
          setTypingUsers((prev) => {
            if (prev.some((u) => u.userId === msg.userId)) return prev;
            return [...prev, { userId: msg.userId, userName: msg.userName }];
          });
          // Clear existing timeout for this user and set a new one
          const existing = typingTimeoutsRef.current.get(msg.userId);
          if (existing) clearTimeout(existing);
          typingTimeoutsRef.current.set(
            msg.userId,
            setTimeout(() => {
              setTypingUsers((prev) =>
                prev.filter((u) => u.userId !== msg.userId),
              );
              typingTimeoutsRef.current.delete(msg.userId);
            }, 5000),
          );
          break;
        }

        case 'TYPING_STOP': {
          setTypingUsers((prev) => prev.filter((u) => u.userId !== msg.userId));
          break;
        }
      }
    },
    [room?.id, userId, setMessages],
  );

  return {
    messages,
    setMessages,
    typingUsers,
    sendMessage,
    handleTypingStart,
    handleTypingStop,
    handleIncomingRtmMessage,
    loadMoreMessages,
    hasMoreMessages,
    isLoadingMore,
  };
}
