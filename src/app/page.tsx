'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { RoomModal, Sidebar } from '@/components/room';
import { HomeContent } from '@/components/home';
import { useAuth } from '@/hooks/useAuth';
import { search, SearchResult } from '@/lib/api';
import { Room, leaveRoom, getPendingRequests, JoinRequest, getRoom } from '@/services/api/rooms';
import { useRoomEvents, RoomEvent, useLiveKitRoom } from '@/hooks';

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
  
  // Room audio (video player audio, not mic)
  const [isRoomAudioOff, setIsRoomAudioOff] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);

  const isHost = user?.id === currentRoom?.host_id;

  // LiveKit room connection with real audio/video controls
  const {
    isConnected: isLiveKitConnected,
    isMuted,
    isVideoOff,
    toggleMute,
    toggleVideo,
    disconnect: disconnectLiveKit,
  } = useLiveKitRoom({
    token: livekitToken,
    enabled: !!currentRoom && !!livekitToken,
  });

  // Leave room handler
  const handleLeaveRoom = useCallback(async () => {
    if (!currentRoom) return;
    
    // Disconnect from LiveKit first
    disconnectLiveKit();

    try {
      await leaveRoom(currentRoom.code);
    } catch {
      // Ignore errors during leave
    } finally {
      setCurrentRoom(null);
      setLivekitToken(null);
      setPendingRequests([]);
    }
  }, [currentRoom]);

  // Fetch pending join requests (for host only)
  const fetchPendingRequests = useCallback(async () => {
    if (!currentRoom || !isHost) return;
    
    try {
      const response = await getPendingRequests(currentRoom.code);
      setPendingRequests(response.data?.requests || []);
    } catch (error) {
      console.error('Failed to fetch pending requests:', error);
    }
  }, [currentRoom, isHost]);

  // Refresh room data (participants list, etc.)
  const refreshRoomData = useCallback(async () => {
    if (!currentRoom) return;
    
    try {
      const response = await getRoom(currentRoom.code);
      if (response.data?.room) {
        setCurrentRoom(response.data.room);
      }
    } catch (error) {
      console.error('Failed to refresh room data:', error);
    }
  }, [currentRoom]);

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
      }
    }, [currentRoom, fetchPendingRequests, handleLeaveRoom, refreshRoomData])
  });

  // Fetch pending requests when room changes
  useEffect(() => {
    if (currentRoom && isHost) {
      fetchPendingRequests();
    }
  }, [currentRoom?.code, isHost, fetchPendingRequests]);

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
    <div className="min-h-screen flex bg-black">
      {/* Room Sidebar (when in room) */}
      {currentRoom && (
        <Sidebar
          room={currentRoom}
          currentUserId={user?.id}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isRoomAudioOff={isRoomAudioOff}
          isCollapsed={isSidebarCollapsed}
          pendingRequests={pendingRequests}
          isLiveKitConnected={isLiveKitConnected}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onToggleRoomAudio={() => setIsRoomAudioOff(!isRoomAudioOff)}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onLeaveRoom={handleLeaveRoom}
          onRequestHandled={() => fetchPendingRequests()}
        />
      )}

      {/* Main Content */}
      <div className="flex-1">
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
      </div>

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
    <HomePage />
  );
}
