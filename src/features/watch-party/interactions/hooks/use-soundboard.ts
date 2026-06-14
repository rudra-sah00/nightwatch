import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
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

/** Options for {@link useSoundboard}. */
interface UseSoundboardOptions {
  rtmSendMessage?: (msg: RTMMessage) => void;
  userId?: string;
  userName?: string;
}

/**
 * Manages soundboard state: fetching trending/searched sounds, infinite
 * scroll pagination, local audio playback, and RTM broadcasting.
 *
 * @param options - RTM send function, user identity.
 * @returns Sound list, search state, loading flags, and trigger handler.
 */
export function useSoundboard({
  rtmSendMessage,
  userId,
  userName,
}: UseSoundboardOptions = {}) {
  const t = useTranslations('common.toasts');
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

  const mountedRef = useRef(false);

  useEffect(() => {
    fetchSoundsData('', 1);
    mountedRef.current = true;
  }, [fetchSoundsData]);

  useEffect(() => {
    if (!mountedRef.current) return;

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

  // Stable load-more callback ref to avoid recreating observer on state changes
  const loadMoreCallbackRef = useRef<(() => void) | undefined>(undefined);
  loadMoreCallbackRef.current = () => {
    if (hasMore && !loadingRef.current) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchSoundsData(searchQuery, nextPage, true);
    }
  };

  useEffect(() => {
    if (!loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreCallbackRef.current?.();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    // Auto-cleanup when sound finishes playing
    audio.onended = () => {
      if (currentAudioRef.current === audio) {
        currentAudioRef.current = null;
      }
    };
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      currentAudioRef.current?.pause();
      currentAudioRef.current = null;
    };
  }, []);

  const handleTriggerSound = useCallback(
    (soundUrl: string, name: string) => {
      if (!rtmSendMessage || !userId) {
        toast.error(t('soundboardAuth'));
        return;
      }

      // 1. Play locally
      playSoundEffect(soundUrl);
      trackEvent('party_soundboard', { name });

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

  // Track remote audio separately so we can cap concurrent playback
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const cleanup = onPartyInteraction(
      (msg: { type?: string; kind?: string; sound?: string }) => {
        if (msg.type === 'INTERACTION' && msg.kind === 'sound' && msg.sound) {
          // Stop previous remote sound to prevent audio buildup
          if (remoteAudioRef.current) {
            remoteAudioRef.current.pause();
            remoteAudioRef.current = null;
          }
          const audio = new Audio(msg.sound);
          remoteAudioRef.current = audio;
          audio.volume = 0.5;
          audio.play().catch(() => {});
          audio.onended = () => {
            if (remoteAudioRef.current === audio) {
              remoteAudioRef.current = null;
            }
          };
        }
      },
    );
    return cleanup;
  }, []);

  // Cleanup remote audio on unmount
  useEffect(() => {
    return () => {
      remoteAudioRef.current?.pause();
      remoteAudioRef.current = null;
    };
  }, []);

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
