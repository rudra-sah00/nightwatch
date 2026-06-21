'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSearchSuggestions } from '../api';

/**
 * Cmd+K style search spotlight for the explore page.
 * Shows suggestions only — Enter navigates to /search page with query.
 */
export function ExploreSearchSpotlight({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['search', 'suggest', debouncedQuery],
    queryFn: () => getSearchSuggestions(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    if (searchBarRef.current) {
      searchBarRef.current.animate(
        [
          { transform: 'translateY(8px)', opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 },
        ],
        { duration: 250, easing: 'cubic-bezier(0.2, 0, 0, 1)', fill: 'both' },
      );
    }
    if (!window.Capacitor?.isNativePlatform?.()) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  const handleQuery = useCallback((val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setDebouncedQuery('');
      return;
    }
    debounceRef.current = setTimeout(() => setDebouncedQuery(val), 400);
  }, []);

  const navigateToSearch = useCallback(
    (q: string) => {
      if (!q.trim()) return;
      router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      close();
    },
    [router, close],
  );

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] backdrop-blur-sm transition-all duration-200 ${
        visible ? 'bg-black/40 opacity-100' : 'bg-black/0 opacity-0'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
      role="dialog"
      tabIndex={-1}
    >
      <div
        className={`w-full max-w-xl mx-4 max-h-[80vh] flex flex-col overflow-hidden transition-all duration-200 ${
          visible ? 'scale-100 opacity-100' : 'scale-100 opacity-0'
        }`}
      >
        {/* Input */}
        <div
          ref={searchBarRef}
          className="flex items-center bg-white/10 backdrop-blur-2xl rounded-full border border-white/20 shadow-2xl px-5 py-3.5 gap-3 shrink-0"
        >
          <Search className="w-5 h-5 text-white/40 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigateToSearch(query);
              if (e.key === 'Escape') close();
            }}
            placeholder="SEARCH MOVIES & SHOWS..."
            className="flex-1 bg-transparent text-lg text-white font-body outline-none placeholder:text-white/40"
            autoComplete="off"
          />
          {isLoading && (
            <Loader2 className="w-5 h-5 animate-spin text-white/50 shrink-0" />
          )}
          {query && !isLoading && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setDebouncedQuery('');
                inputRef.current?.focus();
              }}
              className="text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-2 bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden max-h-[55vh] overflow-y-auto p-3 min-h-0">
            <p className="text-white/30 font-headline font-bold uppercase tracking-widest text-[10px] px-2 mb-2">
              Suggestions
            </p>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => navigateToSearch(s)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                <Search className="w-4 h-4 text-white/30 shrink-0" />
                <span className="text-white text-sm font-medium truncate">
                  {s}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
