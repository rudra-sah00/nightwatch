'use client';

import { Play, Square, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { PageTitle } from '@/components/layout/page-title';
import { useAskAi } from '@/features/ask-ai/hooks/use-ask-ai';
import type { AskAiMessage } from '@/features/ask-ai/types';

/**
 * Voice-to-voice AI assistant interface.
 *
 * An orb button toggles between idle, listening and speaking, above a
 * scrollback of the conversation. The transcript region is a live region so
 * screen reader users get the same information sighted users read — without it
 * a voice feature is silent to assistive tech.
 */
export function AskAiView() {
  const t = useTranslations('common');
  const {
    state,
    messages,
    liveUserText,
    liveAssistantText,
    error,
    start,
    stop,
    clearHistory,
  } = useAskAi();

  const isActive = state !== 'idle';
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Follow the conversation as it grows, unless the user has scrolled up to
  // read back — yanking them to the bottom mid-read is worse than not following.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const hasContent =
      messages.length > 0 || liveUserText !== '' || liveAssistantText !== '';
    if (!hasContent) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom < 120) {
      endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }
  }, [messages, liveUserText, liveAssistantText]);

  const statusLabel =
    state === 'listening'
      ? t('askAi.listening')
      : state === 'speaking'
        ? t('askAi.speaking')
        : t('askAi.tapToTalk');

  const hasConversation =
    messages.length > 0 || Boolean(liveUserText) || Boolean(liveAssistantText);

  return (
    <div className="flex-1 flex flex-col items-center gap-6 px-4 py-10 w-full">
      <PageTitle title={t('nav.askAi')} />

      {/* Orb button */}
      <div className="relative shrink-0">
        {state === 'listening' && (
          <>
            <div className="absolute inset-0 rounded-full bg-neo-yellow/20 animate-ping motion-reduce:animate-none" />
            <div className="absolute -inset-4 rounded-full border-2 border-neo-yellow/30 animate-pulse motion-reduce:animate-none" />
          </>
        )}
        {state === 'speaking' && (
          <div className="absolute -inset-3 rounded-full border-2 border-neo-blue/30 animate-pulse motion-reduce:animate-none" />
        )}
        <button
          type="button"
          onClick={isActive ? stop : start}
          className={`relative w-32 h-32 md:w-44 md:h-44 rounded-full border-[3px] flex items-center justify-center transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-neo-blue/50 ${
            state === 'listening'
              ? 'bg-neo-yellow/10 border-neo-yellow/40'
              : state === 'speaking'
                ? 'bg-neo-blue/10 border-neo-blue/40'
                : 'bg-primary/10 border-border hover:bg-primary/20'
          }`}
          aria-label={
            isActive
              ? t('askAi.stopConversation')
              : t('askAi.startConversation')
          }
        >
          {isActive ? (
            <Square className="w-9 h-9 md:w-12 md:h-12 text-red-400 fill-current" />
          ) : (
            <Play className="w-12 h-12 md:w-16 md:h-16 text-foreground/40 fill-current ml-2" />
          )}
        </button>
      </div>

      {/* Status — announced on change so state is not conveyed by colour alone */}
      <p
        role="status"
        aria-live="polite"
        className="font-headline font-black uppercase tracking-[0.2em] text-xs text-foreground/40 shrink-0"
      >
        {statusLabel}
      </p>

      {/* Conversation */}
      <div className="w-full max-w-2xl flex-1 min-h-0 flex flex-col">
        <div className="flex items-center justify-between mb-2 h-6 shrink-0">
          <h2 className="font-headline font-black uppercase tracking-widest text-[10px] text-foreground/30">
            {t('askAi.conversation')}
          </h2>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearHistory}
              className="flex items-center gap-1.5 text-[10px] font-bold font-headline uppercase tracking-widest text-foreground/40 hover:text-foreground transition-colors rounded-md px-2 py-1 hover:bg-muted"
            >
              <Trash2 aria-hidden="true" className="w-3 h-3" />
              {t('askAi.clearHistory')}
            </button>
          )}
        </div>

        <div
          ref={scrollRef}
          // role="log" tells assistive tech this is an append-only transcript,
          // so only new turns are announced rather than the whole region.
          role="log"
          aria-live="polite"
          aria-relevant="additions text"
          aria-label={t('askAi.conversation')}
          className="flex-1 min-h-[180px] max-h-[45vh] overflow-y-auto no-scrollbar space-y-4 pr-1"
        >
          {!hasConversation && (
            <p className="text-foreground/30 text-xs text-center py-8">
              {t('askAi.emptyConversation')}
            </p>
          )}

          {messages.map((message) => (
            <Turn
              key={message.id}
              message={message}
              youLabel={t('askAi.you')}
              aiLabel={t('askAi.ai')}
            />
          ))}

          {/* In-progress turns, replaced by history entries once finalised */}
          {liveUserText && (
            <Turn
              message={{ id: 'live-user', role: 'user', content: liveUserText }}
              youLabel={t('askAi.you')}
              aiLabel={t('askAi.ai')}
              pending
            />
          )}
          {liveAssistantText && (
            <Turn
              message={{
                id: 'live-assistant',
                role: 'assistant',
                content: liveAssistantText,
              }}
              youLabel={t('askAi.you')}
              aiLabel={t('askAi.ai')}
              pending
            />
          )}

          <div ref={endRef} />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="text-red-400 text-xs font-medium text-center max-w-md shrink-0"
        >
          {t(`askAi.errors.${error.code}`)}
        </p>
      )}
    </div>
  );
}

/** A single conversation turn. */
function Turn({
  message,
  youLabel,
  aiLabel,
  pending = false,
}: {
  message: AskAiMessage;
  youLabel: string;
  aiLabel: string;
  pending?: boolean;
}) {
  const isUser = message.role === 'user';
  return (
    <div className={isUser ? 'text-right' : 'text-left'}>
      <span
        className={`font-headline font-bold uppercase tracking-widest text-[10px] ${
          isUser ? 'text-foreground/30' : 'text-neo-blue'
        }`}
      >
        {isUser ? youLabel : aiLabel}
      </span>
      <p
        className={`text-sm mt-1 leading-relaxed ${
          isUser ? 'text-foreground/60' : 'text-foreground'
        } ${pending ? 'opacity-70' : ''}`}
      >
        {message.content}
      </p>
    </div>
  );
}
