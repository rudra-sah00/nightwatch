'use client';

import { Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type React from 'react';
import { createContext, use } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlaybackCountdown } from '@/features/watch/components/PlaybackCountdown';
import { cn } from '@/lib/utils';
import { useAiChatProvider } from '../hooks/use-ai-chat-provider';
import styles from '../styles/AIAssistant.module.css';
import type { Message, User } from '../types';
import { AiLandingView } from './AiLandingView';
import { AiMessageBubble } from './AiMessageBubble';
import { MediaModal } from './MediaModal';

// --- Context & Types ---

interface AiChatState {
  messages: Message[];
  isLoading: boolean;
  streamingMessageId: string | null;
  hasStarted: boolean;
  inputValue: string;
  isFullPage: boolean;
}

interface AiChatActions {
  sendMessage: (e?: React.FormEvent, overrideMsg?: string) => Promise<void>;
  setInputValue: (value: string) => void;
  onClose: () => void;
  onSelectContent: (
    id: string,
    context?: Record<string, unknown>,
    autoPlay?: boolean,
  ) => void;
}

interface AiChatMeta {
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  currentUser: User | null;
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
}

interface AiChatContextValue {
  state: AiChatState;
  actions: AiChatActions;
  meta: AiChatMeta;
}

const AiChatContext = createContext<AiChatContextValue | null>(null);

function useAiChat() {
  const context = use(AiChatContext);
  if (!context) {
    throw new Error('AiChat components must be used within AiChat.Provider');
  }
  return context;
}

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

export function AiAssistantChat(props: AiAssistantChatProps) {
  return (
    <AiChatProvider {...props}>
      <AiChatContent className={props.className} />
    </AiChatProvider>
  );
}

// --- Provider Component ---

function AiChatProvider({
  children,
  isOpen,
  onClose,
  onSelectContent,
  className,
}: AiAssistantChatProps & { children: React.ReactNode }) {
  const router = useRouter();
  const contextValue = useAiChatProvider({
    isOpen,
    onClose,
    onSelectContent,
    className,
  });

  if (!contextValue) return null;

  const { countdownAction, setCountdownAction } = contextValue;

  return (
    <AiChatContext value={contextValue}>
      {children}
      {countdownAction ? (
        <PlaybackCountdown
          title={
            countdownAction.type === 'watch-party'
              ? 'Synchronizing Party'
              : 'Starting Solo Session'
          }
          subtitle={
            countdownAction.type === 'watch-party'
              ? 'Preparing your synchronized room...'
              : 'Get ready for cinematic excellence'
          }
          onComplete={() => {
            if (countdownAction.type === 'watch-party') {
              router.push(
                `/watch-party/${countdownAction.payload.id}?new=true`,
              );
              onClose();
            }
            setCountdownAction(null);
          }}
        />
      ) : null}
    </AiChatContext>
  );
}

// --- Internal Compound Components ---

function AiChatContent({ className }: { className?: string }) {
  const { state } = useAiChat();

  if (!state.hasStarted) {
    return <AiChatLanding className={className} />;
  }

  return (
    <div
      className={cn(
        'flex flex-col z-50 transition-[opacity,transform] duration-300 h-full',
        state.isLoading && 'pointer-events-none',
        !state.isFullPage && [
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[60vh]',
          'md:left-auto md:top-auto md:bottom-24 md:right-6 md:w-96 md:h-[600px] md:max-h-[80vh] md:translate-x-0 md:translate-y-0',
          'bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl',
        ],
        className,
      )}
    >
      <AiChatMedia />
      <AiChatMessageList />
      <AiChatInput />
    </div>
  );
}

function AiChatLanding({ className }: { className?: string }) {
  const { state, actions } = useAiChat();
  return (
    <AiLandingView
      className={className}
      inputValue={state.inputValue}
      setInputValue={actions.setInputValue}
      onSendMessage={actions.sendMessage}
      isLoading={state.isLoading}
    />
  );
}

function AiChatMedia() {
  const { meta } = useAiChat();
  return (
    <MediaModal
      url={meta.media.url}
      type={meta.media.type}
      isOpen={meta.media.isOpen}
      onClose={() => meta.media.set(null, null, false)}
    />
  );
}

function AiChatMessageList() {
  const { state, meta, actions } = useAiChat();
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-6 custom-scrollbar scroll-smooth">
      {state.messages.slice(1).map((msg) => (
        <AiMessageBubble
          key={msg.id}
          message={msg}
          currentUser={meta.currentUser}
          onSelectContent={actions.onSelectContent}
          isStreaming={msg.id === state.streamingMessageId}
          onPlayMedia={(url, type) => meta.media.set(url, type, true)}
        />
      ))}
      <div ref={meta.messagesEndRef} className="h-4" />
    </div>
  );
}

function AiChatInput() {
  const { state, actions } = useAiChat();
  const suggestions = [
    'Show me something darker...',
    'More like my recent watches',
    'Feeling like a comedy tonight',
    "What's trending in Sci-Fi?",
  ];

  return (
    <div className="shrink-0">
      {/* Dynamic Suggestion Pills - Only shown on landing */}
      {!state.hasStarted && (
        <div className="px-4 py-2 overflow-x-auto custom-scrollbar flex gap-2 no-scrollbar">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => actions.sendMessage(undefined, suggestion)}
              className={styles.suggestionPill}
              disabled={state.isLoading}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border/50">
        <div className="max-w-2xl mx-auto w-full relative group">
          <form onSubmit={(e) => actions.sendMessage(e)} className="relative">
            <Input
              value={state.inputValue}
              onChange={(e) => actions.setInputValue(e.target.value)}
              placeholder={
                state.isLoading
                  ? 'AI is thinking...'
                  : 'Message Watch Rudra AI...'
              }
              className="w-full pl-6 pr-14 py-8 rounded-full bg-zinc-900/50 backdrop-blur-xl border-white/5 focus-visible:ring-primary/50 text-lg shadow-2xl transition-[colors,shadow]"
              disabled={state.isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full transition-[colors,transform] duration-300',
                state.inputValue.trim()
                  ? 'bg-gradient-to-r from-primary via-purple-600 to-indigo-600 text-white shadow-md shadow-primary/20 hover:shadow-primary/40 hover:scale-105 active:scale-95'
                  : 'bg-white/5 text-white/20',
              )}
              disabled={!state.inputValue.trim() || state.isLoading}
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
          <div className="text-center mt-2 text-[10px] text-white/10 uppercase tracking-[0.2em] font-bold">
            WATCH RUDRA AI • ELITE EXPERIENCE
          </div>
        </div>
      </div>
    </div>
  );
}
