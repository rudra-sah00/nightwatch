'use client';

import { Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/fetch';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { streamAiResponse } from '../api';
import type { Message } from '../types';
import { AiLandingView } from './AiLandingView';
import { AiMessageBubble } from './AiMessageBubble';
import { MediaModal } from './MediaModal';

interface AiAssistantChatProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectContent: (
    id: string,
    context?: Record<string, unknown>,
    autoPlay?: boolean,
  ) => void;
  className?: string;
}

export function AiAssistantChat({
  isOpen,
  onClose,
  onSelectContent,
  className,
}: AiAssistantChatProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I'm your assistant. I can help you find movies, answer questions about what you're watching, or suggest something new. What's on your mind?",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [hasStarted, setHasStarted] = useState(false);

  // Media Modal State
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'image' | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Scroll on initial open
  useEffect(() => {
    if (isOpen && hasStarted) {
      scrollToBottom();
    }
  }, [isOpen, hasStarted, scrollToBottom]);

  // Scroll when new messages arrive (user sends or bot replies)
  useEffect(() => {
    if (hasStarted && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, hasStarted, scrollToBottom]);

  // Scroll during streaming as content grows
  useEffect(() => {
    if (streamingMessageId && hasStarted) {
      scrollToBottom();
    }
  }, [streamingMessageId, hasStarted, scrollToBottom]);

  const handleSendMessage = async (
    e?: React.FormEvent,
    overrideMsg?: string,
  ) => {
    e?.preventDefault();
    const msgText = overrideMsg || inputValue.trim();
    if (!msgText || isLoading) return;

    if (!hasStarted) setHasStarted(true);

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msgText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputValue('');
    setIsLoading(true);

    // Add a placeholder message for the assistant
    const botMessageId = (Date.now() + 1).toString();
    setStreamingMessageId(botMessageId);
    const initialBotMessage: Message = {
      id: botMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, initialBotMessage]);

    try {
      // Get last 6 messages for context (3 turns)
      const history = messages
        .slice(-6)
        .map(
          (m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`,
        );

      // Use feature API for streaming
      const response = await streamAiResponse(newMessage.content, history);

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

        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          const dataStr = trimmedLine.replace('data: ', '').trim();
          if (dataStr === '[DONE]') break;

          try {
            const data = JSON.parse(dataStr);

            // 1. Token Streaming (Text)
            if (data.type === 'token' && data.text) {
              fullContent += data.text;

              // Update the bot message in real-time
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === botMessageId ? { ...m, content: fullContent } : m,
                ),
              );
            }

            // 2. State Updates (Recommendations, Play Signals, etc.)
            if (data.type === 'update' && data.data) {
              const update = data.data;

              // Final response with signals from 'respond' node
              if (data.node === 'respond' && update.response) {
                const content = update.response;

                // Extract signals
                const recMatch = content.match(
                  /__RECOMMENDED_START__([\s\S]*?)__RECOMMENDED_END__/,
                );
                if (recMatch) {
                  try {
                    const rawRecs = JSON.parse(recMatch[1]);
                    if (Array.isArray(rawRecs)) {
                      recommendations = rawRecs.map(
                        (item: {
                          id?: string;
                          contentId?: string;
                          type?: string;
                          contentType?: string;
                          title?: string;
                          t?: string;
                          subtitle?: string;
                          poster?: string;
                          posterUrl?: string;
                          thumbnail?: string;
                          image?: string;
                          img?: string;
                          imdbRating?: string;
                          awards?: string;
                          season?: number;
                          episode?: number;
                          videoUrl?: string;
                          [key: string]: unknown;
                        }) => ({
                          id: item.id || item.contentId || '',
                          type: item.type || item.contentType || 'Movie',
                          title: item.title || item.t || 'Unknown',
                          subtitle: item.subtitle,
                          poster:
                            item.poster ||
                            item.posterUrl ||
                            item.thumbnail ||
                            item.image ||
                            item.img ||
                            '',
                          imdbRating: item.imdbRating,
                          awards: item.awards,
                          season: item.season,
                          episode: item.episode,
                          videoUrl: item.videoUrl,
                        }),
                      );
                    }
                  } catch (_e) {}
                }

                const playMatch = content.match(/__PLAY:(.*?)__/);
                if (playMatch) {
                  try {
                    const playInfo = JSON.parse(playMatch[1]);
                    if (playInfo.id)
                      onSelectContent(playInfo.id, playInfo.context, true);
                  } catch (_e) {}
                }

                const wpMatch = content.match(/__WATCH_PARTY:(.*?)__/);
                if (wpMatch) {
                  try {
                    const wpInfo = JSON.parse(wpMatch[1]);
                    if (wpInfo.id) {
                      router.push(`/watch-party/${wpInfo.id}?new=true`);
                      onClose();
                    }
                  } catch (_e) {}
                }

                // Clean up signals for final display
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
            }
          } catch (_e) {}
        }
      }
    } catch (_error) {
      // If we have no content yet, show error message in the bubble
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
    }
  };

  if (!isOpen) return null;

  const isFullPage = !!className?.includes('relative');

  // ------------------------------------------------------------------
  // RENDER: Landing View (Centered)
  // ------------------------------------------------------------------
  if (!hasStarted) {
    return (
      <AiLandingView
        className={className}
        inputValue={inputValue}
        setInputValue={setInputValue}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
      />
    );
  }

  // ------------------------------------------------------------------
  // RENDER: Chat View (Bottom Input)
  // ------------------------------------------------------------------
  return (
    <div
      className={cn(
        'flex flex-col z-50 transition-all duration-300 h-full',
        !isFullPage && [
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[60vh]',
          'md:left-auto md:top-auto md:bottom-24 md:right-6 md:w-96 md:h-[600px] md:max-h-[80vh] md:translate-x-0 md:translate-y-0',
          'bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl',
        ],
        className,
      )}
    >
      {/* Media Modal */}
      <MediaModal
        url={mediaUrl}
        type={mediaType}
        isOpen={isMediaModalOpen}
        onClose={() => {
          setIsMediaModalOpen(false);
          setMediaUrl(null);
          setMediaType(null);
        }}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6 custom-scrollbar scroll-smooth">
        {messages.slice(1).map((msg) => (
          <AiMessageBubble
            key={msg.id}
            message={msg}
            currentUser={currentUser}
            onSelectContent={onSelectContent}
            isStreaming={msg.id === streamingMessageId}
            onPlayMedia={(url, type) => {
              setMediaUrl(url);
              setMediaType(type);
              setIsMediaModalOpen(true);
            }}
          />
        ))}

        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Bottom Input Area - Always fixed at bottom */}
      <div className="shrink-0">
        {/* Top divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border/50">
          <div className="max-w-2xl mx-auto w-full relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <form onSubmit={(e) => handleSendMessage(e)} className="relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Message Watch Rudra AI..."
                className="w-full pl-6 pr-14 py-8 rounded-full bg-secondary border-border focus-visible:ring-primary/50 text-lg shadow-2xl"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                className={cn(
                  'absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full transition-all duration-200',
                  inputValue.trim()
                    ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:scale-105'
                    : 'bg-white/5 text-white/20',
                )}
                disabled={!inputValue.trim() || isLoading}
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
            <div className="text-center mt-2 text-[10px] text-white/30">
              Watch Rudra AI can make mistakes. Verify important information.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
