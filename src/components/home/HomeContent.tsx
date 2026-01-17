'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/search/SearchBar';
import { ContentCard, ContentDetailModal } from '@/components/content';
import { useAuth } from '@/hooks/useAuth';
import { SearchResult } from '@/lib/api';
import { Button, Skeleton } from '@/components/ui';
import { loadVideoForRoom } from '@/services/api/rooms';
import {
    Menu,
    Plus,
    LogIn,
    LogOut,
    ChevronDown,
    Search,
    Users,
    Clock,
    Tv,
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
    isHost?: boolean;
    roomCode?: string;
    onLeaveRoom?: () => void;
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
    inRoom = false,
    isHost = false,
    roomCode,
    onLeaveRoom,
}: HomeContentProps) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [showRoomDropdown, setShowRoomDropdown] = useState(false);
    const [selectedContent, setSelectedContent] = useState<SelectedContent | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Handle logout
    const handleLogout = async () => {
        await logout();
        router.push('/login');
    };

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
    const handlePlay = async (episodeId?: string) => {
        if (!selectedContent) return;

        // If host in a room, notify participants before navigating
        if (inRoom && isHost && roomCode) {
            try {
                console.log('📺 Host selecting video for room:', selectedContent.id, episodeId);
                await loadVideoForRoom(roomCode, selectedContent.id, episodeId);
            } catch (error) {
                console.error('Failed to notify room of video selection:', error);
                // Continue anyway - host should still be able to watch
            }
        }

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

            {/* Fixed Header Section - Always visible */}
            <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-800/50">
                <div className="max-w-7xl mx-auto px-6 py-6">
                        <div className="space-y-6">
                            {/* Welcome message - hide for non-host members in room */}
                            {(!inRoom || isHost) && (
                                <div className="text-center">
                                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                                        Welcome, {user?.name || user?.username}
                                    </h1>
                                    <p className="text-lg text-zinc-400 mt-2">
                                        Search for movies and TV shows
                                    </p>
                                </div>
                            )}

                            {/* Search bar and room button */}
                            <div className="flex gap-3 items-center justify-center max-w-3xl mx-auto">
                                {/* Only show search bar if not in room OR if user is the host */}
                                {(!inRoom || isHost) && (
                                    <div className="flex-1">
                                        <SearchBar onSearch={onSearch} onClear={onClear} initialQuery={searchQuery} />
                                    </div>
                                )}

                                {/* Room Button with Dropdown */}
                                <div className="relative room-dropdown-container" ref={dropdownRef}>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowRoomDropdown(!showRoomDropdown)}
                                        className={cn(
                                            "gap-2 backdrop-blur-sm transition-all duration-200",
                                            inRoom 
                                                ? "bg-violet-600/80 border-violet-500 hover:bg-violet-500 hover:border-violet-400 text-white"
                                                : "bg-zinc-800/80 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600",
                                            showRoomDropdown && (inRoom ? "bg-violet-500 border-violet-400" : "bg-zinc-700 border-zinc-600")
                                        )}
                                    >
                                        {inRoom ? <Users className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                                        <span className="hidden sm:inline">{inRoom ? 'In Room' : 'Menu'}</span>
                                        <ChevronDown className={cn(
                                            "w-4 h-4 transition-transform duration-200",
                                            showRoomDropdown && "rotate-180"
                                        )} />
                                    </Button>

                                    {showRoomDropdown && (
                                        <div className="absolute right-0 mt-2 w-60 bg-zinc-900/98 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl shadow-black/60 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            {/* Dropdown header */}
                                            <div className="px-4 py-2.5 border-b border-zinc-800/80">
                                                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                                                    {inRoom ? `In Room: ${roomCode}` : 'Watch Party'}
                                                </p>
                                            </div>

                                            {inRoom ? (
                                                /* In Room - Show Leave Room option only */
                                                <div className="p-1.5">
                                                    <button
                                                        onClick={() => { onLeaveRoom?.(); setShowRoomDropdown(false); }}
                                                        className="w-full px-3 py-2.5 text-left text-white hover:bg-red-500/10 rounded-xl transition-all duration-200 flex items-center gap-3 group"
                                                    >
                                                        <div className="p-2 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-xl group-hover:from-red-500/30 group-hover:to-orange-500/30 transition-all duration-200">
                                                            <LogOut className="w-4 h-4 text-red-400" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-sm text-red-400">Leave Room</div>
                                                            <div className="text-xs text-zinc-500">Exit current watch party</div>
                                                        </div>
                                                    </button>
                                                    
                                                    <div className="mt-2 px-3 py-2 rounded-lg bg-zinc-800/50">
                                                        <p className="text-xs text-zinc-500 text-center">
                                                            Leave the room first to create or join another party
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Not in Room - Show Create/Join options */
                                                <>
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

                                                    {/* Logout option - only when not in room */}
                                                    <div className="border-t border-zinc-800/80 p-1.5">
                                                        <button
                                                            onClick={() => { handleLogout(); setShowRoomDropdown(false); }}
                                                            className="w-full px-3 py-2 text-left text-zinc-500 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all duration-200 flex items-center gap-3 group"
                                                        >
                                                            <div className="p-1.5 bg-zinc-800/50 rounded-lg group-hover:bg-red-500/10 transition-all duration-200">
                                                                <LogOut className="w-3.5 h-3.5 group-hover:text-red-400" />
                                                            </div>
                                                            <span className="text-sm">Sign out</span>
                                                        </button>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
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

            {/* Member Waiting State - Show when in room as non-host member and no search */}
            {inRoom && !isHost && !searched && (
                <div className="flex-1 flex items-center justify-center px-6 py-12">
                    <div className="text-center max-w-md">
                        {/* Animated waiting icon */}
                        <div className="relative w-32 h-32 mx-auto mb-8">
                            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-full animate-pulse" />
                            <div className="absolute inset-2 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-full flex items-center justify-center ring-1 ring-zinc-700/50">
                                <div className="relative">
                                    <Tv className="w-12 h-12 text-violet-400" />
                                    <Clock className="w-5 h-5 text-amber-400 absolute -bottom-1 -right-1 animate-pulse" />
                                </div>
                            </div>
                        </div>
                        
                        <h2 className="text-2xl font-semibold text-white mb-3">
                            Waiting for host to start
                        </h2>
                        <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                            The host will select something to watch. Once they start playback, you&apos;ll automatically join the watch party.
                        </p>
                        
                        {/* Room info badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800/50 rounded-full border border-zinc-700/50">
                            <Users className="w-4 h-4 text-violet-400" />
                            <span className="text-sm text-zinc-300">Room: <span className="font-mono text-violet-400">{roomCode}</span></span>
                        </div>
                    </div>
                </div>
            )}


        </>
    );
}
