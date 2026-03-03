'use client';

import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useServer } from '@/providers/server-provider';
import { streamAiResponse } from '../api';
import type { Message } from '../types';

interface RawRecommendation {
  id?: string | number;
  contentId?: string | number;
  type?: string;
  contentType?: string;
  title?: string;
  t?: string;
  subtitle?: string | number;
  poster?: string;
  posterUrl?: string;
  thumbnail?: string;
  image?: string;
  img?: string;
  imdbRating?: string | number;
  awards?: string | number;
  season?: number;
  episode?: number;
  videoUrl?: string;
  imdbId?: string;
}

export interface AiChatContextValue {
  state: {
    messages: Message[];
    isLoading: boolean;
    streamingMessageId: string | null;
    hasStarted: boolean;
    inputValue: string;
    isFullPage: boolean;
  };
  actions: {
    sendMessage: (e?: React.FormEvent, overrideMsg?: string) => Promise<void>;
    setInputValue: (value: string) => void;
    onClose: () => void;
    onSelectContent: (
      id: string,
      context?: Record<string, unknown>,
      autoPlay?: boolean,
    ) => void;
  };
  meta: {
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    currentUser: ReturnType<typeof useAuth>['user'];
    media: {
      url: string | null;
      type: 'video' | 'image' | null;
      isOpen: boolean;
      set: (
        url: string | null,
        type: 'video' | 'image' | null,
        open: boolean,
      ) => void;
    };
  };
  countdownAction: {
    type: 'play' | 'watch-party';
    payload: Record<string, unknown>;
  } | null;
  setCountdownAction: React.Dispatch<
    React.SetStateAction<{
      type: 'play' | 'watch-party';
      payload: Record<string, unknown>;
    } | null>
  >;
}

interface UseAiChatProviderOptions {
  isOpen: boolean;
  onClose: () => void;
  onSelectContent: (
    id: string,
    context?: Record<string, unknown>,
    autoPlay?: boolean,
  ) => void;
  className?: string;
}

