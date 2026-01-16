'use client';

import React, { useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth';
import { RoomModal, RoomView } from '@/components/room';
import { HomeContent } from '@/components/home';
import { useAuth } from '@/hooks/useAuth';
import { search, SearchResult } from '@/lib/api';
import { Room, leaveRoom } from '@/services/api/rooms';

function HomePage() {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ id: string; title: string } | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [roomMode, setRoomMode] = useState<'select' | 'create' | 'join'>('select');
  const [livekitToken, setLivekitToken] = useState<string | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setLoading(true);
    setSearchQuery(query);
    setSearched(true);

    try {
      const response = await search(query);
      setResults(response.data?.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClear = useCallback(() => {
    setResults([]);
    setSearchQuery('');
    setSelectedVideo(null);
    setSearched(false);
  }, []);

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
      // Call backend to leave room (this will remove user from participants or delete room if host)
      await leaveRoom(currentRoom.code);
    } catch {
      // Ignore errors during leave
    } finally {
      // Always clear local state regardless of API result
      setCurrentRoom(null);
      setLivekitToken(null);
    }
  };

  const handleOpenRoomModal = (mode: 'create' | 'join') => {
    setRoomMode(mode);
    setIsRoomModalOpen(true);
  };

  // Always show full room view when in a room
  if (currentRoom) {
    return <RoomView room={currentRoom} onLeave={handleLeaveRoom} livekitToken={livekitToken || undefined} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Main Home Content */}
      <HomeContent
        results={results}
        loading={loading}
        searched={searched}
        searchQuery={searchQuery}
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
        onRoomJoined={handleRoomJoined}
      />
    </div>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <HomePage />
    </AuthGuard>
  );
}
