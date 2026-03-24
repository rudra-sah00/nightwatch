import { useEffect, useMemo, useRef, useState } from 'react';
import { useGestureDetection } from '../interactions/hooks/useGestureDetection';
import type { AgoraParticipant } from '../media/hooks/useAgora';
import { useAgora } from '../media/hooks/useAgora';
import type { RTMMessage } from '../media/hooks/useAgoraRtm';
import { useAgoraToken } from '../media/hooks/useAgoraToken';
import type { WatchPartyRoom } from '../room/types';

type SidebarTab = 'chat' | 'participants' | 'soundboard' | 'sketch';

interface UseWatchPartySidebarProps {
  room: WatchPartyRoom;
  currentUserId?: string;
  onTabChange?: (tab: SidebarTab) => void;
  onAgoraReady?: (data: { participants: AgoraParticipant[] }) => void;
  rtmSendMessage?: (msg: RTMMessage) => void;
}

export function useWatchPartySidebar({
  room,
  currentUserId,
  onTabChange,
  onAgoraReady,
  rtmSendMessage,
}: UseWatchPartySidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('participants');

  useEffect(() => {
    onTabChange?.(activeTab);
  }, [activeTab, onTabChange]);

  const currentMember = room.members.find((m) => m.id === currentUserId);
  const currentUserName =
    currentMember?.name || (room.hostId === currentUserId ? 'Host' : 'You');

  const canDraw =
    currentMember?.permissions?.canDraw ??
    room.permissions?.canGuestsDraw ??
    false;

  const canPlaySound =
    currentMember?.permissions?.canPlaySound ??
    room.permissions?.canGuestsPlaySounds ??
    true;

  const canChat =
    currentMember?.permissions?.canChat ??
    room.permissions?.canGuestsChat ??
    true;

  const stableMembers = useMemo(
    () =>
      room.members.map(({ id, name, profilePhoto }) => ({
        id,
        name,
        profilePhoto,
      })),
    [room.members],
  );

  const { token, appId, channel, uid } = useAgoraToken({
    roomId: room?.id,
    userId: currentUserId,
    userName: currentUserName,
  });

  const {
    participants,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    audioInputDevices,
    videoInputDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    switchAudioDevice,
    switchVideoDevice,
    localVideoTrack,
    isConnected: isAgoraConnected,
  } = useAgora({
    token,
    appId,
    channel,
    uid,
    members: stableMembers,
    userId: currentUserId,
  });

  useGestureDetection(localVideoTrack, {
    rtmSendMessage,
    userId: currentUserId,
    userName: currentUserName,
  });

  const onAgoraReadyRef = useRef(onAgoraReady);
  onAgoraReadyRef.current = onAgoraReady;

  useEffect(() => {
    onAgoraReadyRef.current?.({ participants });
  }, [participants]);

  return {
    activeTab,
    setActiveTab,
    currentMember,
    currentUserName,
    canDraw,
    canPlaySound,
    canChat,
    participants,
    audioEnabled,
    videoEnabled,
    toggleAudio,
    toggleVideo,
    audioInputDevices,
    videoInputDevices,
    selectedAudioDevice,
    selectedVideoDevice,
    switchAudioDevice,
    switchVideoDevice,
    localVideoTrack,
    isAgoraConnected,
  };
}
