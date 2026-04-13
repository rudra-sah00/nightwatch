'use client';

import { Loader2, Play, Search, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { RTMMessage } from '../../media/hooks/useAgoraRtm';
import { useSoundboard } from '../hooks/use-soundboard';

export function SoundboardDisabled() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-foreground/50 space-y-4">
      <Volume2 className="w-12 h-12 opacity-50 stroke-[3px]" />
      <div className="space-y-1">
        <h3 className="text-foreground font-black font-headline uppercase tracking-widest">
          Soundboard Disabled
        </h3>
        <p className="text-sm font-bold font-headline tracking-wide">
          The host has disabled soundboard for guests.
        </p>
      </div>
    </div>
  );
}

interface SoundboardProps {
  rtmSendMessage?: (msg: RTMMessage) => void;
  userId?: string;
  userName?: string;
}

export function Soundboard({
  rtmSendMessage,
  userId,
  userName,
}: SoundboardProps) {
  const {
    sounds,
    loading,
    searchQuery,
    setSearchQuery,
    hasMore,
    isSearching,
    loadMoreRef,
    loadMore,
    handleTriggerSound,
  } = useSoundboard({ rtmSendMessage, userId, userName });

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden bg-background">
      <div className="space-y-3 flex-none mb-4">
        <h4 className="text-sm font-black text-foreground/60 font-headline uppercase tracking-widest flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 stroke-[3px]" aria-hidden="true" />{' '}
            Soundboard
          </div>
          {isSearching ? (
            <output className="flex items-center gap-2" aria-live="polite">
              <Loader2 className="w-3 h-3 animate-spin stroke-[3px]" />
              <span className="sr-only">Searching sounds...</span>
            </output>
          ) : null}
        </h4>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50 stroke-[3px]" />
          <Input
            placeholder="Search sounds..."
            className="pl-9 bg-background border-border border-[3px] h-10 text-sm font-bold font-headline tracking-wide focus-visible:ring-0 focus-visible:border-[var(--wp-send-btn,#0055ff)] text-foreground placeholder:text-foreground/50 rounded-none  transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 min-h-0 scrollbar-thin scrollbar-thumb-[#1a1a1a]/20">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 pb-4">
          {sounds.map((sound) => (
            <Button
              key={sound.slug}
              variant="neo-outline"
              size="sm"
              onClick={() => handleTriggerSound(sound.sound, sound.name)}
              className="h-auto py-2.5 px-3 flex items-center gap-2 justify-start bg-background text-foreground hover:bg-neo-yellow/80 border-border border-[3px] transition-colors group relative overflow-hidden rounded-none"
              aria-label={`Play ${sound.name} sound`}
            >
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 border-[2px] border-border"
                style={{ backgroundColor: `#${sound.color}` }}
                aria-hidden="true"
              />
              <span className="font-black font-headline tracking-widest uppercase text-[10px] truncate flex-1 text-left">
                {sound.name}
              </span>
              <Play
                className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 stroke-[3px]"
                aria-hidden="true"
              />
            </Button>
          ))}

          {loading ? (
            <div className="col-span-2 py-4 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-foreground stroke-[3px]" />
            </div>
          ) : null}

          <div
            ref={loadMoreRef}
            className="col-span-2 h-10 w-full flex items-center justify-center"
          >
            {!loading && hasMore ? (
              <Button
                variant="neo-ghost"
                size="sm"
                className="text-xs font-black font-headline uppercase tracking-widest text-foreground/60 hover:text-foreground hover:bg-transparent"
                onClick={loadMore}
              >
                Load more
              </Button>
            ) : null}
            {!loading && !hasMore && sounds.length > 0 ? (
              <span className="text-[10px] font-black font-headline text-foreground/30 uppercase tracking-widest">
                End of results
              </span>
            ) : null}
          </div>

          {!loading && sounds.length === 0 ? (
            <div className="col-span-2 py-10 text-center text-xs font-black font-headline tracking-widest uppercase text-foreground/50">
              No sounds found
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
