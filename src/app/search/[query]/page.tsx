'use client';

import { useEffect, useState, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { search, SearchResult } from '@/services/api/media';
import { HomeContent } from '@/components/home';
import { RoomModal } from '@/components/room';
import { Room, leaveRoom } from '@/services/api/rooms';

import { useQuery } from '@tanstack/react-query';

interface SearchPageProps {
    params: Promise<{ query: string }>;
}

function SearchPageContent({ params }: SearchPageProps) {
    const resolvedParams = use(params);
    const decodedQuery = decodeURIComponent(resolvedParams.query);
    const router = useRouter();

    // React Query - Proper State Management
    const { data: results = [], isLoading: loading } = useQuery({
        queryKey: ['search', decodedQuery],
        queryFn: async ({ signal }) => {
            const response = await search(decodedQuery, { signal });
            if (response.error) throw new Error(response.error);
            return response.data?.results || [];
        },
        enabled: !!decodedQuery,
        staleTime: 60 * 1000, // Data fresh for 1 min
    });

    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<{ id: string; title: string } | null>(null);
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [roomMode, setRoomMode] = useState<'select' | 'create' | 'join'>('select');

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

// Route protected by middleware
export default function SearchPage({ params }: SearchPageProps) {
    return (
        <SearchPageContent params={params} />
    );
}

