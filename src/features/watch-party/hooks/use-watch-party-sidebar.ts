import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { checkIsDesktop, desktopBridge } from '@/lib/electron-bridge';
import { useAuth } from '@/providers/auth-provider';
import { useGestureDetection } from '../interactions/hooks/useGestureDetection';
import type { AgoraParticipant } from '../media/hooks/useAgora';
import { useAgora } from '../media/hooks/useAgora';
import type { RTMMessage } from '../media/hooks/useAgoraRtm';
import { useAgoraToken } from '../media/hooks/useAgoraToken';
import type { WatchPartyRoom } from '../room/types';

/** Sidebar tab identifier type. */
type SidebarTab = 'chat' | 'participants' | 'soundboard' | 'sketch';

/**
 * Props for the {@link useWatchPartySidebar} hook.
 */
interface UseWatchPartySidebarProps {
  /** The current watch party room state. */
  room: WatchPartyRoom;
  /** The current user's unique identifier. */
  currentUserId?: string;
  /** Optional callback invoked when the active sidebar tab changes. */
  onTabChange?: (tab: SidebarTab) => void;
  /** Optional callback invoked when Agora participants are ready. */
  onAgoraReady?: (data: { participants: AgoraParticipant[] }) => void;
  /** Optional function to broadcast an RTM message to all room participants. */
  rtmSendMessage?: (msg: RTMMessage) => void;
}

/**
 * Hook managing the watch party sidebar state and Agora voice/video integration.
 *
 * Handles sidebar tab selection, resolves the current user's display name and
 * permissions (draw, sound, chat), initializes Agora RTC with token authentication,
 * manages audio/video device selection and toggling, runs gesture detection on the
 * local video track, and listens for desktop push-to-talk shortcuts.
 *
 * @param props - Room state, user ID, and optional callbacks.
 * @returns Sidebar tab state, user permissions, Agora media controls, and device lists.
 */
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

  const { user } = useAuth();
  const t = useTranslations('party');
  const currentMember = room.members.find((m) => m.id === currentUserId);
  const currentUserName =
    currentMember?.name ||
    user?.name ||
    (currentUserId?.startsWith('guest')
      ? t('fallback.guest')
      : t('participant.you'));

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
    isDeafened,
    toggleDeafen,
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

  // --- DESKTOP PTT GLOBAL SHORTCUT ---
  useEffect(() => {
    if (typeof window !== 'undefined' && checkIsDesktop()) {
      const unsubscribe = desktopBridge.onMediaCommand((command) => {
        if (command === 'toggle-ptt') {
          toggleAudio().catch(() => {});
        }
      });
      return () => unsubscribe();
    }
  }, [toggleAudio]);

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
    isDeafened,
    toggleDeafen,
    isAgoraConnected,
  };
}
