'use client';

import { Loader2, Scissors } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { NeoSearchBar } from '@/components/ui/neo-search-bar';
import { type ClipFilters, toggleClipPublic } from '@/features/clips/api';
import { ClipCard } from '@/features/clips/components/ClipCard';
import { useClips } from '@/features/clips/hooks/use-clips';
import type { Clip } from '@/features/clips/types';
import { WS_EVENTS } from '@/lib/constants';
import { checkIsMobile } from '@/lib/electron-bridge';
import { mobileBridge } from '@/lib/mobile-bridge';
import { useSocket } from '@/providers/socket-provider';

export function ClipsGrid() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const router = useRouter();
  const { socket } = useSocket();
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const filters = useMemo<ClipFilters>(
    () => ({
      search: debouncedSearch || undefined,
    }),
    [debouncedSearch],
  );

  const { clips, isLoading, isLoadingMore, loadMore, refetch, remove, rename } =
    useClips(filters);

  useEffect(() => {
    if (!socket) return;
    const onClipReady = () => {
      refetch();
      toast.success('Clip is ready!');
    };
    socket.on(WS_EVENTS.CLIP_READY, onClipReady);
    return () => {
      socket.off(WS_EVENTS.CLIP_READY, onClipReady);
    };
  }, [socket, refetch]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const handlePlay = useCallback(
    (clip: Clip) => {
      if (clip.videoUrl) {
        router.push(
          `/clip/${clip.id}?src=${encodeURIComponent(clip.videoUrl)}&title=${encodeURIComponent(clip.title)}`,
        );
      }
    },
    [router],
  );

  const shareOrCopy = useCallback(async (url: string, title: string) => {
    if (checkIsMobile()) {
      await mobileBridge.share({ title, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, []);

  const handleShare = useCallback(
    async (clip: Clip) => {
      if (clip.isPublic && clip.shareId) {
        const url = `${window.location.origin}/clip/share/${clip.shareId}`;
        await shareOrCopy(url, clip.title);
        toast.success('Link copied!');
      } else {
        try {
          const result = await toggleClipPublic(clip.id);
          if (result.isPublic && result.shareId) {
            const url = `${window.location.origin}/clip/share/${result.shareId}`;
            await shareOrCopy(url, clip.title);
            toast.success('Clip shared! Link copied.');
            refetch();
          }
        } catch {
          toast.error('Failed to share clip');
        }
      }
    },
    [refetch, shareOrCopy],
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Filters — only show when not loading */}
      {!isLoading && (
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card border-[3px] border-border p-4 md:p-6 rounded-md">
          <NeoSearchBar
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clips..."
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {['cs1', 'cs2', 'cs3'].map((id) => (
            <div key={id} className="bg-card border-[3px] border-border p-2">
              <div className="aspect-video bg-muted animate-pulse mb-4 border-[3px] border-border" />
              <div className="px-2 pb-2 space-y-2">
                <div className="h-7 bg-muted animate-pulse w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && clips.length === 0 && (
        <div className="py-32 border-[4px] border-border border-dashed text-center flex flex-col items-center justify-center bg-card">
          <Scissors className="w-16 h-16 text-foreground/20 mb-6" />
          <p className="font-headline font-black text-4xl uppercase tracking-widest text-foreground/40">
            {debouncedSearch ? 'No clips found' : 'No clips yet'}
          </p>
          {!debouncedSearch && (
            <p className="font-headline font-bold uppercase tracking-widest text-foreground/20 text-sm mt-3 max-w-sm">
              Record moments from live streams to build your collection
            </p>
          )}
        </div>
      )}

      {/* Grid */}
      {!isLoading && clips.length > 0 && (
        <>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
            style={{ contentVisibility: 'auto' }}
          >
            {clips.map((clip) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                onDelete={remove}
                onRename={rename}
                onPlay={handlePlay}
                onShare={handleShare}
              />
            ))}
          </div>
          <div ref={loadMoreRef} className="h-1" />
          {isLoadingMore && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-foreground/30" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
