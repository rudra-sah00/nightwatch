'use client';

import { use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { search } from '@/services/api/media';
import { HomeContent } from '@/components/home';
import { useRoom } from '@/providers/RoomProvider';
import { useQuery } from '@tanstack/react-query';

interface SearchPageProps {
    params: Promise<{ query: string }>;
}

function SearchPageContent({ params }: SearchPageProps) {
    const resolvedParams = use(params);
    const decodedQuery = decodeURIComponent(resolvedParams.query);
    const router = useRouter();
    const { currentRoom, isHost, handleLeaveRoom } = useRoom();

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

    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) return;
        router.push(`/search/${encodeURIComponent(query)}`);
    }, [router]);

    const handleClear = useCallback(() => {
        router.push('/');
    }, [router]);

    // Room modal not needed on search page - user can use main page
    const handleOpenRoomModal = useCallback(() => {
        router.push('/');
    }, [router]);

    return (
        <HomeContent
            results={results}
            loading={loading}
            searched={true}
            searchQuery={decodedQuery}
            onSearch={handleSearch}
            onClear={handleClear}
            onOpenRoomModal={handleOpenRoomModal}
            inRoom={!!currentRoom}
            isHost={isHost}
            roomCode={currentRoom?.code}
            onLeaveRoom={handleLeaveRoom}
        />
    );
}

// Route protected by middleware
export default function SearchPage({ params }: SearchPageProps) {
    return (
        <SearchPageContent params={params} />
    );
}