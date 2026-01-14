'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear?: () => void;
  placeholder?: string;
}

export default function SearchBar({ onSearch, onClear, placeholder = 'Search movies and TV shows...' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
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
      <div className={`relative transition-transform duration-200 ${isFocused ? 'scale-[1.01]' : ''}`}>
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            className="
              w-full py-3 md:py-4 pl-10 md:pl-12 pr-20 md:pr-28
              bg-zinc-900/80 backdrop-blur-sm
              border border-zinc-800 rounded-xl
              text-white text-sm md:text-base
              placeholder-zinc-500 
              focus:outline-none focus:border-zinc-600 focus:bg-zinc-900
              transition-all duration-200
            "
          />
          
          <div className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-zinc-500">
            <MagnifyingGlassIcon className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 md:p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            )}
            
            <button
              type="submit"
              disabled={!query.trim()}
              className="
                px-3 md:px-4 py-1.5 md:py-2
                bg-white hover:bg-zinc-200 
                disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed 
                text-zinc-900 text-sm
                rounded-lg font-medium 
                transition-all duration-200
                active:scale-95
              "
            >
              Search
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
