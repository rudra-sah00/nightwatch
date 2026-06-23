'use client';

import {
  FocusContext,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect } from 'react';
import type { SubtitleTrack } from '@/features/watch/player/context/types';
import type { AgoraParticipant } from '@/features/watch-party/media/hooks/useAgora';
import type {
  PartyEvent,
  RoomMember,
  WatchPartyRoom,
} from '@/features/watch-party/room/types';
import {
  TvEmojiBar,
  TvEmojiOverlay,
  useTvEmojis,
} from '../components/TvEmojiReactions';
import { TvParticipantStrip } from '../components/TvParticipantStrip';
import { TvPlayer } from '../components/TvPlayer';

interface TvWatchTogetherProps {
  room: WatchPartyRoom;
  isHost: boolean;
  currentUserId?: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Agora participants with live video/audio tracks */
  agoraParticipants?: AgoraParticipant[];
  onPartyEvent: (event: PartyEvent) => void;
  onApprove: (memberId: string) => void;
  onReject: (memberId: string) => void;
  onReaction?: (emoji: string) => void;
  onLeave: () => void;
}

/**
 * TV Watch-Together page.
 * - Room code always visible (top-right badge)
 * - Join request popup for host when pendingMembers appear
 * - Participant overlay in player
 * - NO sketch, NO chat, NO sidebar
 */
export function TvWatchTogether({
  room,
  isHost,
  videoRef,
  agoraParticipants = [],
  onPartyEvent,
  onApprove,
  onReject,
  onReaction,
  onLeave,
}: TvWatchTogetherProps) {
  const participants = room.members
    .filter((m) => !m.disconnected)
    .map((m) => ({ id: m.id, name: m.name, profilePhoto: m.profilePhoto }));

  const { reactions, addReaction } = useTvEmojis(onReaction);

  const handlePartyEvent = useCallback(
    (event: { eventType: string; videoTime: number }) => {
      if (!isHost) return;
      onPartyEvent({
        eventType: event.eventType as PartyEvent['eventType'],
        videoTime: event.videoTime,
      });
    },
    [isHost, onPartyEvent],
  );

  // Guest sync: apply incoming state + periodic drift correction
  useEffect(() => {
    if (isHost) return;
    const v = videoRef.current;
    if (!v) return;

    const state = room.state;
    if (state.isPlaying && v.paused) v.play();
    if (!state.isPlaying && !v.paused) v.pause();

    const drift = Math.abs(v.currentTime - state.currentTime);
    if (drift > 2) v.currentTime = state.currentTime;
  }, [room.state, isHost, videoRef]);

  // Periodic drift check every 5s for guests
  useEffect(() => {
    if (isHost) return;
    const interval = setInterval(() => {
      const v = videoRef.current;
      if (!v || v.paused) return;
      const drift = Math.abs(v.currentTime - room.state.currentTime);
      if (drift > 3) v.currentTime = room.state.currentTime;
    }, 5000);
    return () => clearInterval(interval);
  }, [isHost, videoRef, room]);

  const subtitle =
    room.type === 'series' && room.season != null
      ? `S${room.season} E${room.episode}`
      : undefined;

  const subtitleTracks: SubtitleTrack[] = (room.subtitleTracks ?? []).map(
    (t) => ({
      id: t.id,
      label: t.label,
      language: t.language,
      src: t.src,
    }),
  );

  return (
    <div className="relative w-full h-screen">
      <TvPlayer
        streamUrl={room.streamUrl}
        title={room.title}
        subtitle={subtitle}
        isLive={room.type === 'livestream'}
        qualities={room.qualities}
        subtitleTracks={subtitleTracks}
        participants={participants}
        isHost={isHost}
        onPartyEvent={handlePartyEvent}
        onExit={onLeave}
      />

      {/* Room code badge (always visible, top-right) */}
      <RoomCodeBadge roomId={room.id} memberCount={participants.length} />

      {/* Participant video PiP strip (right edge, below code badge) */}
      {agoraParticipants.length > 0 && (
        <TvParticipantStrip participants={agoraParticipants} />
      )}

      {/* Join request popup (host only) */}
      {isHost && room.pendingMembers.length > 0 && (
        <JoinRequestPopup
          pending={room.pendingMembers}
          onApprove={onApprove}
          onReject={onReject}
        />
      )}

      {/* Emoji reactions */}
      <TvEmojiOverlay reactions={reactions} />
      <TvEmojiBar onReact={addReaction} />
    </div>
  );
}

