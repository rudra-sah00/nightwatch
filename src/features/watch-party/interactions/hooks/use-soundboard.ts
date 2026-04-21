import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { RTMMessage } from '../../media/hooks/useAgoraRtm';
import type {
  SoundboardResponse,
  SoundItem,
} from '../../room/services/watch-party.api';
import {
  getTrendingSounds,
  onPartyInteraction,
  searchSounds,
} from '../../room/services/watch-party.api';

interface UseSoundboardOptions {
  rtmSendMessage?: (msg: RTMMessage) => void;
  userId?: string;
  userName?: string;
}

export function useSoundboard({
  rtmSendMessage,
  userId,
  userName,
}: UseSoundboardOptions = {}) {
  const t = useTranslations('toasts');
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
        toast.error(t('soundsFailed'));
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setIsSearching(false);
      }
    },
    [t],
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

  useEffect(() => {
    if (!hasMore || loading || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchSoundsData(searchQuery, nextPage, true);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, page, searchQuery, fetchSoundsData]);

  const playSoundEffect = useCallback((soundUrl: string) => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    const audio = new Audio(soundUrl);
    currentAudioRef.current = audio;
    audio.volume = 0.5;
    audio.play().catch(() => {
      /* ignore play errors */
    });
  }, []);

  const handleTriggerSound = useCallback(
    (soundUrl: string, name: string) => {
      if (!rtmSendMessage || !userId) {
        toast.error(t('soundboardAuth'));
        return;
      }

      // 1. Play locally
      playSoundEffect(soundUrl);

      // 2. Broadcast via RTM
      rtmSendMessage({
        type: 'INTERACTION',
        kind: 'sound',
        sound: soundUrl,
        name: name,
        userId,
        userName:
          userName || (userId?.startsWith('guest') ? 'Guest' : 'Member'),
      });
    },
    [rtmSendMessage, userId, userName, playSoundEffect, t],
  );

  useEffect(() => {
    const cleanup = onPartyInteraction(
      (msg: { type?: string; kind?: string; sound?: string }) => {
        if (msg.type === 'INTERACTION' && msg.kind === 'sound' && msg.sound) {
          playSoundEffect(msg.sound);
        }
      },
    );
    return cleanup;
  }, [playSoundEffect]);

  return {
    sounds,
    loading,
    searchQuery,
    setSearchQuery,
    hasMore,
    isSearching,
    loadMoreRef,
    loadMore: () => {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchSoundsData(searchQuery, nextPage, true);
    },
    handleTriggerSound,
  };
}
