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
    isHost: boolean;
    onSearch: (query: string) => void;
    onClearSearch: () => void;
    onShowSearch: () => void;
}

export function RoomContent({
    showSearch,
    canControlPlayback,
    hasVideo,
    isPlaying,
    isHost,
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
            {/* Host-Only: Search Section - Prominent like home page */}
            {isHost && !hasSearched && (
                <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-10">
                    <div className="max-w-2xl w-full space-y-6 text-center">
                        <div className="space-y-3">
                            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                                Search & Watch Together
                            </h2>
                            <p className="text-lg text-zinc-400">
                                Search for movies and TV shows to watch with your room
                            </p>
                        </div>
                        <div className="w-full">
                            <SearchBar onSearch={handleSearch} onClear={handleClear} />
                        </div>
                    </div>
                </div>
            )}

            {/* Host-Only: Search Results - Compact view */}
            {isHost && hasSearched && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 pt-4 pb-2">
                        <div className="max-w-2xl mx-auto">
                            <SearchBar onSearch={handleSearch} onClear={handleClear} />
                        </div>
                    </div>
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
                </div>
            )}

            {/* Video Player or Waiting Area */}
            {!isHost && (
                <div className="flex-1 flex items-center justify-center">
                    {/* User View: Waiting for host to select video */}
                    {!hasVideo && !isHost && (
                        <div className="text-center space-y-6 px-4">
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-full flex items-center justify-center ring-4 ring-zinc-800">
                                <svg className="w-12 h-12 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl text-white mb-2 font-semibold">Waiting for Host</p>
                                <p className="text-zinc-400 max-w-md mx-auto">The host is selecting a video. Hang tight and chat with other participants!</p>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-zinc-500">
                                <div className="w-2 h-2 bg-zinc-600 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-zinc-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-zinc-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    )}
                    
                    {/* Host View: No video selected yet */}
                    {!hasVideo && isHost && (
                        <div className="text-center space-y-6 px-4">
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-red-900/30 to-red-800/20 rounded-full flex items-center justify-center ring-4 ring-red-900/30">
                                <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl text-white mb-2 font-semibold">Select a Video</p>
                                <p className="text-zinc-400 max-w-md mx-auto mb-6">Search and select a video to start the watch party with your room</p>
                                <button
                                    onClick={onShowSearch}
                                    className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg shadow-red-900/50"
                                >
                                    Search Videos
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* User View: Video selected but not playing */}
                    {hasVideo && !isPlaying && !isHost && (
                        <div className="text-center space-y-6 px-4">
                            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-full flex items-center justify-center ring-4 ring-zinc-800">
                                <svg className="w-12 h-12 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-2xl text-white mb-2 font-semibold">Ready to Watch</p>
                                <p className="text-zinc-400 max-w-md mx-auto">Waiting for the host to start playback</p>
                            </div>
                            <div className="flex items-center justify-center gap-2 text-zinc-500">
                                <div className="w-2 h-2 bg-zinc-600 rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-zinc-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-2 h-2 bg-zinc-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                    )}
                    
                    {/* Host View: Video selected */}
                    {hasVideo && isHost && (
                        <div className="text-center space-y-4 px-4">
                            <p className="text-zinc-400">Video player will appear here</p>
                            <button className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all transform hover:scale-105 shadow-lg shadow-red-900/50">
                                Start Video
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
