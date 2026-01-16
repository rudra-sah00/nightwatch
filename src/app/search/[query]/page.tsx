'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { search, SearchResult } from '@/services/api/media';
import { HomeContent } from '@/components/home';
import { AuthGuard } from '@/components/auth';
import { RoomModal } from '@/components/room';
import { Room, leaveRoom } from '@/services/api/rooms';

interface SearchPageProps {
    params: Promise<{ query: string }>;
}

function SearchPageContent({ params }: SearchPageProps) {
    const resolvedParams = use(params);
    const decodedQuery = decodeURIComponent(resolvedParams.query);
    const router = useRouter();
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<{ id: string; title: string } | null>(null);
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [roomMode, setRoomMode] = useState<'select' | 'create' | 'join'>('select');

    // Fetch search results automatically
    useEffect(() => {
        const fetchResults = async () => {
            if (!decodedQuery) return;

            setLoading(true);
            try {
                const response = await search(decodedQuery);
                setResults(response.data?.results || []);
            } catch {
                setResults([]);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [decodedQuery]);

    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) return;
        router.push(`/search/${encodeURIComponent(query)}`);
    }, [router]);

    const handleClear = useCallback(() => {
        router.push('/');
    }, [router]);

    const handleRoomJoined = (room: Room) => {
        setCurrentRoom(room);
        setIsRoomModalOpen(false);
    };

    const handleLeaveRoom = async () => {
        if (!currentRoom) return;

        try {
            await leaveRoom(currentRoom.code);
        } catch {
            // Ignore errors during leave
        } finally {
            setCurrentRoom(null);
        }
    };

    const handleOpenRoomModal = (mode: 'create' | 'join') => {
        setRoomMode(mode);
        setIsRoomModalOpen(true);
    };

    return (
        <div className="min-h-screen flex flex-col bg-black">
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

            <RoomModal
                isOpen={isRoomModalOpen}
                onClose={() => { setIsRoomModalOpen(false); setSelectedVideo(null); setRoomMode('select'); }}
                videoId={selectedVideo?.id}
                videoTitle={selectedVideo?.title}
                initialMode={roomMode}
                onRoomJoined={handleRoomJoined}
            />
        </div>
    );
}

// Wrap with AuthGuard to protect the route
export default function SearchPage({ params }: SearchPageProps) {
    return (
        <AuthGuard>
            <SearchPageContent params={params} />
        </AuthGuard>
    );
}

