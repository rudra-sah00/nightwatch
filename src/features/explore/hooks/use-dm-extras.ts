'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { type GifResult, searchGifs } from '@/features/explore/api';
import { apiFetch } from '@/lib/fetch';

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  pinnedAt?: string | null;
}

/** Hook for DM search functionality */
export function useDmSearch(peerId: string | null) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!peerId || !query.trim()) {
      setResults([]);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const r = await apiFetch<{ messages: Message[] }>(
          `/api/messages/${peerId}/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) setResults(r.messages);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      }
      if (!controller.signal.aborted) setIsSearching(false);
    }, 400);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [peerId, query]);

  return { query, setQuery, results, isSearching };
}

/** Hook for pinned messages */
export function useDmPinned(peerId: string | null) {
  const [pinned, setPinned] = useState<Message[]>([]);

  const load = useCallback(async () => {
    if (!peerId) return;
    try {
      const r = await apiFetch<{ messages: Message[] }>(
        `/api/messages/${peerId}/pinned`,
      );
      setPinned(r.messages);
    } catch {
      setPinned([]);
    }
  }, [peerId]);

  useEffect(() => {
    load();
  }, [load]);

  const pin = useCallback(
    async (messageId: string) => {
      await apiFetch(`/api/messages/${messageId}/pin`, { method: 'POST' });
      load();
    },
    [load],
  );

  const unpin = useCallback(async (messageId: string) => {
    await apiFetch(`/api/messages/${messageId}/pin`, { method: 'DELETE' });
    setPinned((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  return { pinned, pin, unpin };
}

/** Hook for GIF picker in DM */
export function useDmGif() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GifResult[]>([]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(
      async () => {
        setResults(await searchGifs(query || undefined));
      },
      query ? 300 : 0,
    );
    return () => clearTimeout(t);
  }, [open, query]);

  const toggle = useCallback(() => {
    setOpen((v) => !v);
    setQuery('');
  }, []);

  return { open, toggle, query, setQuery, results };
}
