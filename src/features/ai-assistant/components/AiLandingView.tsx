'use client';

import { Send, Sparkles } from 'lucide-react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AiLandingViewProps {
  className?: string;
  inputValue: string;
  setInputValue: (val: string) => void;
  onSendMessage: (e?: React.FormEvent, overrideMsg?: string) => void;
  isLoading: boolean;
}

export function AiLandingView({
  className,
  inputValue,
  setInputValue,
  onSendMessage,
  isLoading,
}: AiLandingViewProps) {
  return (
    <div
      className={cn(
        'flex flex-col h-full w-full animate-in fade-in duration-500',
        className,
      )}
    >
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl flex flex-col items-center gap-8">
          {/* Logo / Icon */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/80 to-purple-600/80 flex items-center justify-center shadow-xl shadow-primary/20 mb-4">
            <Sparkles className="w-10 h-10 text-white" />
          </div>

          {/* Greeting */}
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center">
            How can I help you today?
          </h2>

          {/* Quick Prompts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {[
              { icon: '🎬', text: 'Suggest a sci-fi movie' },
              { icon: '🔥', text: "What's popular on Netflix?" },
              { icon: '📺', text: 'Find a comedy series' },
              { icon: '🍿', text: 'Surprise me!' },
            ].map((prompt, _idx) => (
              <button
                key={prompt.text}
                type="button"
                data-testid="prompt-card"
                onClick={() => onSendMessage(undefined, prompt.text)}
                className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border border-border/50 hover:bg-muted hover:border-border transition-all text-left group"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">
                  {prompt.icon}
                </span>
                <span className="text-sm text-zinc-300 group-hover:text-white font-medium">
                  {prompt.text}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed bottom input - always visible */}
      <div className="shrink-0">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="p-4 bg-background/80 backdrop-blur-md border-t border-border/50">
          <div className="w-full max-w-2xl mx-auto relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <form onSubmit={(e) => onSendMessage(e)} className="relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Message Watch Rudra AI..."
                className="w-full pl-6 pr-14 py-8 rounded-full bg-secondary border-border focus-visible:ring-primary/50 text-lg shadow-2xl"
                autoFocus
              />
              <Button
                type="submit"
                size="icon"
                data-testid="landing-send"
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
