'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  clearSearchHistory,
  deleteSearchHistoryItem,
  getSearchHistory,
  getSearchSuggestions,
} from '@/features/search/api';
import type { SearchHistory } from '@/features/search/types';
import { useServer } from '@/providers/server-provider';

export function useSearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { activeServer } = useServer();
  const containerRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);

  // Sync query when URL changes (e.g., browser back/forward) — only when not typing
  const urlQuery = searchParams.get('q') || '';
  useEffect(() => {
    if (!isFocusedRef.current) {
      setQuery(urlQuery);
    }
  }, [urlQuery]);

  // DEBOUNCED SEARCH: Automatically update URL as user types
  useEffect(() => {
    const trimmedQuery = query.trim();
    const currentQ = searchParams.get('q') || '';

    if (trimmedQuery === currentQ) return;

    const timer = setTimeout(() => {
      startTransition(() => {
        if (trimmedQuery) {
          router.push(`/home?q=${encodeURIComponent(trimmedQuery)}`);
        } else if (currentQ) {
          router.push('/home');
        }
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [query, router, searchParams]);

  // DEBOUNCED SUGGESTIONS: Fetch suggestions as user types
  useEffect(() => {
    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    // Suggestions are only available on Server 2
    if (activeServer !== 's2') {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const results = await getSearchSuggestions(trimmedQuery, activeServer);
        setSuggestions(results.slice(0, 8));
      } catch {
        setSuggestions([]);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, activeServer]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, {
      passive: true,
    });
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getSearchHistory();
      setHistory(data);
    } catch {
      // Silently fail
    }
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
    setIsOpen(true);
    if (!query) loadHistory();
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteSearchHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch {
      toast.error('Failed to clear item');
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearSearchHistory();
      setHistory([]);
      toast.success('Search history cleared');
    } catch {
      toast.error('Failed to clear search history');
    }
  };

  const handleSelect = (text: string) => {
    setQuery(text);
    setIsOpen(false);
    setSuggestions([]);
    startTransition(() => {
      router.push(`/home?q=${encodeURIComponent(text)}`);
    });
  };

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsOpen(false);
      startTransition(() => {
        router.push(`/home?q=${encodeURIComponent(query)}`);
      });
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    startTransition(() => {
      router.push('/home');
    });
  };

  // Derived display state
  const showSuggestions = isOpen && query.trim().length >= 2;
  const showHistory = isOpen && !query && history.length > 0;
  const hasSuggestions = suggestions.length > 0;

  return {
    containerRef,
    query,
    setQuery,
    history,
    suggestions,
    isFetchingSuggestions,
    isPending,
    isOpen,
    showSuggestions,
    showHistory,
    hasSuggestions,
    handleFocus,
    handleBlur,
    handleDeleteItem,
    handleClearHistory,
    handleSelect,
    handleSearch,
    handleClear,
  };
}
