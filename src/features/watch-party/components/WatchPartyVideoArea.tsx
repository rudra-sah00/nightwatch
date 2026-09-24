'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { RecordButton } from '@/features/clips/components/RecordButton';
import { useClipRecorder } from '@/features/clips/hooks/use-clip-recorder';
import { Player } from '@/features/watch/player';
import { usePlayerContext } from '@/features/watch/player/context/PlayerContext';
import { CenterPlayButton } from '@/features/watch/player/ui/controls/PlayPause';
import { NextEpisodeOverlay } from '@/features/watch/player/ui/overlays/NextEpisodeOverlay';
import { extractTokenFromUrl } from '@/features/watch/utils';
import { checkIsMobile } from '@/lib/electron-bridge';
import { env } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';
import { usePlayerOverlays } from '../hooks/use-player-overlays';
import { useWatchPartyVideoArea } from '../hooks/use-watch-party-video-area';
import { useRelay } from '../relay/hooks/use-relay';
import type { RelaySeatClaim } from '../relay/lib/types';
import {
  PARTY_PLAYBACK_BLOCKED_EVENT,
  type PartyPlaybackBlockedDetail,
} from '../room/hooks/usePredictiveSync';
import type { WatchPartyRoom } from '../room/types';
import type { RTMMessage } from '../room/types/rtm-messages';
import { useSeatOccupancy } from '../theatre/hooks/use-seat-occupancy';
import { useTheatreNetwork } from '../theatre/hooks/use-theatre-network';
import { memberNames, presentMemberIds } from '../theatre/lib/roster';
import type { Stance } from '../theatre/lib/stance';
import { useTheatreView } from '../theatre/lib/view-mode';

const FloatingEmojis = dynamic(
  () =>
    import('../interactions/components/FloatingEmojis').then(
      (mod) => mod.FloatingEmojis,
    ),
  { ssr: false },
);

const SketchOverlay = dynamic(
  () =>
    import('../interactions/components/SketchOverlay').then(
      (mod) => mod.SketchOverlay,
    ),
  { ssr: false },
);

// three.js + rapier are ~1 MB; code-split so a 2D watch party never loads them.
const TheatreScene = dynamic(
  () =>
    import('../theatre/components/TheatreScene').then(
      (mod) => mod.TheatreScene,
    ),
  { ssr: false },
);

const EmojiReactions = dynamic(
  () =>
    import('../interactions/components/EmojiReactions').then(
      (mod) => mod.EmojiReactions,
    ),
  { ssr: false },
);

/**
 * Inner overlay component that reads player state from context.
 *
 * Renders buffering spinner, error message, center play button, and
 * the next-episode auto-play overlay. Must be rendered inside `<Player.Root>`.
 */
