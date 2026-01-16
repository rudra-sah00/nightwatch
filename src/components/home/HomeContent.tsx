'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/search/SearchBar';
import { ContentCard, ContentDetailModal } from '@/components/content';
import { useAuth } from '@/hooks/useAuth';
import { SearchResult } from '@/lib/api';
import { Button, Skeleton } from '@/components/ui';
import {
    Menu,
    Plus,
    LogIn,
    LogOut,
    ChevronDown,
    Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContentType } from '@/types/content';

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

// Selected content for the modal
interface SelectedContent {
    id: string;
    title: string;
    type: ContentType;
    poster?: string;
    year?: number;
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
    const router = useRouter();
    const [showRoomDropdown, setShowRoomDropdown] = useState(false);
    const [selectedContent, setSelectedContent] = useState<SelectedContent | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowRoomDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle content card click - open modal
    const handleContentClick = (result: SearchResult) => {
        setSelectedContent({
            id: result.id,
            title: result.title,
            type: result.type || 'Movie',
            poster: result.poster,
            year: result.year,
        });
    };

    // Handle play from modal
    const handlePlay = (episodeId?: string) => {
        if (!selectedContent) return;

        if (episodeId) {
            // Series episode - navigate to episode
            router.push(`/watch/${selectedContent.id}?episode=${episodeId}`);
        } else {
            // Movie - navigate directly
            router.push(`/watch/${selectedContent.id}`);
        }
        setSelectedContent(null);
    };

    return (
        <>
            {/* Content Detail Modal */}
            {selectedContent && (
                <ContentDetailModal
                    id={selectedContent.id}
                    title={selectedContent.title}
                    type={selectedContent.type}
                    poster={selectedContent.poster}
                    year={selectedContent.year}
                    onClose={() => setSelectedContent(null)}
                    onPlay={handlePlay}
                />
            )}

            {/* Fixed Header Section - Always show at top unless in room */}
            {!inRoom && (
                <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800/50">
                    <div className="max-w-7xl mx-auto px-6 py-6">
                        <div className="space-y-6">
                            {/* Welcome message */}
                            <div className="text-center">
                                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                                    Welcome, {user?.name || user?.username}
                                </h1>
                                <p className="text-lg text-zinc-400 mt-2">
                                    Search for movies and TV shows
                                </p>
                            </div>

                            {/* Search bar and room button */}
                            <div className="flex gap-3 items-center justify-center max-w-3xl mx-auto">
                                <div className="flex-1">
                                    <SearchBar onSearch={onSearch} onClear={onClear} initialQuery={searchQuery} />
                                </div>

                                {/* Room Button with Dropdown */}
                                <div className="relative room-dropdown-container" ref={dropdownRef}>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowRoomDropdown(!showRoomDropdown)}
                                        className={cn(
                                            "gap-2 bg-zinc-800/80 backdrop-blur-sm border-zinc-700 hover:bg-zinc-700",
                                            "hover:border-zinc-600 transition-all duration-200",
                                            showRoomDropdown && "bg-zinc-700 border-zinc-600"
                                        )}
                                    >
                                        <Menu className="w-4 h-4" />
                                        <span className="hidden sm:inline">Menu</span>
                                        <ChevronDown className={cn(
                                            "w-4 h-4 transition-transform duration-200",
                                            showRoomDropdown && "rotate-180"
                                        )} />
                                    </Button>

                                    {showRoomDropdown && (
                                        <div className="absolute right-0 mt-2 w-60 bg-zinc-900/98 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            {/* Dropdown header */}
                                            <div className="px-4 py-2.5 border-b border-zinc-800/80">
                                                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Watch Party</p>
                                            </div>

                                            <div className="p-1.5">
                                                <button
                                                    onClick={() => { onOpenRoomModal('create'); setShowRoomDropdown(false); }}
                                                    className="w-full px-3 py-2.5 text-left text-white hover:bg-zinc-800/80 rounded-xl transition-all duration-200 flex items-center gap-3 group"
                                                >
                                                    <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition-all duration-200">
                                                        <Plus className="w-4 h-4 text-purple-300" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm">Create Room</div>
                                                        <div className="text-xs text-zinc-500">Start a new watch party</div>
                                                    </div>
                                                </button>

                                                <button
                                                    onClick={() => { onOpenRoomModal('join'); setShowRoomDropdown(false); }}
                                                    className="w-full px-3 py-2.5 text-left text-white hover:bg-zinc-800/80 rounded-xl transition-all duration-200 flex items-center gap-3 group"
                                                >
                                                    <div className="p-2 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl group-hover:from-blue-500/30 group-hover:to-cyan-500/30 transition-all duration-200">
                                                        <LogIn className="w-4 h-4 text-blue-300" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-sm">Join Room</div>
                                                        <div className="text-xs text-zinc-500">Enter with invite code</div>
                                                    </div>
                                                </button>
                                            </div>

                                            {/* Logout option - subtle at bottom */}
                                            <div className="border-t border-zinc-800/80 p-1.5">
                                                <button
                                                    onClick={() => { logout(); setShowRoomDropdown(false); }}
                                                    className="w-full px-3 py-2 text-left text-zinc-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all duration-200 flex items-center gap-3 group"
                                                >
                                                    <div className="p-1.5 bg-zinc-800/50 rounded-lg group-hover:bg-red-500/10 transition-all duration-200">
                                                        <LogOut className="w-3.5 h-3.5 group-hover:text-red-400" />
                                                    </div>
                                                    <span className="text-sm">Sign out</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Results Section */}
            {searched && (
                <div className="px-6 pb-12 max-w-7xl mx-auto w-full">
                    <div className="mb-6">
                        <h2 className="text-2xl font-semibold text-white">
                            {loading ? 'Searching...' : `Results for "${searchQuery}"`}
                        </h2>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="flex gap-4 p-4 bg-zinc-900/50 rounded-lg">
                                    <Skeleton className="w-36 aspect-video rounded" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-5 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-4 w-1/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : results.length > 0 ? (
                        <div className="space-y-3">
                            {results.map((result) => (
                                <button
                                    key={result.id}
                                    onClick={() => handleContentClick(result)}
                                    className="w-full flex items-start gap-4 p-4 rounded-lg hover:bg-zinc-800/50 transition-colors group text-left"
                                >
                                    {/* Poster */}
                                    <div className="relative w-36 aspect-video rounded overflow-hidden flex-shrink-0 bg-zinc-800">
                                        <img
                                            src={result.poster}
                                            alt={result.title}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0 pt-1">
                                        <h3 className="text-lg font-medium text-white mb-2 line-clamp-1">
                                            {result.title}
                                        </h3>
                                        <div className="flex items-center gap-3 text-sm text-zinc-400 mb-2">
                                            {result.year && <span>{result.year}</span>}
                                        </div>
                                    </div>
                                </button>
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


        </>
    );
}
