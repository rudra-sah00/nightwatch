'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RoomModal } from '@/components/room';
import { HomeContent } from '@/components/home';
import { useAuth } from '@/hooks/useAuth';
import { search, SearchResult } from '@/lib/api';
import { Room } from '@/services/api/rooms';
import { useRoomEvents, RoomEvent } from '@/hooks';
import { useRoom } from '@/providers/RoomProvider';

function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    currentRoom,
    setCurrentRoom,
    setLivekitToken,
    isHost,
    fetchPendingRequests,
    handleLeaveRoom,
    refreshRoomData,
  } = useRoom();

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ id: string; title: string } | null>(null);
  const [roomMode, setRoomMode] = useState<'select' | 'create' | 'join'>('select');

  // Listen to room events via WebSocket
  useRoomEvents({
    roomCode: currentRoom?.code || '',
    enabled: !!currentRoom,
    onEvent: useCallback((event: RoomEvent) => {
      if (!currentRoom) return;
      
      console.log('Room event received:', event);
      
      switch (event.type) {
        case 'participant_joined':
        case 'participant_left':
        case 'room_updated':
          // Refresh room data to update sidebar
          refreshRoomData();
          break;
        case 'room_deleted':
          handleLeaveRoom();
          break;
        case 'join_request_received':
          // Refresh pending requests when a new join request arrives
          fetchPendingRequests();
          break;
        case 'video_selected':
          // Host selected a video - navigate all participants to watch page
          // Each user will fetch their own video data (own CDN token)
          if (!isHost && event.video_id) {
            console.log('📺 Host selected video, navigating:', event.video_id);
            const url = event.episode_id 
              ? `/watch/${event.video_id}?episode=${event.episode_id}`
              : `/watch/${event.video_id}`;
            router.push(url);
          }
          break;
        case 'playback_update':
          // If member receives playback_update while on home page, 
          // it means they missed video_selected - check room video and navigate
          if (!isHost && currentRoom.video_id) {
            console.log('📺 Received playback_update on home page, navigating to video:', currentRoom.video_id);
            const url = currentRoom.episode_id
              ? `/watch/${currentRoom.video_id}?episode=${currentRoom.episode_id}`
              : `/watch/${currentRoom.video_id}`;
            router.push(url);
          }
          break;
      }
    }, [currentRoom, fetchPendingRequests, handleLeaveRoom, refreshRoomData, isHost, router])
  });

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

  const handleOpenRoomModal = (mode: 'create' | 'join') => {
    setRoomMode(mode);
    setIsRoomModalOpen(true);
  };

  return (
    <>
      <HomeContent
        results={results}
        loading={loading}
        searched={searched}
        searchQuery={searchQuery}
        onSearch={handleSearch}
        onClear={handleClear}
        onOpenRoomModal={handleOpenRoomModal}
        inRoom={!!currentRoom}
        isHost={isHost}
        roomCode={currentRoom?.code}
        onLeaveRoom={handleLeaveRoom}
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
    </>
  );
}

export default function Home() {
  return (
    <HomePage />
  );
}