function PlayerOverlays({
  isHost,
  onNextEpisode,
}: {
  isHost: boolean;
  onNextEpisode?: (season: number, episode: number) => void;
}) {
  const { state, nextEpisode, handlePlayNext } = usePlayerOverlays(
    isHost,
    onNextEpisode,
  );
  const { metadata, playerHandlers, videoRef } = usePlayerContext();
  const tp = useTranslations('party.toasts');
  const tPlayer = useTranslations('watch.player');

  /**
   * Set when this viewer's browser refused to start playback.
   *
   * Autoplay policy is per-document and per-browser, so it is not party state and
   * cannot be fixed by the host. A guest's centre overlay is inert by design, so
   * without this the refusal was terminal: the lock badge sat over a black frame
   * for the rest of the session while the stream was loaded and healthy
   * underneath. See `PARTY_PLAYBACK_BLOCKED_EVENT`.
   */
  const [playbackBlocked, setPlaybackBlocked] =
    useState<PartyPlaybackBlockedDetail | null>(null);

  useEffect(() => {
    const onBlocked = (event: Event) => {
      const detail = (event as CustomEvent<PartyPlaybackBlockedDetail>).detail;
      if (detail?.muted) {
        // Picture is running, only the sound was withheld. Nothing is stuck, so
        // this is a toast rather than a blocking overlay.
        setPlaybackBlocked(null);
        toast.info(tp('enableAudio'), {
          id: 'party-playback-muted',
          action: {
            label: tp('enableAudioAction'),
            onClick: () => {
              const video = videoRef.current;
              if (video) video.muted = false;
            },
          },
        });
        return;
      }
      setPlaybackBlocked(detail ?? { muted: false });
    };

    window.addEventListener(PARTY_PLAYBACK_BLOCKED_EVENT, onBlocked);
    return () =>
      window.removeEventListener(PARTY_PLAYBACK_BLOCKED_EVENT, onBlocked);
  }, [tp, videoRef]);

  // Once anything is playing the refusal is history, whoever resolved it.
  useEffect(() => {
    if (state.isPlaying) setPlaybackBlocked(null);
  }, [state.isPlaying]);

  /**
   * Start playback from the viewer's own gesture.
   *
   * Local only — it touches this element and nothing else, so a guest does not
   * gain control of the party by using it. `usePredictiveSync` immediately
   * re-asserts the host's authoritative state over the top.
   */
  const handleBlockedTap = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.play().catch(() => {
      // Still refused. Leave the prompt up so it can be tried again.
    });
  }, [videoRef]);

  const pauseOverlayMetadata = {
    title: metadata.title,
    type: metadata.type,
    season: metadata.season,
    episode: metadata.episode,
    description: metadata.description,
    year: metadata.year,
    posterUrl: metadata.posterUrl,
  };

  return (
    <>
      {state.isBuffering && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2.5 bg-black/30 backdrop-blur-sm pointer-events-none">
          <div className="w-10 h-10 rounded-full border-[3px] border-white/20 border-t-white animate-spin" />
          <p className="text-white/50 text-xs font-medium tracking-wide select-none">
            {isHost ? 'Buffering\u2026' : 'Syncing stream\u2026'}
          </p>
        </div>
      )}
      {state.error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70 gap-3">
          <p className="text-white text-sm font-medium">{state.error}</p>
        </div>
      )}

      <CenterPlayButton
        isPlaying={state.isPlaying}
        onToggle={playerHandlers.togglePlay}
        metadata={pauseOverlayMetadata}
        disabled={!isHost}
        isLoading={state.isLoading}
        playbackBlocked={playbackBlocked}
        onPlaybackBlockedTap={handleBlockedTap}
        blockedLabel={tPlayer('tapToResume')}
      />

      {/* Next episode overlay — host triggers party content update; guests see it read-only */}
      <NextEpisodeOverlay
        isVisible={nextEpisode.show}
        nextEpisode={nextEpisode.info}
        onPlayNext={handlePlayNext}
        onCancel={nextEpisode.cancel}
        isLoading={nextEpisode.isLoading}
      />
    </>
  );
}

/** Props for the {@link WatchPartyVideoArea} component. */
interface WatchPartyVideoAreaProps {
  room: WatchPartyRoom;
  isHost: boolean;
  isFullscreen: boolean;
  isSketchMode: boolean;
  onVideoRef: (ref: HTMLVideoElement | null) => void;
  onNavigate: (url: string) => void;
  onSidebarToggle: () => void;
  isSidebarOpen: boolean;
  toggleFullscreen: () => Promise<void>;
  /** Host-only: called when next episode should start for the whole party */
  onNextEpisode?: (season: number, episode: number) => void;
  rtmSendMessage?: (msg: RTMMessage) => void;
  rtmSendMessageToPeer?: (peerId: string, msg: RTMMessage) => void;
  userId?: string;
  currentUserName?: string;
}

/**
 * The main video column of the Watch Party layout.
 *
 * Composes {@link Player.Root}, state-driven overlays, the sketch canvas,
 * floating emoji reactions, clip recording, and the player controls bar.
 * Isolated from sidebar and dialog logic.
 */