// ─── Room Code Badge ───
function RoomCodeBadge({
  roomId,
  memberCount,
}: {
  roomId: string;
  memberCount: number;
}) {
  const t = useTranslations('common.tv.watchTogether');
  return (
    <div className="absolute top-6 right-6 z-40 flex items-center gap-3 bg-black/80 backdrop-blur-md border border-white/20 rounded-xl px-4 py-3">
      <div className="flex flex-col items-end">
        <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">
          {t('roomCode')}
        </span>
        <span className="text-lg font-black font-mono tracking-wider text-white">
          {roomId}
        </span>
      </div>
      <div className="w-px h-8 bg-white/20" />
      <div className="flex items-center gap-1.5">
        <span className="material-symbols-outlined text-sm text-green-400">
          group
        </span>
        <span className="text-sm font-bold text-white/80">{memberCount}</span>
      </div>
    </div>
  );
}

// ─── Join Request Popup ───
function JoinRequestPopup({
  pending,
  onApprove,
  onReject,
}: {
  pending: RoomMember[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const t = useTranslations('common.tv.watchTogether');
  const { ref, focusKey } = useFocusable({
    focusKey: 'TV_JOIN_REQUEST',
    isFocusBoundary: true,
    trackChildren: true,
  });

  return (
    <FocusContext.Provider value={focusKey}>
      <div
        ref={ref}
        className="absolute bottom-28 left-8 z-50 bg-black/90 backdrop-blur-lg border border-white/20 rounded-2xl p-5 max-w-[400px] shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-lg text-yellow-400">
            person_add
          </span>
          <span className="text-sm font-bold text-white/80 uppercase tracking-wider">
            {t('joinRequest')}
            {pending.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex flex-col gap-3 max-h-[200px] overflow-y-auto">
          {pending.map((member) => (
            <JoinRequestItem
              key={member.id}
              member={member}
              onApprove={() => onApprove(member.id)}
              onReject={() => onReject(member.id)}
            />
          ))}
        </div>
      </div>
    </FocusContext.Provider>
  );
}

function JoinRequestItem({
  member,
  onApprove,
  onReject,
}: {
  member: RoomMember;
  onApprove: () => void;
  onReject: () => void;
}) {
  return (
    <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center overflow-hidden shrink-0">
        {member.profilePhoto ? (
          <Image
            src={member.profilePhoto}
            alt=""
            className="w-full h-full object-cover"
            width={40}
            height={40}
            unoptimized
          />
        ) : (
          <span className="text-sm font-bold text-white">
            {member.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name */}
      <span className="flex-1 text-sm font-semibold text-white truncate">
        {member.name}
      </span>

      {/* Actions */}
      <div className="flex gap-2">
        <ApproveBtn onPress={onApprove} />
        <RejectBtn onPress={onReject} />
      </div>
    </div>
  );
}

function ApproveBtn({ onPress }: { onPress: () => void }) {
  const { ref, focused } = useFocusable({ onEnterPress: onPress });
  return (
    <button
      ref={ref}
      type="button"
      className={`p-2 rounded-lg transition-all ${
        focused ? 'bg-green-500 scale-110' : 'bg-green-500/20'
      }`}
    >
      <span className="material-symbols-outlined text-lg text-green-400">
        check
      </span>
    </button>
  );
}

function RejectBtn({ onPress }: { onPress: () => void }) {
  const { ref, focused } = useFocusable({ onEnterPress: onPress });
  return (
    <button
      ref={ref}
      type="button"
      className={`p-2 rounded-lg transition-all ${
        focused ? 'bg-red-500 scale-110' : 'bg-red-500/20'
      }`}
    >
      <span className="material-symbols-outlined text-lg text-red-400">
        close
      </span>
    </button>
  );
}
