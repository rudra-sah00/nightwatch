'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSearch?: (query: string) => void;  // Optional legacy callback
  onClear?: () => void;
  placeholder?: string;
  useUrlNavigation?: boolean;  // If true, navigates to /search/{query}
  initialQuery?: string;
}

export default function SearchBar({
  onSearch,
  onClear,
  placeholder = 'Search movies and TV shows...',
  useUrlNavigation = true,  // Default to URL navigation
  initialQuery = ''
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      if (useUrlNavigation) {
        // Navigate to /search/{query} URL
        router.push(`/search/${encodeURIComponent(query.trim())}`);
      } else if (onSearch) {
        // Legacy callback mode
        onSearch(query.trim());
      }
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setQuery('');
    onClear?.();
    inputRef.current?.focus();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && isFocused) {
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocused]);

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className={cn(
        "relative transition-all duration-300",
        isFocused && "scale-[1.01]"
      )}>
        <div className={cn(
          "relative flex items-center rounded-xl transition-all duration-300",
          "bg-zinc-900/80 backdrop-blur-md",
          "border border-zinc-800",
          isFocused && "border-zinc-600 bg-zinc-900 ring-2 ring-zinc-700/50 shadow-lg shadow-black/20"
        )}>
          {/* Search Icon */}
          <div className={cn(
            "absolute left-3 md:left-4 top-1/2 -translate-y-1/2 transition-colors duration-200",
            isFocused ? "text-white" : "text-zinc-500"
          )}>
            <Search className="w-4 h-4 md:w-5 md:h-5" />
          </div>

          {/* Input */}
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className={cn(
              "w-full py-3 md:py-4 pl-10 md:pl-12 pr-32 md:pr-40",
              "bg-transparent border-none",
              "text-white text-sm md:text-base",
              "placeholder-zinc-500",
              "focus-visible:ring-0 focus-visible:ring-offset-0"
            )}
          />

          {/* Right side controls */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {/* Keyboard shortcut hint */}
            {!query && !isFocused && (
              <div className="hidden md:flex items-center gap-1 px-2 py-1 bg-zinc-800/80 rounded-md border border-zinc-700/50">
                <Command className="w-3 h-3 text-zinc-500" />
                <span className="text-zinc-500 text-xs font-medium">K</span>
              </div>
            )}

            {/* Clear button */}
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </Button>
            )}

            {/* Search button */}
            <Button
              type="submit"
              disabled={!query.trim()}
              variant="default"
              size="sm"
              className={cn(
                "px-4 py-2 font-medium",
                "bg-white text-black hover:bg-zinc-200",
                "disabled:bg-zinc-800 disabled:text-zinc-600",
                "transition-all duration-200 active:scale-95"
              )}
            >
              Search
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
