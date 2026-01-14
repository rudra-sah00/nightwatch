'use client';

import React, { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function SearchBar({ onSearch, placeholder = 'Search movies and TV shows...' }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full px-6 py-5 pl-14 bg-zinc-900 border-2 border-zinc-800 rounded-full text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-300 text-lg hover:border-zinc-700"
        />
        <button
          type="submit"
          className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-amber-500 transition-colors duration-200"
        >
          <MagnifyingGlassIcon className="w-6 h-6" />
        </button>
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-amber-500 transition-colors duration-200 text-xl font-bold"
          >
            ×
          </button>
        )}
      </div>
    </form>
  );
}