export function useAiChatProvider({
  isOpen,
  onClose,
  onSelectContent,
  className,
}: UseAiChatProviderOptions): AiChatContextValue | null {
  const _router = useRouter();
  const { user: currentUser } = useAuth();
  const { activeServer } = useServer();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I'm your assistant. I can help you find movies, answer questions about what you're watching, or suggest something new. What's on your mind?",
      timestamp: new Date(),
    },
  ]);

  const [optimisticMessages, addOptimisticMessages] = React.useOptimistic(
    messages,
    (state, newMessages: Message | Message[]) => [
      ...state,
      ...(Array.isArray(newMessages) ? newMessages : [newMessages]),
    ],
  );

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isProcessing = useRef(false);

  const [media, setMedia] = useState<{
    url: string | null;
    type: 'video' | 'image' | null;
    isOpen: boolean;
  }>({ url: null, type: null, isOpen: false });

  const [countdownAction, setCountdownAction] = useState<{
    type: 'play' | 'watch-party';
    payload: Record<string, unknown>;
  } | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen && (hasStarted || streamingMessageId || messages.length > 1)) {
      scrollToBottom();
    }
  }, [isOpen, hasStarted, streamingMessageId, messages.length, scrollToBottom]);

  const handleSendMessage = async (
    e?: React.FormEvent,
    overrideMsg?: string,
  ) => {
    e?.preventDefault();
    const msgText = overrideMsg || inputValue.trim();
    if (!msgText || isLoading || streamingMessageId || isProcessing.current)
      return;

    isProcessing.current = true;

    if (!hasStarted) setHasStarted(true);
    setInputValue('');
    setIsLoading(true);
    isProcessing.current = true;

    const botMessageId = `bot-${Date.now()}`;
    setStreamingMessageId(botMessageId);

    React.startTransition(async () => {
      const newMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: msgText,
        timestamp: new Date(),
      };

      const assistantMessage: Message = {
        id: botMessageId,
        role: 'assistant',
        content: '',
        statusText: 'Neural Processing...',
        timestamp: new Date(),
      };

      addOptimisticMessages([newMessage, assistantMessage]);

      try {
        setMessages((prev) => [
          ...prev,
          newMessage,
          {
            id: botMessageId,
            role: 'assistant',
            content: '',
            statusText: 'Neural Processing...',
            timestamp: new Date(),
          },
        ]);
        const history = messages
          .slice(-6)
          .map(
            (m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`,
          );
        const response = await streamAiResponse(
          newMessage.content,
          history,
          activeServer,
        );
        if (!response.ok) throw new Error('Failed to start stream');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No reader found');

        let fullContent = '';
        let recommendations: Message['recommendations'] = [];
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

            const dataStr = trimmedLine.replace('data: ', '').trim();
            if (dataStr === '[DONE]') break;

            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'progress' && data.text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botMessageId ? { ...m, statusText: data.text } : m,
                  ),
                );
              }
              if (data.type === 'token' && data.text) {
                fullContent += data.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botMessageId
                      ? { ...m, content: fullContent, statusText: undefined }
                      : m,
                  ),
                );
              }
              if (
                data.type === 'update' &&
                data.data &&
                data.node === 'respond'
              ) {
                const content = data.data.response;
                const recMatch = content.match(
                  /__RECOMMENDED_START__([\s\S]*?)__RECOMMENDED_END__/,
                );
                if (recMatch) {
                  try {
                    const rawRecs = JSON.parse(recMatch[1]);
                    if (Array.isArray(rawRecs)) {
                      recommendations = (rawRecs as RawRecommendation[]).map(
                        (item) => ({
                          id: (item.id || item.contentId || '').toString(),
                          imdbId: item.imdbId,
                          type: item.type || item.contentType || 'Movie',
                          title: (item.title || item.t || 'Unknown').toString(),
                          subtitle: item.subtitle?.toString(),
                          poster: (
                            item.poster ||
                            item.posterUrl ||
                            item.thumbnail ||
                            item.image ||
                            item.img ||
                            ''
                          ).toString(),
                          imdbRating: item.imdbRating?.toString(),
                          awards: item.awards?.toString(),
                          season:
                            typeof item.season === 'number'
                              ? item.season
                              : undefined,
                          episode:
                            typeof item.episode === 'number'
                              ? item.episode
                              : undefined,
                          videoUrl: item.videoUrl?.toString(),
                        }),
                      );
                    }
                  } catch {}
                }

                const playMatch = content.match(/__PLAY:(.*?)__/);
                if (playMatch) {
                  try {
                    const playInfo = JSON.parse(playMatch[1]);
                    if (playInfo.id)
                      onSelectContent(playInfo.id, playInfo.context, true);
                  } catch {}
                }

                const wpMatch = content.match(/__WATCH_PARTY:(.*?)__/);
                if (wpMatch) {
                  try {
                    const wpInfo = JSON.parse(wpMatch[1]);
                    if (wpInfo.id) {
                      setCountdownAction({
                        type: 'watch-party',
                        payload: wpInfo,
                      });
                    }
                  } catch {}
                }

                const cleanContent = content
                  .replace(
                    /__RECOMMENDED_START__[\s\S]*?__RECOMMENDED_END__/,
                    '',
                  )
                  .replace(/__PLAY:.*?__/, '')
                  .replace(/__WATCH_PARTY:.*?__/, '')
                  .trim();

                fullContent = cleanContent;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botMessageId
                      ? { ...m, content: fullContent, recommendations }
                      : m,
                  ),
                );
              }
            } catch {}
          }
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMessageId && !m.content
              ? {
                  ...m,
                  content:
                    "Sorry, I'm having trouble connecting to my brain right now. 🧠💥",
                }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
        setStreamingMessageId(null);
        isProcessing.current = false;
      }
    });
  };

  if (!isOpen) return null;

  return {
    state: {
      messages: optimisticMessages,
      isLoading: isLoading || !!streamingMessageId,
      streamingMessageId,
      hasStarted,
      inputValue,
      isFullPage: !!className?.includes('relative'),
    },
    actions: {
      sendMessage: handleSendMessage,
      setInputValue,
      onClose,
      onSelectContent,
    },
    meta: {
      messagesEndRef,
      currentUser,
      media: {
        ...media,
        set: (url, type, isOpen) => setMedia({ url, type, isOpen }),
      },
    },
    countdownAction,
    setCountdownAction,
  };
}

export function useAiChatRouter() {
  return useRouter();
}
