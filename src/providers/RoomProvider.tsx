'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Room, JoinRequest, leaveRoom, getPendingRequests, getRoom } from '@/services/api/rooms';
import { useAuth } from '@/hooks/useAuth';
import { useLiveKitRoom } from '@/hooks/room/useLiveKitRoom';

interface RoomContextType {
    // Room state
    currentRoom: Room | null;
    setCurrentRoom: (room: Room | null) => void;
    livekitToken: string | null;
    setLivekitToken: (token: string | null) => void;
    
    // Sidebar state
    isSidebarCollapsed: boolean;
    setIsSidebarCollapsed: (collapsed: boolean) => void;
    
    // Audio state (video player audio)
    isRoomAudioOff: boolean;
    setIsRoomAudioOff: (off: boolean) => void;
    
    // Pending requests (for host)
    pendingRequests: JoinRequest[];
    fetchPendingRequests: () => Promise<void>;
    
    // LiveKit state
    isLiveKitConnected: boolean;
    localParticipant: ReturnType<typeof useLiveKitRoom>['localParticipant'];
    remoteParticipants: ReturnType<typeof useLiveKitRoom>['remoteParticipants'];
    participantStates: ReturnType<typeof useLiveKitRoom>['participantStates'];
    isMuted: boolean;
    isVideoOff: boolean;
    toggleMute: () => Promise<void>;
    toggleVideo: () => Promise<void>;
    
    // Actions
    handleLeaveRoom: () => Promise<void>;
    refreshRoomData: () => Promise<void>;
    
    // Computed
    isHost: boolean;
}

const RoomContext = createContext<RoomContextType | null>(null);

export function RoomProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
    const [livekitToken, setLivekitToken] = useState<string | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isRoomAudioOff, setIsRoomAudioOff] = useState(false);
    const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);

    const isHost = user?.id === currentRoom?.host_id;

    // LiveKit room connection
    const {
        isConnected: isLiveKitConnected,
        localParticipant,
        remoteParticipants,
        participantStates,
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
    }, [currentRoom, disconnectLiveKit]);

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

    // Refresh room data
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

    // Initial fetch of pending requests when room changes
    useEffect(() => {
        if (currentRoom && isHost) {
            fetchPendingRequests();
        }
    }, [currentRoom, isHost, fetchPendingRequests]);

    const value: RoomContextType = {
        currentRoom,
        setCurrentRoom,
        livekitToken,
        setLivekitToken,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        isRoomAudioOff,
        setIsRoomAudioOff,
        pendingRequests,
        fetchPendingRequests,
        isLiveKitConnected,
        localParticipant,
        remoteParticipants,
        participantStates,
        isMuted,
        isVideoOff,
        toggleMute,
        toggleVideo,
        handleLeaveRoom,
        refreshRoomData,
        isHost,
    };

    return (
        <RoomContext.Provider value={value}>
            {children}
        </RoomContext.Provider>
    );
}

export function useRoom() {
    const context = useContext(RoomContext);
    if (!context) {
        throw new Error('useRoom must be used within a RoomProvider');
    }
    return context;
}
