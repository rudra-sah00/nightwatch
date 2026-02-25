'use client';

import { Loader2, Play, Search, Volume2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  emitPartyInteraction,
  getTrendingSounds,
  onPartyInteraction,
  type SoundboardResponse,
  type SoundItem,
  searchSounds,
} from '../../api';

export function Soundboard() {
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSoundsData = useCallback(
    async (query: string, pageNum: number, append = false) => {
      if (loadingRef.current) {
        // Check loadingRef
        return;
      }
      try {
        loadingRef.current = true; // Set loadingRef to true
        setLoading(true);
        const data: SoundboardResponse = query
          ? await searchSounds(query, pageNum)
          : await getTrendingSounds(pageNum);

        setSounds((prev) =>
          append ? [...prev, ...data.results] : data.results,
        );
        setHasMore(!!data.next);
      } catch (_error) {
        toast.error('Failed to load sounds');
      } finally {
        loadingRef.current = false; // Set loadingRef to false
        setLoading(false);
        setIsSearching(false);
      }
    },
    [],
  );

  // Initial fetch
  useEffect(() => {
    fetchSoundsData('', 1);
  }, [fetchSoundsData]);

  // Search debounce
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (searchQuery.trim() === '') {
      fetchSoundsData('', 1);
      setPage(1);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      fetchSoundsData(searchQuery, 1);
      setPage(1);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, fetchSoundsData]);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSoundsData(searchQuery, nextPage, true);
  }, [loading, hasMore, page, fetchSoundsData, searchQuery]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, loading]);

  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const playSoundEffect = useCallback((soundUrl: string) => {
    // Stop previous sound if playing
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    let finalUrl = soundUrl;
    if (typeof window !== 'undefined') {
      const guestToken = sessionStorage.getItem('guest_token');
      // Append token to bypass auth middleware for browser-native media requests
      if (guestToken && soundUrl.startsWith('/api/')) {
        finalUrl = `${soundUrl}${soundUrl.includes('?') ? '&' : '?'}token=${guestToken}`;
      }
    }
    const audio = new Audio(finalUrl);
    currentAudioRef.current = audio;
    audio.play().catch((_err) => {});

    audio.onended = () => {
      if (currentAudioRef.current === audio) {
        currentAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const cleanup = onPartyInteraction((data) => {
      if (data.type === 'sound') {
        playSoundEffect(data.value);
      }
    });

    return () => {
      cleanup();
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }
    };
  }, [playSoundEffect]);

  const handleTriggerSound = (url: string, name: string) => {
    playSoundEffect(url);
    emitPartyInteraction({ type: 'sound', value: url });
    toast.success(`Played ${name}`, { duration: 1000 });
  };

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
              className="h-auto py-2.5 px-3 flex items-center gap-2 justify-start bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/20 transition-all active:scale-[0.98] group relative overflow-hidden"
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
