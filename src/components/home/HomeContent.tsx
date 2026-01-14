'use client';

import { useState } from 'react';
import SearchBar from '@/components/search/SearchBar';
import MovieCard from './MovieCard';
import { useAuth } from '@/hooks/useAuth';
import { SearchResult } from '@/lib/api';
import { Button, Skeleton } from '@/components/ui';
import {
    Users,
    Plus,
    LogIn,
    LogOut,
    ChevronDown,
    Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HomeContentProps {
    results: SearchResult[];
    loading: boolean;
    searched: boolean;
    searchQuery: string;
    onSearch: (query: string) => void;
    onClear: () => void;
    onOpenRoomModal: (mode: 'create' | 'join') => void;
    inRoom?: boolean;
}

export function HomeContent({
    results,
    loading,
    searched,
    searchQuery,
    onSearch,
    onClear,
    onOpenRoomModal,
    inRoom = false
}: HomeContentProps) {
    const { user, logout } = useAuth();
    const [showRoomDropdown, setShowRoomDropdown] = useState(false);

    return (
        <>
            {/* Hero Section */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-20">
                <div className="max-w-3xl w-full space-y-8 text-center">
                    <div className="space-y-4">
                        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                            Welcome, {user?.name || user?.username}
                        </h1>
                        <p className="text-xl text-zinc-400">
                            Search for movies and TV shows
                        </p>
                    </div>

                    <div className="flex gap-3 items-center justify-center">
                        <div className="flex-1 max-w-xl">
                            <SearchBar onSearch={onSearch} onClear={onClear} />
                        </div>

                        {/* Room Button with Dropdown - Right side of search bar */}
                        {!inRoom && (
                            <div className="relative room-dropdown-container">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowRoomDropdown(!showRoomDropdown)}
                                    className={cn(
                                        "gap-2 bg-zinc-800/80 backdrop-blur-sm border-zinc-700 hover:bg-zinc-700",
                                        "hover:border-zinc-600 transition-all duration-200",
                                        showRoomDropdown && "bg-zinc-700 border-zinc-600"
                                    )}
                                >
                                    <Users className="w-4 h-4" />
                                    <span className="hidden sm:inline">Rooms</span>
                                    <ChevronDown className={cn(
                                        "w-4 h-4 transition-transform duration-200",
                                        showRoomDropdown && "rotate-180"
                                    )} />
                                </Button>

                                {showRoomDropdown && (
                                    <div className="absolute right-0 mt-2 w-56 bg-zinc-800/95 backdrop-blur-md border border-zinc-700/50 rounded-xl shadow-2xl shadow-black/50 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                        <button
                                            onClick={() => { onOpenRoomModal('create'); setShowRoomDropdown(false); }}
                                            className="w-full px-4 py-3 text-left text-white hover:bg-zinc-700/80 transition-colors flex items-center gap-3 group"
                                        >
                                            <div className="p-1.5 bg-red-500/20 rounded-lg group-hover:bg-red-500/30 transition-colors">
                                                <Plus className="w-4 h-4 text-red-400" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">Create Room</div>
                                                <div className="text-xs text-zinc-400">Start a watch party</div>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => { onOpenRoomModal('join'); setShowRoomDropdown(false); }}
                                            className="w-full px-4 py-3 text-left text-white hover:bg-zinc-700/80 transition-colors flex items-center gap-3 border-t border-zinc-700/50 group"
                                        >
                                            <div className="p-1.5 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                                                <LogIn className="w-4 h-4 text-blue-400" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">Join Room</div>
                                                <div className="text-xs text-zinc-400">Enter with code</div>
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Results Section */}
            {searched && (
                <div className="px-6 pb-12 max-w-7xl mx-auto w-full">
                    <div className="mb-6">
                        <h2 className="text-2xl font-semibold text-white">
                            {loading ? 'Searching...' : `Results for "${searchQuery}"`}
                        </h2>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="space-y-3">
                                    <Skeleton className="aspect-[2/3] rounded-xl" />
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/4" />
                                </div>
                            ))}
                        </div>
                    ) : results.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                            {results.map((result) => (
                                <MovieCard
                                    key={result.id}
                                    id={result.id}
                                    title={result.title}
                                    poster={result.poster}
                                    type={result.type}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-full flex items-center justify-center ring-1 ring-zinc-700/50 shadow-xl">
                                <Search className="w-10 h-10 text-zinc-600" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">No results found</h3>
                            <p className="text-zinc-500 text-sm max-w-md mx-auto">
                                We couldn&apos;t find any movies or TV shows matching &quot;{searchQuery}&quot;. Try a different search term.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Logout button at end of search results */}
            {searched && !loading && !inRoom && (
                <div className="px-6 pb-24 max-w-7xl mx-auto w-full flex justify-center">
                    <Button
                        variant="outline"
                        onClick={logout}
                        className="gap-2 bg-zinc-800/80 backdrop-blur-sm border-zinc-700 hover:bg-red-600/20 hover:border-red-500/50 hover:text-red-400 transition-all duration-200"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                    </Button>
                </div>
            )}

            {/* Empty state when not searched */}
            {!searched && (
                <div className="px-6 pb-12 max-w-7xl mx-auto w-full">
                    <div className="text-center py-8">
                        <div className="flex items-center justify-center gap-4 opacity-30">
                            <Search className="w-8 h-8 text-zinc-600" />
                            <div className="w-px h-8 bg-zinc-700" />
                            <span className="text-zinc-600 text-sm">Start searching to discover content</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Fixed Logout button at bottom of screen */}
            {!inRoom && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                    <Button
                        variant="outline"
                        onClick={logout}
                        className="gap-2 bg-zinc-900/90 backdrop-blur-md border-zinc-700 hover:bg-red-600/20 hover:border-red-500/50 hover:text-red-400 transition-all duration-200 shadow-lg shadow-black/50"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Logout</span>
                    </Button>
                </div>
            )}
        </>
    );
}
