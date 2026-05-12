'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { getSearchSuggestions } from '@/features/search/api';
import { useServer } from '@/providers/server-provider';

/**
 * Hook that manages the global search input, inline typeahead suggestions,
 * recent-search history (localStorage), and URL-driven navigation.
 *
 * Suggestions are fetched from the Server 2 API with a 200 ms debounce
 * and are disabled on the `/search` results page. The user must press
 * Enter or select a suggestion to trigger navigation; auto-search on
 * keystroke is intentionally disabled.
 *
 * @returns Refs, query state, suggestion data, keyboard/focus handlers,
 *          and derived display flags.
 */
export function useSearchInput() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(() => searchParams.get('q') || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { activeServer } = useServer();
  const containerRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);

  // Recent search history (persisted in localStorage)
  const HISTORY_KEY = 'wr_recent_searches';
  const MAX_HISTORY = 5;

  const getHistory = (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  };

  const saveToHistory = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const history = getHistory().filter((h) => h !== trimmed);
    history.unshift(trimmed);
    localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(history.slice(0, MAX_HISTORY)),
    );
  };

  // Suggestions are disabled on the search results page per user request
  const isSearchPage = pathname === '/search';

  // Sync query when URL changes (e.g., browser back/forward) — only when not typing
  const urlQuery = searchParams.get('q') || '';
  useEffect(() => {
    if (!isFocusedRef.current) {
      setQuery(urlQuery);
    }
  }, [urlQuery]);

  // Auto-search is disabled per user request. We only fetch suggestions.
  // The user must explicitly press Enter or select a suggestion to search.

  // SUGGESTIONS: Fetch top suggestion as user types
  useEffect(() => {
    // We fetch suggestions based on raw query to support trailing space hints
    // but we still want a minimum character count.
    if (!query || query.length < 2 || activeServer !== 's1' || isSearchPage) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const results = await getSearchSuggestions(query, activeServer);
        // Only keep the first suggestion for inline typeahead
        setSuggestions(results.slice(0, 1));
      } catch {
        setSuggestions([]);
      } finally {
        setIsFetchingSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, activeServer, isSearchPage]);

  const fetchSuggestions = async (searchTerm: string) => {
    if (
      !searchTerm ||
      searchTerm.length < 2 ||
      activeServer !== 's1' ||
      isSearchPage
    ) {
      setSuggestions([]);
      return;
    }

    setIsFetchingSuggestions(true);
    try {
      const results = await getSearchSuggestions(searchTerm, activeServer);
      setSuggestions(results.slice(0, 1));
    } catch {
      setSuggestions([]);
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

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

  const handleFocus = () => {
    isFocusedRef.current = true;
    setIsOpen(true);
    if (!isSearchPage) {
      fetchSuggestions(query);
    }
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    // Keep suggestions open briefly for click handling if needed
    // or close immediately if preferred. User said "when user tab click then"
    // so we keep isOpen true until click outside handles it.
  };

  const handleSelect = (text: string) => {
    setQuery(text);
    saveToHistory(text);
    setIsOpen(false);
    setSuggestions([]);
    startTransition(() => {
      router.push(`/search?q=${encodeURIComponent(text)}`);
    });
  };

  const handleManualSearch = () => {
    if (query.trim()) {
      saveToHistory(query.trim());
      setIsOpen(false);
      startTransition(() => {
        router.push(`/search?q=${encodeURIComponent(query)}`);
      });
    }
  };

  const completeSuggestion = () => {
    if (suggestions[0] && !isSearchPage) {
      setQuery(suggestions[0]);
    }
  };

  const handleSearch = (e: React.KeyboardEvent) => {
    if (
      e.key === 'Tab' &&
      suggestions[0] &&
      suggestions[0].toLowerCase().startsWith(query.toLowerCase()) &&
      !isSearchPage
    ) {
      e.preventDefault();
      completeSuggestion();
    }
    if (e.key === 'Enter') {
      handleManualSearch();
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
  const hasSuggestions = suggestions.length > 0 && !isSearchPage;
  const showSuggestions = isOpen && hasSuggestions;

  return {
    containerRef,
    query,
    setQuery,
    suggestions,
    isFetchingSuggestions,
    isPending,
    isOpen,
    showSuggestions,
    hasSuggestions,
    recentSearches: !query && isOpen && !isSearchPage ? getHistory() : [],
    handleFocus,
    handleBlur,
    suggestion: (!isSearchPage && suggestions[0]) || '',
    handleSelect,
    handleSearch,
    handleManualSearch,
    handleClear,
    completeSuggestion,
  };
}
