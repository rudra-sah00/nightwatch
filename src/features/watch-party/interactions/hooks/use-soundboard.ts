import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  emitPartyInteraction,
  getTrendingSounds,
  onPartyInteraction,
  type SoundboardResponse,
  type SoundItem,
  searchSounds,
} from '../../room/services/watch-party.api';
import type { InteractionPayload } from '../../room/types';

export function useSoundboard() {
  const [sounds, setSounds] = useState<SoundItem[]>([]);
  const [loading, setLoading] = useState(false);
  const loadingRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const fetchSoundsData = useCallback(
    async (query: string, pageNum: number, append = false) => {
      if (loadingRef.current) return;
      try {
        loadingRef.current = true;
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
        loadingRef.current = false;
        setLoading(false);
        setIsSearching(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchSoundsData('', 1);
  }, [fetchSoundsData]);

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

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchSoundsData(searchQuery, nextPage, true);
  }, [loading, hasMore, page, fetchSoundsData, searchQuery]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [loadMore, hasMore, loading]);

  const playSoundEffect = useCallback((soundUrl: string) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    let finalUrl = soundUrl;
    if (typeof window !== 'undefined') {
      const guestToken = sessionStorage.getItem('guest_token');
      if (guestToken && soundUrl.startsWith('/api/')) {
        finalUrl = `${soundUrl}${soundUrl.includes('?') ? '&' : '?'}token=${guestToken}`;
      }
    }

    const audio = new Audio(finalUrl);
    currentAudioRef.current = audio;
    audio.play().catch((_err) => {});
    audio.onended = () => {
      if (currentAudioRef.current === audio) currentAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const cleanup = onPartyInteraction((data: InteractionPayload) => {
      if (data.type === 'sound') playSoundEffect(data.value);
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

  return {
    sounds,
    loading,
    searchQuery,
    setSearchQuery,
    hasMore,
    isSearching,
    loadMoreRef,
    loadMore,
    handleTriggerSound,
  };
}
