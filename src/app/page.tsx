'use client';

import React, { useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth';
import { RoomModal, RoomView, RoomBanner } from '@/components/room';
import { HomeContent } from '@/components/home';
import { useAuth } from '@/hooks/useAuth';
import { search, SearchResult } from '@/lib/api';
import { Room } from '@/lib/api/rooms';

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
  const [showFullRoomView, setShowFullRoomView] = useState(false);
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

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setLivekitToken(null);
    setShowFullRoomView(false);
  };

  const handleOpenRoomModal = (mode: 'create' | 'join') => {
    setRoomMode(mode);
    setIsRoomModalOpen(true);
  };

  // If in full room view, show full room view
  if (currentRoom && showFullRoomView) {
    return <RoomView room={currentRoom} onLeave={handleLeaveRoom} livekitToken={livekitToken || undefined} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Room Banner - Shows when in a room but not expanded */}
      {currentRoom && !showFullRoomView && (
        <RoomBanner
          room={currentRoom}
          onExpand={() => setShowFullRoomView(true)}
          onLeave={handleLeaveRoom}
          isHost={user?.id === currentRoom.host_id}
          livekitToken={livekitToken || undefined}
        />
      )}

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
