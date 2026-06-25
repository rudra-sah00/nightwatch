'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PostTag, TagType } from '@/features/explore/types';
import { apiFetch } from '@/lib/fetch';

interface SearchResult {
  id: string;
  title: string;
  image?: string;
}

/**
 * Hook for searching content to attach as tags.
 * Powers the slash command results (/music, /movie, /series, /game, /channel, /manga).
 * Each tag type queries its respective backend search API.
 */
export function useTagSearch(type: TagType | null, query: string) {
  const [results, setResults] = useState<PostTag[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const search = useCallback(async (tagType: TagType, q: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!q || q.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const items = await fetchByType(tagType, q, controller.signal);
      if (controller.signal.aborted) return;
      setResults(items.map((item) => ({ type: tagType, ...item })));
    } catch {
      if (!controller.signal.aborted) setResults([]);
    } finally {
      if (!controller.signal.aborted) setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!type || !query) {
      setResults([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(type, query), 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [type, query, search]);

  return { results, isSearching };
}

/** Routes each tag type to its search API */
async function fetchByType(
  type: TagType,
  query: string,
  signal: AbortSignal,
): Promise<SearchResult[]> {
  const q = encodeURIComponent(query);

  switch (type) {
    case 'movie':
    case 'series': {
      const { results } = await apiFetch<{
        results: { id: string; title: string; poster: string }[];
      }>(
        `/api/video/search?q=${q}&type=${type === 'movie' ? 'movie' : 'series'}`,
        { signal },
      );
      return results.map((r) => ({
        id: r.id,
        title: r.title,
        image: r.poster,
      }));
    }
    case 'music': {
      const { results } = await apiFetch<{
        results: {
          data: { id: string; name: string; image: { url: string }[] }[];
        };
      }>(`/api/music/search?q=${q}`, { signal });
      const songs = results?.data || [];
      return songs.slice(0, 10).map((s) => ({
        id: s.id,
        title: s.name,
        image: s.image?.[s.image.length - 1]?.url,
      }));
    }
    case 'game': {
      const { games } = await apiFetch<{
        games: { slug: string; title: string }[];
      }>('/api/games', { signal });
      return games
        .filter((g) => g.title.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 10)
        .map((g) => ({ id: g.slug, title: g.title }));
    }
    case 'channel': {
      const { channels } = await apiFetch<{
        channels: { id: string; name: string; icon: string }[];
      }>(`/api/livestream/iptv/search?q=${q}`, { signal });
      return (channels || [])
        .slice(0, 10)
        .map((c) => ({ id: c.id, title: c.name, image: c.icon }));
    }
    case 'manga': {
      const { results } = await apiFetch<{
        results: { id: number; title: string; portraitImageUrl: string }[];
      }>(`/api/manga/search?q=${q}`, { signal });
      return (results || []).slice(0, 10).map((m) => ({
        id: String(m.id),
        title: m.title,
        image: m.portraitImageUrl,
      }));
    }
    default:
      return [];
  }
}
