'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { search, SearchResult } from '@/lib/api/media';
import { HomeContent } from '@/components/home';
import { useAuth } from '@/hooks/useAuth';
import { RoomModal } from '@/components/room';
import { Room, leaveRoom } from '@/lib/api/rooms';

interface SearchPageProps {
    params: Promise<{ query: string }>;
}

export default function SearchPage({ params }: SearchPageProps) {
    const resolvedParams = use(params);
    const decodedQuery = decodeURIComponent(resolvedParams.query);
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<{ id: string; title: string } | null>(null);
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [roomMode, setRoomMode] = useState<'select' | 'create' | 'join'>('select');
    const [livekitToken, setLivekitToken] = useState<string | null>(null);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Fetch search results automatically
    useEffect(() => {
        const fetchResults = async () => {
            if (!decodedQuery) return;

            setLoading(true);
            try {
                const response = await search(decodedQuery);
                setResults(response.data?.results || []);
            } catch (err) {
                console.error('Search failed:', err);
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [decodedQuery]);

    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) return;

        // Navigate to new search URL
        router.push(`/search/${encodeURIComponent(query)}`);
    }, [router]);

    const handleClear = useCallback(() => {
        router.push('/');
    }, [router]);

    const handleRoomJoined = (room: Room, token?: string) => {
        setCurrentRoom(room);
        if (token) {
            setLivekitToken(token);
        }
        setIsRoomModalOpen(false);
    };

    const handleLeaveRoom = async () => {
        if (!currentRoom) return;
        
        try {
            await leaveRoom(currentRoom.code);
        } catch (err) {
            console.error('Error leaving room:', err);
        } finally {
            setCurrentRoom(null);
            setLivekitToken(null);
        }
    };

    const handleOpenRoomModal = (mode: 'create' | 'join') => {
        setRoomMode(mode);
        setIsRoomModalOpen(true);
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-black">
            {/* Use HomeContent component with search results */}
            <HomeContent
                results={results}
                loading={loading}
                searched={true}
                searchQuery={decodedQuery}
                onSearch={handleSearch}
                onClear={handleClear}
                onOpenRoomModal={handleOpenRoomModal}
                inRoom={!!currentRoom}
            />

            {/* Room Modal */}
            <RoomModal
                isOpen={isRoomModalOpen}
                onClose={() => { setIsRoomModalOpen(false); setSelectedVideo(null); setRoomMode('select'); }}
                videoId={selectedVideo?.id}
                videoTitle={selectedVideo?.title}
                initialMode={roomMode}
                onJoin={handleRoomJoined}
            />
        </div>
    );
}
