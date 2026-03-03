'use client';

import { Loader2, Play, Search, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSoundboard } from '../hooks/use-soundboard';

export function SoundboardDisabled() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white/50 space-y-4">
      <Volume2 className="w-12 h-12 opacity-50" />
      <div className="space-y-1">
        <h3 className="text-white font-medium">Soundboard Disabled</h3>
        <p className="text-sm">The host has disabled soundboard for guests.</p>
      </div>
    </div>
  );
}

export function Soundboard() {
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
  } = useSoundboard();

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      <div className="space-y-3 flex-none mb-4">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" aria-hidden="true" /> Soundboard
          </div>
          {isSearching ? (
            <output className="flex items-center gap-2" aria-live="polite">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="sr-only">Searching sounds...</span>
            </output>
          ) : null}
        </h4>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search sounds..."
            className="pl-9 bg-white/5 border-white/10 h-9 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 min-h-0 scrollbar-thin scrollbar-thumb-white/10">
        <div className="grid grid-cols-2 gap-2 pb-4">
          {sounds.map((sound, index) => (
            <Button
              key={`${sound.slug}-${index}`}
              variant="outline"
              size="sm"
              onClick={() => handleTriggerSound(sound.sound, sound.name)}
              className="h-auto py-2.5 px-3 flex items-center gap-2 justify-start bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20 transition-colors active:scale-[0.98] group relative overflow-hidden"
              aria-label={`Play ${sound.name} sound`}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: `#${sound.color}` }}
                aria-hidden="true"
              />
              <span className="font-medium text-xs truncate flex-1 text-left">
                {sound.name}
              </span>
              <Play
                className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2"
                aria-hidden="true"
              />
            </Button>
          ))}

          {loading ? (
            <div className="col-span-2 py-4 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : null}

          <div
            ref={loadMoreRef}
            className="col-span-2 h-10 w-full flex items-center justify-center"
          >
            {!loading && hasMore ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-white"
                onClick={loadMore}
              >
                Load more
              </Button>
            ) : null}
            {!loading && !hasMore && sounds.length > 0 ? (
              <span className="text-[10px] text-white/20 uppercase tracking-widest">
                End of results
              </span>
            ) : null}
          </div>

          {!loading && sounds.length === 0 ? (
            <div className="col-span-2 py-10 text-center text-sm text-muted-foreground">
              No sounds found
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
