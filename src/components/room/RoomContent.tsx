'use client';

import { useState } from 'react';
import SearchBar from '@/components/search/SearchBar';
import { SearchResult, search } from '@/lib/api';
import { Skeleton } from '@/components/ui';

interface RoomContentProps {
    showSearch: boolean;
    canControlPlayback: boolean;
    hasVideo: boolean;
    isPlaying: boolean;
    onSearch: (query: string) => void;
    onClearSearch: () => void;
    onShowSearch: () => void;
}

export function RoomContent({
    showSearch,
    canControlPlayback,
    hasVideo,
    isPlaying,
    onSearch,
    onClearSearch,
    onShowSearch,
}: RoomContentProps) {
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = async (query: string) => {
        if (!query.trim()) return;

        setIsSearching(true);
        setHasSearched(true);
        setSearchQuery(query);
        onSearch(query);

        try {
            const response = await search(query);
            setSearchResults(response.data?.results || []);
        } catch {
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleClear = () => {
        setSearchResults([]);
        setSearchQuery('');
        setHasSearched(false);
        onClearSearch();
    };

    return (
        <div className="flex-1 flex flex-col bg-black overflow-hidden">
            {/* Search Section with smooth animation */}
            {showSearch && canControlPlayback && (
                <div className={`transition-all duration-500 ease-out ${hasSearched ? 'pt-4 pb-2' : 'py-8'}`}>
                    <div className="max-w-2xl mx-auto px-6">
                        {/* Only show helper text before searching */}
                        <p className={`text-center text-zinc-400 mb-4 transition-all duration-300 ${hasSearched ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                            Search for movies and TV shows
                        </p>
                        <SearchBar onSearch={handleSearch} onClear={handleClear} />
                    </div>
                </div>
            )}

            {/* Search Results */}
            {showSearch && canControlPlayback && hasSearched && (
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-lg font-semibold text-white mb-4">
                            {isSearching ? 'Searching...' : `Results for "${searchQuery}"`}
                        </h2>

                        {isSearching ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {[...Array(10)].map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <Skeleton className="aspect-[2/3] rounded-lg" />
                                        <Skeleton className="h-4 w-3/4" />
                                    </div>
                                ))}
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {searchResults.map((result) => (
                                    <button
                                        key={result.id}
                                        className="group text-left bg-zinc-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-red-500 transition-all"
                                    >
                                        <div className="aspect-[2/3] bg-zinc-800 relative">
                                            {result.poster && (
                                                <img
                                                    src={result.poster}
                                                    alt={result.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-red-600 rounded text-[10px] font-medium text-white">
                                                {result.type}
                                            </div>
                                        </div>
                                        <div className="p-2">
                                            <p className="text-white text-sm font-medium truncate group-hover:text-red-400 transition-colors">
                                                {result.title}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-zinc-400">No results found for "{searchQuery}"</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Video Player or Waiting Area */}
            {!showSearch && (
                <div className="flex-1 flex items-center justify-center">
                    {!hasVideo && !canControlPlayback && (
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 mx-auto bg-zinc-900 rounded-full flex items-center justify-center">
                                <svg className="w-10 h-10 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xl text-white mb-2">Waiting for host</p>
                                <p className="text-zinc-500">The host will select a video to watch</p>
                            </div>
                        </div>
                    )}
                    {!hasVideo && canControlPlayback && (
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 mx-auto bg-zinc-900 rounded-full flex items-center justify-center">
                                <svg className="w-10 h-10 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xl text-white mb-2">No video selected</p>
                                <p className="text-zinc-500 mb-4">Search and select a video to start watching</p>
                                <button
                                    onClick={onShowSearch}
                                    className="px-6 py-3 bg-white hover:bg-zinc-200 text-black rounded-lg font-medium transition-colors"
                                >
                                    Search Videos
                                </button>
                            </div>
                        </div>
                    )}
                    {hasVideo && !isPlaying && !canControlPlayback && (
                        <div className="text-center space-y-4">
                            <div className="w-20 h-20 mx-auto bg-zinc-900 rounded-full flex items-center justify-center">
                                <svg className="w-10 h-10 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xl text-white mb-2">Waiting for host to start</p>
                                <p className="text-zinc-500">The host will start the video soon</p>
                            </div>
                        </div>
                    )}
                    {hasVideo && canControlPlayback && (
                        <div className="text-center space-y-4">
                            <p className="text-zinc-400">Video player will appear here</p>
                            <button className="px-6 py-3 bg-white hover:bg-zinc-200 text-black rounded-lg font-medium transition-colors">
                                Start Video
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
