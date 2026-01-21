'use client';

import { Clock, Search, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Input } from '@/components/ui';
import {
  clearSearchHistory,
  deleteSearchHistoryItem,
  getSearchHistory,
} from '@/features/search/api';
import type { SearchHistory } from '@/features/search/types';

export function SearchInput() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sync query with URL params
  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    setQuery(urlQuery);
  }, [searchParams]);

  // Load history when focused
  const loadHistory = async () => {
    try {
      // setIsLoading(true);
      const data = await getSearchHistory();
      setHistory(data);
    } catch {
    } finally {
      // setIsLoading(false);
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
    loadHistory();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteSearchHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch {
      toast.error('Failed to clear item');
    }
  };

  const handleSelect = (text: string) => {
    setQuery(text);
    setIsOpen(false);
    router.push(`/home?q=${encodeURIComponent(text)}`);
  };

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsOpen(false);
      router.push(`/home?q=${encodeURIComponent(query)}`);
    }
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    router.push('/home');
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for movies, shows..."
          className="pl-10 pr-10 bg-secondary/50 border-white/10 focus-visible:ring-primary/50 h-10 w-full"
          onFocus={handleFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleSearch}
        />
        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && history.length > 0 && !query && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="py-2">
            <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex justify-between items-center">
              <span>Recent Searches</span>
              <button
                type="button"
                onClick={() => {
                  clearSearchHistory();
                  setHistory([]);
                }}
                className="text-xs hover:text-white transition-colors"
              >
                Clear All
              </button>
            </div>

            <div className="max-h-[300px] overflow-y-auto">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="group flex items-center pr-2 hover:bg-white/5 transition-colors rounded-lg"
                >
                  <button
                    type="button"
                    className="flex-1 flex items-center gap-3 px-4 py-2 text-sm text-gray-300 group-hover:text-white truncate text-left bg-transparent border-none cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-l-lg"
                    onClick={() => handleSelect(item.query)}
                  >
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{item.query}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(e, item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-white/10 text-muted-foreground hover:text-destructive transition-all flex-shrink-0 focus:opacity-100 focus-visible:opacity-100"
                    aria-label="Remove from history"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
