'use client';

import React, { useMemo, useState } from 'react';
import SearchBar from '@/components/SearchBar';
import MovieCard from '@/components/MovieCard';
import { searchContent, SearchResult } from '@/lib/api/media-api';

export default function Home() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Time-based greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Good night';
  }, []);

  const handleSearch = async (query: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const searchResults = await searchContent(query);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Centered Welcome Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <div className="text-center mb-10">
          <h1 className="text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 bg-clip-text text-transparent tracking-tight">
            {greeting}
          </h1>
          <p className="mt-3 text-base md:text-lg text-gray-300">
            Find something great to watch.
          </p>
        </div>
        <div className="w-full max-w-3xl">
          <SearchBar onSearch={handleSearch} />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-amber-500"></div>
            <p className="mt-4 text-gray-300 text-lg">Searching...</p>
          </div>
        </div>
      )}

      {/* Search Results */}
      {!loading && searched && (
        <div className="container mx-auto px-4 py-8">
          {results.length > 0 ? (
            <>
              <h2 className="text-2xl font-bold mb-6 text-amber-500">Search Results ({results.length})</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {results.map((result) => (
                  <MovieCard
                    key={result.id}
                    id={result.id}
                    title={result.title}
                    poster={result.poster}
                    year={result.year}
                    type={result.type}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No results found. Try another search.</p>
            </div>
          )}
        </div>
      )}


    </div>
  );
}
