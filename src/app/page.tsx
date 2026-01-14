'use client';

import React, { useState, useCallback, useRef } from 'react';
import SearchBar from '@/components/SearchBar';
import MovieCard from '@/components/MovieCard';
import { searchContent, SearchResult } from '@/lib/api/media-api';

export default function Home() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    
    setIsAnimating(true);
    setLoading(true);
    setSearchQuery(query);
    
    // Small delay to allow animation to start
    await new Promise(resolve => setTimeout(resolve, 50));
    setSearched(true);
    
    try {
      const searchResults = await searchContent(query);
      setResults(searchResults);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, []);

  const handleClear = useCallback(() => {
    setIsAnimating(true);
    setResults([]);
    setSearchQuery('');
    
    // Animate back to center
    setTimeout(() => {
      setSearched(false);
      setTimeout(() => setIsAnimating(false), 300);
    }, 50);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Search Section - Animates between center and top */}
      <div 
        className={`
          w-full transition-all duration-500 ease-out
          ${searched 
            ? 'pt-6 pb-4 md:pt-8 md:pb-6' 
            : 'flex-1 flex items-center justify-center py-8 md:py-20'
          }
        `}
      >
        <div className={`
          w-full max-w-4xl mx-auto px-4 
          transition-all duration-500 ease-out
          ${isAnimating ? 'transform-gpu' : ''}
        `}>
          {/* Welcome Text - Fades and scales */}
          <div 
            className={`
              text-center overflow-hidden
              transition-all duration-400 ease-out
              ${searched 
                ? 'max-h-0 opacity-0 mb-0 scale-95' 
                : 'max-h-40 opacity-100 mb-8 md:mb-12 scale-100'
              }
            `}
          >
            <h1 className="text-3xl md:text-5xl font-light mb-3 md:mb-4 text-white">
              Welcome
            </h1>
            <p className="text-base md:text-lg text-zinc-400">
              Search for movies and TV shows
            </p>
          </div>
          
          {/* Search Bar */}
          <div className={`
            max-w-2xl mx-auto
            transition-all duration-500 ease-out
            ${searched ? 'max-w-xl' : ''}
          `}>
            <SearchBar onSearch={handleSearch} onClear={handleClear} />
          </div>
          
          {/* Clear Button */}
          <div 
            className={`
              mt-4 text-center overflow-hidden
              transition-all duration-300 ease-out
              ${searchQuery 
                ? 'max-h-10 opacity-100' 
                : 'max-h-0 opacity-0'
              }
            `}
          >
            <button 
              onClick={handleClear}
              className="text-zinc-500 hover:text-white transition-colors text-sm"
            >
              Clear search
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div 
        ref={resultsRef}
        className={`
          transition-all duration-500 ease-out
          ${searched ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none h-0 overflow-hidden'}
        `}
      >
        {/* Loading State */}
        {loading && (
          <div className="container mx-auto px-4 py-8 md:py-16">
            <div className="flex justify-center">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-zinc-700 border-t-white"></div>
                <span className="text-zinc-400 text-sm">Searching...</span>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {!loading && searched && (
          <div className="container mx-auto px-4 pb-8 md:pb-16">
            {results.length > 0 ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <p className="text-zinc-500 text-xs md:text-sm mb-4 md:mb-6">
                  {results.length} {results.length === 1 ? 'result' : 'results'} for "{searchQuery}"
                </p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 lg:gap-6">
                  {results.map((result, index) => (
                    <div 
                      key={result.id}
                      className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                      style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
                    >
                      <MovieCard
                        id={result.id}
                        title={result.title}
                        poster={result.poster}
                        year={result.year}
                        type={result.type}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 md:py-16 animate-in fade-in duration-300">
                <p className="text-zinc-500 text-sm">No results found for "{searchQuery}"</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
