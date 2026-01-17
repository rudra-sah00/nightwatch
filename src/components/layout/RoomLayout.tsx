'use client';

import { ReactNode } from 'react';
import { useRoom } from '@/providers/RoomProvider';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/room/Sidebar';

interface RoomLayoutProps {
    children: ReactNode;
}

export function RoomLayout({ children }: RoomLayoutProps) {
    const { user } = useAuth();
    const {
        currentRoom,
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
    } = useRoom();

    return (
        <div className="h-screen flex bg-black overflow-hidden">
            {/* Main Content - Scrollable */}
            <div className="flex-1 min-w-0 overflow-y-auto">
                {children}
            </div>

            {/* Room Sidebar (on the right, when in room) - Fixed */}
            {currentRoom && (
                <div className="flex-shrink-0">
                    <Sidebar
                        room={currentRoom}
                        currentUserId={user?.id}
                        isMuted={isMuted}
                        isVideoOff={isVideoOff}
                        isRoomAudioOff={isRoomAudioOff}
                        isCollapsed={isSidebarCollapsed}
                        pendingRequests={pendingRequests}
                        isLiveKitConnected={isLiveKitConnected}
                        localParticipant={localParticipant}
                        remoteParticipants={remoteParticipants}
                        participantStates={participantStates}
                        onToggleMute={toggleMute}
                        onToggleVideo={toggleVideo}
                        onToggleRoomAudio={() => setIsRoomAudioOff(!isRoomAudioOff)}
                        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        onLeaveRoom={handleLeaveRoom}
                        onRequestHandled={() => fetchPendingRequests()}
                    />
                </div>
            )}
        </div>
    );
}
