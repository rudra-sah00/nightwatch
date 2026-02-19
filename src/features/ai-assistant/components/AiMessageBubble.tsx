'use client';

import { CheckCircle2, Sparkles, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { env } from '@/lib/env';
import { cn } from '@/lib/utils';
import type { Message, User } from '../types';
import { AssistantMovieCard } from './AssistantMovieCard';

interface AiMessageBubbleProps {
  message: Message;
  currentUser: User | null;
  onSelectContent: (
    id: string,
    context?: Record<string, unknown>,
    autoPlay?: boolean,
  ) => void;
  onPlayMedia?: (url: string, type: 'video' | 'image') => void;
  isStreaming?: boolean;
}

export function AiMessageBubble({
  message,
  currentUser,
  onSelectContent,
  onPlayMedia,
  isStreaming,
}: AiMessageBubbleProps) {
  const isUser = message.role === 'user';
  const [displayedContent, setDisplayedContent] = React.useState(
    isUser ? message.content : '',
  );
  const [isTyping, setIsTyping] = React.useState(false);

  // Sync displayed content with message content slowly if assistant
  React.useEffect(() => {
    if (isUser) {
      setDisplayedContent(message.content);
      return;
    }

    // If not streaming anymore or this is an old message, just show it all
    if (!isStreaming && displayedContent.length === 0) {
      setDisplayedContent(message.content);
      return;
    }

    if (displayedContent.length < message.content.length) {
      setIsTyping(true);
      const gap = message.content.length - displayedContent.length;
      // If way behind, speed up slightly but keep it readable (min 15ms)
      // If close, keep it steady and natural (max 45ms)
      const speed = gap > 150 ? 15 : gap > 50 ? 25 : 45;

      const timeoutId = setTimeout(() => {
        setDisplayedContent(
          message.content.substring(0, displayedContent.length + 1),
        );
      }, speed);

      return () => clearTimeout(timeoutId);
    } else {
      setIsTyping(false);
    }
  }, [message.content, isUser, isStreaming, displayedContent.length]);

  return (
    <div
      className={cn(
        'flex gap-4 max-w-3xl mx-auto w-full',
        isUser ? 'justify-end' : 'justify-start',
      )}
    >
      {/* Avatar (Left for Assistant) */}
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/80 to-purple-600/80 flex items-center justify-center shrink-0 mt-1">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
      )}

      <div
        className={cn(
          'flex flex-col gap-2 max-w-[85%]',
          isUser ? 'items-end' : 'items-start',
        )}
      >
        {/* User Name */}
        <span className="text-xs text-white/40 font-medium px-1">
          {isUser ? 'You' : 'Watch Rudra AI'}
        </span>

        {/* Bubble */}
        <div
          className={cn(
            'p-4 rounded-2xl text-[15px] leading-relaxed break-words shadow-sm w-full',
            isUser
              ? 'bg-zinc-800 text-white rounded-tr-sm'
              : 'bg-transparent text-white/90 px-0 pt-0', // Transparent for AI to look clean
          )}
        >
          <div data-testid="ai-message-content" className="flex-1 min-w-0">
            {isStreaming && displayedContent.length === 0 ? (
              <div
                className="flex items-center gap-1.5 px-1 py-2"
                data-testid="ai-loading-dots"
              >
                <div
                  className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-pulse"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-pulse"
                  style={{ animationDelay: '200ms' }}
                />
                <div
                  className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-pulse"
                  style={{ animationDelay: '400ms' }}
                />
              </div>
            ) : (
              <ReactMarkdown
                components={{
                  a: ({ href, children }) => {
                    const isYoutube =
                      href?.includes('youtube.com') ||
                      href?.includes('youtu.be');
                    const isImdbVideo = href?.includes('imdb-video');

                    if (isYoutube || isImdbVideo) {
                      return (
                        <button
                          type="button"
                          onClick={() => onPlayMedia?.(href || '', 'video')}
                          className="inline-flex items-center gap-2 px-3 py-2 mt-2 bg-red-900/30 border border-red-500/30 rounded-lg text-red-200 hover:bg-red-900/50 transition-colors group cursor-pointer"
                        >
                          <span className="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-white border-b-[4px] border-b-transparent ml-0.5" />
                          </span>
                          <span className="font-medium text-sm">
                            {String(children).replace(/\[.*?\]/, '')}
                          </span>
                        </button>
                      );
                    }
                    return (
                      <a
                        href={href}
                        className="text-primary hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </a>
                    );
                  },
                  img: ({ src, alt }) => (
                    <button
                      type="button"
                      onClick={() => {
                        const srcString = typeof src === 'string' ? src : '';
                        onPlayMedia?.(srcString, 'image');
                      }}
                      className="relative group mt-4 mb-2 rounded-xl overflow-hidden border border-white/10 hover:border-primary/40 transition-all block w-full aspect-video sm:aspect-[21/9]"
                    >
                      <img
                        src={src}
                        alt={alt}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <span className="text-xs text-white/90 font-medium">
                          {alt || 'View full size'}
                        </span>
                      </div>
                    </button>
                  ),
                  p: ({ children }) => (
                    <div className="mb-2 last:mb-0">{children}</div>
                  ),
                  ul: ({ children }) => (
                    <ul className="space-y-1 mb-4">{children}</ul>
                  ),
                  li: ({ children }) => (
                    <li className="flex gap-2">
                      <span className="text-white/40 mt-1.5">•</span>
                      <span>{children}</span>
                    </li>
                  ),
                }}
              >
                {displayedContent}
              </ReactMarkdown>
            )}
          </div>

          {/* Render Recommendations - Separated by type */}
          {message.recommendations &&
            message.recommendations.length > 0 &&
            !isTyping && (
              <div className="mt-6 space-y-5 pb-1">
                {/* Movies & Series — full-width portrait cards */}
                {message.recommendations.filter(
                  (r) => r.type !== 'Photo' && r.type !== 'Trailer',
                ).length > 0 && (
                  <div className="space-y-3">
                    {message.recommendations
                      .filter((r) => r.type !== 'Photo' && r.type !== 'Trailer')
                      .map((req, ridx) => (
                        <AssistantMovieCard
                          key={`movie-${req.id}-${req.season}-${req.episode}-${ridx}`}
                          {...req}
                          variant="portrait"
                          videoUrl={(req as { videoUrl?: string }).videoUrl}
                          onSelect={(id, context, autoPlay) =>
                            onSelectContent(id, context, autoPlay)
                          }
                        />
                      ))}
                  </div>
                )}

                {/* Trailers — horizontal scroll */}
                {message.recommendations.filter((r) => r.type === 'Trailer')
                  .length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 px-1">
                      Trailers
                    </p>
                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar -mx-1 px-1">
                      {message.recommendations
                        .filter((r) => r.type === 'Trailer')
                        .map((req, ridx) => (
                          <AssistantMovieCard
                            key={`trailer-${req.id}-${ridx}`}
                            {...req}
                            variant="landscape"
                            className="min-w-[200px] max-w-[240px] shrink-0"
                            videoUrl={(req as { videoUrl?: string }).videoUrl}
                            onSelect={() => {
                              if (onPlayMedia) {
                                onPlayMedia(
                                  (req as { videoUrl?: string }).videoUrl || '',
                                  'video',
                                );
                              }
                            }}
                          />
                        ))}
                    </div>
                  </div>
                )}

                {/* Photos — horizontal scroll */}
                {message.recommendations.filter((r) => r.type === 'Photo')
                  .length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 px-1">
                      Photos
                    </p>
                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar -mx-1 px-1">
                      {message.recommendations
                        .filter((r) => r.type === 'Photo')
                        .map((req, ridx) => (
                          <AssistantMovieCard
                            key={`photo-${req.id}-${ridx}`}
                            {...req}
                            variant="landscape"
                            className="min-w-[200px] max-w-[240px] shrink-0"
                            onSelect={() => {
                              if (onPlayMedia) {
                                onPlayMedia(
                                  req.poster || req.posterUrl || '',
                                  'image',
                                );
                              }
                            }}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Action Success Indicator */}
          {!isUser &&
            message.content.includes('Added') &&
            message.content.includes('watchlist') && (
              <div className="mt-2 flex items-center gap-1.5 text-green-400 text-xs font-medium bg-green-900/10 px-2 py-1 rounded-md w-fit border border-green-500/20">
                <CheckCircle2 className="w-3 h-3" />
                <span>Action Completed successfully</span>
              </div>
            )}
        </div>
      </div>

      {/* Avatar (Right for User) */}
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center shrink-0 mt-1 overflow-hidden">
          {currentUser?.profilePhoto ? (
            <Image
              src={
                currentUser.profilePhoto.startsWith('http')
                  ? currentUser.profilePhoto
                  : `${env.BACKEND_URL}/${currentUser.profilePhoto}`
              }
              alt={currentUser.name}
              width={32}
              height={32}
              unoptimized
              className="w-full h-full object-cover"
            />
          ) : (
            <UserIcon className="w-4 h-4 text-white/70" />
          )}
        </div>
      )}
    </div>
  );
}