export function WatchPartyVideoArea({
  room,
  isHost,
  isFullscreen,
  isSketchMode,
  onVideoRef,
  onNavigate,
  onSidebarToggle,
  isSidebarOpen,
  toggleFullscreen,
  onNextEpisode,
  rtmSendMessage,
  rtmSendMessageToPeer,
  userId,
  currentUserName,
}: WatchPartyVideoAreaProps) {
  /**
   * Which avatar body this user picked.
   *
   * Read from the same store `TheatreScene` reads, but here, because the relay announces
   * it on the roster at connect time — and the relay outlives the scene.
   */
  const theatreCharacter = useTheatreView((state) => state.character);

  /**
   * Bridges a replayed or incoming seat claim into `useSeatOccupancy`.
   *
   * A ref because the relay is declared before the seat hook, and the seat hook needs the
   * relay's `claimSeat`. One of the two directions has to be late-bound; a ref costs
   * nothing here since both live for the party's lifetime.
   */
  const seatClaimRef = useRef<((claim: RelaySeatClaim) => void) | null>(null);

  /**
   * The watch-party relay.
   *
   * Mounted HERE rather than inside `TheatreScene` for the same reason
   * `useSeatOccupancy` is: the scene is unmounted every time the view mode returns to
   * `2d`, and a connection that reconnects on every 2D round trip would lose its slot,
   * its clock calibration and its place in the roster. This component's lifetime is the
   * party's.
   *
   * Stage 1 of the migration: poses and seat claims ride the relay, the remaining
   * control messages still ride `rtmSendMessage`. The relay simply stays off when
   * `NEXT_PUBLIC_WS_RELAY_URL` is unset, so an environment without a relay behaves
   * exactly as before.
   */
  const relay = useRelay({
    roomId: room.id,
    userId,
    character: theatreCharacter === 'woman' ? 'w' : 'm',
    enabled: Boolean(userId) && env.WS_RELAY_URL.length > 0,
    onPose: (peerId, pose, serverTick) =>
      theatreNetRef.current?.acceptPose(peerId, pose, serverTick),
    onSeatClaim: (claim) => seatClaimRef.current?.(claim),
  });

  /**
   * Pose buffers and the send-rate policy.
   *
   * Also above the scene, because the relay above feeds it. `TheatreScene` receives the
   * result as one `net` prop and is otherwise unchanged by the transport swap.
   */
  const theatreNet = useTheatreNetwork({
    userId: userId ?? '',
    peerIds: relay.peerIds,
    serverNow: relay.serverNow,
    sendPose: relay.sendPose,
    interpDelayMs: relay.interpDelayMs,
    characterFor: relay.characterFor,
    enabled: Boolean(userId),
  });

  /*
    Refs break the circular reference between the two hooks above: the relay's `onPose`
    has to reach the buffers, and the buffers are created from the relay's roster. A ref
    is the standard way out and costs nothing, since both live for the party's lifetime.
  */
  const theatreNetRef = useRef(theatreNet);
  theatreNetRef.current = theatreNet;

  /**
   * Present members, memoised on the member list.
   *
   * A fresh array every render would re-fire the theatre's roster reconciliation
   * effect on unrelated re-renders and defeat the `useMemo` that PassiveAvatars
   * uses to keep seat assignment stable.
   */
  const theatreMemberIds = useMemo(
    () => presentMemberIds(room.members),
    [room.members],
  );

  /**
   * Display names for the 3D labels, from the roster.
   *
   * `currentUserName` is folded in as a fallback for this user, in case the
   * roster row for self has not arrived yet — a guest is added to `members`
   * asynchronously after approval.
   */
  const theatreMemberNames = useMemo(() => {
    const map = memberNames(room.members);
    if (userId && currentUserName && !map[userId]) {
      map[userId] = currentUserName;
    }
    return map;
  }, [room.members, userId, currentUserName]);

  const {
    metadata,
    streamUrlOverride,
    initialAudioTracks,
    initialAudioTrackId,
    handleAudioTrackChange,
  } = useWatchPartyVideoArea(room);
  const { user } = useAuth();
  const isAuthenticated = !!user;

  const clip = useClipRecorder({
    matchId: room.contentId || `wp-${room.id}`,
    title: `${metadata.title} - Clip`,
    streamToken: extractTokenFromUrl(
      streamUrlOverride || room.streamUrl || null,
    ),
    streamUrl: streamUrlOverride || room.streamUrl || null,
  });

  const t = useTranslations('common');

  const handleClipStart = () => {
    clip.start();
    toast.info(t('recording.started'));
  };
  const handleClipStop = async () => {
    await clip.stop();
    toast.success(t('recording.saved'));
  };

  const recordButton =
    isHost && !checkIsMobile() && room.type === 'livestream' ? (
      <RecordButton
        isRecording={clip.isRecording}
        duration={clip.duration}
        canStop={clip.canStop}
        isStarting={clip.isStarting}
        isStopping={clip.isStopping}
        onStart={handleClipStart}
        onStop={handleClipStop}
      />
    ) : null;

  const viewMode = useTheatreView((s) => s.mode);
  const is3D = viewMode !== '2d';

  /*
    Seat occupancy, mounted HERE rather than inside the scene.

    A seat claim is party state, not scene state. `TheatreScene` is unmounted the
    moment the view mode returns to `2d`, so owning the claim map down there meant
    a 2D <-> 3D round trip destroyed your own seat, never told the room you had
    left it, and came back with everyone else's claims stale. See the hook's
    docblock. Nothing in it touches three.js.

    `active` is the 3D flag and gates one thing only: the automatic seat on entry.
  */
  const { seatMap, mySeat, claimSeat, acceptRemoteClaim } = useSeatOccupancy({
    userId: userId ?? '',
    // The relay stamps `at` in SERVER time and broadcasts the claim. That matters
    // because `at` is the only field the contest is decided on: with wall clocks two
    // people could each genuinely believe they claimed first.
    claimSeatOnRelay: relay.claimSeat,
    // Same roster the avatars reconcile against, so a departed member's chair is
    // released rather than staying reserved for the rest of the session.
    memberIds: theatreMemberIds,
    enabled: Boolean(userId),
    active: is3D,
  });

  /*
    Close the loop declared above: the relay's `onSeatClaim` reaches the seat hook
    through this ref, covering both live claims and the set replayed in `hello`.
  */
  seatClaimRef.current = acceptRemoteClaim;

  /*
    Where this user was standing, kept alongside their seat.

    Same owner as the claim above, for the same reason: `TheatreScene` is torn down
    the moment the mode returns to `2d`, so anything describing where the user is in
    the room has to live above it. A ref, not state — it is written every frame
    while walking and nothing renders from it.
  */
  const stanceRef = useRef<Stance | null>(null);

  return (
    <Player.Root
      streamUrl={streamUrlOverride || room.streamUrl || null}
      metadata={metadata}
      captionUrl={room.captionUrl || null}
      subtitleTracks={room.subtitleTracks}
      spriteVtt={room.spriteVtt}
      qualities={room.qualities}
      onVideoRef={onVideoRef}
      interactionMode={isHost ? 'interactive' : 'read-only'}
      isHost={isHost}
      isAuthenticated={isAuthenticated}
      onNavigate={onNavigate}
      fullscreenToggleOverride={toggleFullscreen}
      isFullscreenOverride={isFullscreen}
      streamMode={room.type === 'livestream' ? 'live' : 'vod'}
      initialAudioTracks={
        initialAudioTracks.length > 0 ? initialAudioTracks : undefined
      }
      initialAudioTrackId={initialAudioTrackId}
      onAudioTrackChange={isHost ? handleAudioTrackChange : undefined}
      playbackRate={room.state.playbackRate}
      // Playback rate is party state: useWatchPartyHostSync broadcasts a `rate` event
      // on every ratechange, so a transient hold-to-speed boost would push 2x and then
      // 1x to every member.
      holdToSpeedUp={false}
    >
      {/* Blurred poster background */}
      {metadata.posterUrl ? (
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div
            className="absolute inset-0 bg-cover bg-center blur-3xl scale-110 opacity-30"
            style={{ backgroundImage: `url(${metadata.posterUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60" />
        </div>
      ) : null}

      <Player.Video />

      {/* State-driven overlays + next episode */}
      <PlayerOverlays isHost={isHost} onNextEpisode={onNextEpisode} />

      {/* Watch party overlays */}
      <FloatingEmojis />
      <SketchOverlay
        rtmSendMessage={rtmSendMessage}
        rtmSendMessageToPeer={rtmSendMessageToPeer}
        userId={userId}
        userName={currentUserName}
      />

      {/* Episode panel provider wraps controls for shared context */}
      {!isSketchMode && (
        <Player.EpisodePanel>
          <Player.Controls>
            <Player.Header
              onSidebarToggle={onSidebarToggle}
              isSidebarOpen={isSidebarOpen}
              hideBackButton
              rightContent={recordButton}
            />
            <Player.SeekBar />
            <Player.ControlRow>
              <Player.PlayPause />
              <Player.Volume />
              <Player.TimeDisplay />
              <Player.Spacer />
              <EmojiReactions
                rtmSendMessage={rtmSendMessage}
                userId={userId}
                userName={
                  currentUserName ||
                  user?.name ||
                  (isHost ? 'Room Host' : 'Member')
                }
              />
              <Player.Spacer />
              <Player.EpisodePanelTrigger />
              <Player.AudioSubtitleSelectors />
              <Player.SettingsMenu />
              <Player.Fullscreen
                label={
                  isFullscreen ? 'Exit theater mode' : 'Enter theater mode'
                }
              />
            </Player.ControlRow>
          </Player.Controls>

          {/* Episode overlay — renders OUTSIDE controls, covers entire player */}
          <Player.EpisodePanelOverlay />
        </Player.EpisodePanel>
      )}

      {/*
        3D theatre overlay.

        Player.Root stays MOUNTED underneath rather than being swapped out:
        unmounting it would tear down the HLS pipeline, lose playback sync with
        the party and re-buffer on every V press. The canvas is opaque and
        covers it, and keeping the <video> element alive is also what lets the
        theatre screen use it as a VideoTexture source.
      */}
      {is3D ? (
        <div className="absolute inset-0 z-40 bg-black">
          <TheatreScene
            userId={userId ?? ''}
            net={theatreNet}
            cinema={viewMode === 'cinema'}
            /*
              Everyone currently in the party, so members who never switched 3D
              on can still be shown sitting in the room rather than being
              invisible.

              Filtered through `presentMemberIds`, which drops `disconnected`
              members. They stay in `room.members` during the host's grace period
              so the 2D list can grey them out, but a greyed-out row and a body
              occupying a chair are different claims — a seat is either taken or
              it is not. Without this filter a closed tab left an avatar sitting
              there for the full two minutes, or forever with no host present.
            */
            memberIds={theatreMemberIds}
            /*
              Names from the roster — the same source the sidebar reads. Without
              this the labels only learned a name when someone sent a chat
              message, and showed a slice of the raw user id until then.
            */
            memberNames={theatreMemberNames}
            /*
              Seat state, owned above this component so it survives the switch
              back to 2D — and so peers keep seeing you in your chair while you
              are there.
            */
            seatMap={seatMap}
            mySeat={mySeat}
            claimSeat={claimSeat}
            /*
              Where they were standing. Owned here so it outlives the scene, the
              same way the seat claim does.
            */
            stanceRef={stanceRef}
          />
        </div>
      ) : null}
    </Player.Root>
  );
}
