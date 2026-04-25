'use client';

import { Scissors } from 'lucide-react';
import { ClipCard } from '@/features/clips/components/ClipCard';
import { useClips } from '@/features/clips/hooks/use-clips';

export function ClipsGrid() {
  const { clips, isLoading, remove, rename } = useClips();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {['cs1', 'cs2', 'cs3', 'cs4'].map((id) => (
          <div key={id} className="p-2">
            <div className="aspect-video border-[3px] border-border bg-muted animate-pulse mb-4" />
            <div className="px-2 space-y-2">
              <div className="h-6 bg-muted animate-pulse rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (clips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-card border-[4px] border-border text-center max-w-2xl mx-auto w-full">
        <Scissors className="w-20 h-20 text-neo-blue mb-6 stroke-[3px]" />
        <h3 className="text-4xl font-black font-headline uppercase tracking-tighter text-foreground mb-4">
          No clips yet
        </h3>
        <p className="font-headline font-bold uppercase tracking-widest text-foreground/70 max-w-sm px-6">
          Record moments from live streams to build your collection
        </p>
      </div>
    );
  }

  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
      style={{ contentVisibility: 'auto' }}
    >
      {clips.map((clip) => (
        <ClipCard
          key={clip.id}
          clip={clip}
          onDelete={remove}
          onRename={rename}
        />
      ))}
    </div>
  );
}
