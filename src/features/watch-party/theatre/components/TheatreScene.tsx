'use client';

import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import type { RefObject } from 'react';
import { Suspense, useCallback, useEffect, useRef } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { usePlayerContext } from '@/features/watch/player/context/PlayerContext';
import type { RTMMessage } from '../../room/types/rtm-messages';
import { useDanceKeys } from '../hooks/use-dance-keys';
import { usePointerLook } from '../hooks/use-pointer-look';
import { useSeatOccupancy } from '../hooks/use-seat-occupancy';
import { useSeatedCamera } from '../hooks/use-seated-camera';
import { useSitInteraction } from '../hooks/use-sit-interaction';
import { useSpeechBubbles } from '../hooks/use-speech-bubbles';
import { useTheatreAssets } from '../hooks/use-theatre-assets';
import { useTheatreNetwork } from '../hooks/use-theatre-network';
import { useVideoTexture } from '../hooks/use-video-texture';
import { DANCE_CLIPS } from '../lib/animation';
import type { Pose } from '../lib/interpolation';
import {
  ROOM,
  type SeatId,
  SPAWN,
  STANDING_EYE_HEIGHT,
  seatedAvatarPose,
} from '../lib/layout';
import { useTheatreView } from '../lib/view-mode';
import { avatarModelForCharacter, avatarModels } from '../types';
import { LocalPlayer } from './LocalPlayer';
import { PassiveAvatars } from './PassiveAvatars';
import { RemoteAvatars } from './RemoteAvatar';
import { TheatreColliders } from './TheatreColliders';
import { TheatreLighting } from './TheatreLighting';
import { TheatreRoom } from './TheatreRoom';
import { TheatreScreen } from './TheatreScreen';
import { TheatreSeating } from './TheatreSeating';

interface TheatreSceneProps {
  userId: string;
  rtmSendMessage?: (msg: RTMMessage) => void;
  /** Screen-focused mode locks the camera instead of allowing free walking. */
  cinema?: boolean;
  /**
   * Every party member, including this user.
   *
   * Members who have not enabled 3D never broadcast a pose, so without this list
   * the room would look empty to the one person who did enable it. They are drawn
   * seated instead — see PassiveAvatars.
   */
  memberIds?: readonly string[];
}

export function TheatreScene({
  userId,
  rtmSendMessage,
  cinema = false,
  memberIds = [],
}: TheatreSceneProps) {
  const { data: assets, isLoading, error } = useTheatreAssets();
  const { bubbles, names } = useSpeechBubbles(true);

  // The party's existing <video>. Reused, never re-fetched — which is why the 3D
  // overlay keeps Player.Root mounted underneath. The REF is passed down, not
  // `ref.current`: a ref mutation does not re-render, so reading it here would
  // freeze whatever value existed at first paint (usually null) and the screen
  // would never receive a picture.
  const { videoRef, playerHandlers, readOnly } = usePlayerContext();

  // Only one character body is ever fetched — see avatarModelsFor.
  const character = useTheatreView((s) => s.character);

  const { seatMap, mySeat, claimSeat } = useSeatOccupancy({
    userId,
    rtmSendMessage,
    enabled: true,
  });

  const { peerIds, publishPose, samplePeer, peerCharacter } = useTheatreNetwork(
    {
      userId,
      rtmSendMessage,
      character,
      enabled: true,
    },
  );

  // Maps a peer's chosen body onto one of the already-loaded models.
  const resolveCharacterModel = useCallback(
    (c: 'man' | 'woman') =>
      assets ? avatarModelForCharacter(assets, c) : null,
    [assets],
  );

  const handlePose = useCallback(
    (pose: Pose) => {
      publishPose(pose);
    },
    [publishPose],
  );

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-sm text-neutral-400">
        Loading theatre…
      </div>
    );
  }

  if (error || !assets) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black text-sm text-red-400">
        Could not load theatre assets.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <Canvas
        dpr={[1, 2]}
        shadows
        camera={{
          position: [SPAWN.x, SPAWN.y + STANDING_EYE_HEIGHT, SPAWN.z],
          fov: 60,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
          gl.outputColorSpace = SRGBColorSpace;
        }}
      >
        {/* The screen is the primary light source (see TheatreScreen); this rig
            is the secondary fill that makes the room navigable and gives
            avatars a contact shadow. It also initialises RectAreaLight's
            lookup tables, without which the screen light emits nothing. */}
        <TheatreLighting />

        <Suspense fallback={null}>
          <TheatreRoom url={assets.models.room} />
          <TheatreSeating
            url={assets.models.chair}
            seatMap={seatMap}
            highlightedSeat={null}
          />
          <RemoteAvatars
            peerIds={peerIds}
            urls={avatarModels(assets)}
            characterOf={peerCharacter}
            resolve={resolveCharacterModel}
            sample={samplePeer}
            names={names}
            bubbles={bubbles}
          />
          {/*
            Party members who never turned 3D on. They broadcast nothing, so they
            are seated deterministically rather than left invisible. The instant
            one of them enables 3D their live pose arrives, they appear in
            peerIds, and this layer stops drawing them.
          */}
          <PassiveAvatars
            memberIds={memberIds}
            livePeerIds={peerIds}
            selfId={userId}
            seatMap={seatMap}
            url={resolveCharacterModel('man')}
            names={names}
            bubbles={bubbles}
          />
          <SceneInterior
            videoRef={videoRef}
            onTogglePlay={readOnly ? undefined : playerHandlers.togglePlay}
            seatMap={seatMap}
            mySeat={mySeat}
            claimSeat={claimSeat}
            cinema={cinema}
            onPose={handlePose}
          />
        </Suspense>

        <fog attach="fog" args={['#05060a', ROOM.maxZ, ROOM.maxZ + 8]} />
      </Canvas>

      <SitPrompt seatMap={seatMap} mySeat={mySeat} />
    </div>
  );
}

/**
 * Split out so the hooks that need R3F context (useFrame / useThree) sit inside
 * the Canvas. Calling them from TheatreScene would throw.
 */
function SceneInterior({
  videoRef,
  onTogglePlay,
  seatMap,
  mySeat,
  claimSeat,
  cinema,
  onPose,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  onTogglePlay?: () => void;
  seatMap: Record<string, string | null>;
  mySeat: ReturnType<typeof useSeatOccupancy>['mySeat'];
  claimSeat: ReturnType<typeof useSeatOccupancy>['claimSeat'];
  cinema: boolean;
  onPose: (p: Pose) => void;
}) {
  const lastPoseRef = useRef<Pose>({ x: 0, y: 0, z: 0, r: 0, s: 'idle' });
  const texture = useVideoTexture(videoRef);
  const { seated } = useSitInteraction({
    seatMap,
    mySeat,
    claimSeat,
    enabled: !cinema,
  });
  const { dance } = useDanceKeys(!cinema);

  // Mouse look. Gated on exactly the same condition as LocalPlayer so pointer
  // look and useSeatedCamera never both write camera rotation.
  const walking = !seated && !cinema;
  usePointerLook({ enabled: walking });

  /**
   * Override the animation state the walk controller derived.
   *
   * LocalPlayer only knows about locomotion, so without this a seated avatar
   * would broadcast 'idle' and stand up in its own chair on every peer's screen.
   * Sitting wins over dancing — you cannot do both.
   *
   * When seated the POSITION is overridden too, to the seat anchor. The walk
   * controller is switched off while sitting, so the last pose it produced is
   * wherever you were standing — the floor pad 0.52 m in front of the chair.
   * Sending that made remote viewers see you sitting in mid-air ahead of your
   * seat instead of in it.
   *
   * The dance INDEX goes out as well. Broadcasting only 'dance' left every peer
   * falling back to DANCE_CLIPS[0], so all three dances looked the same to
   * everyone except the person dancing.
   */
  const publish = useCallback(
    (pose: Pose) => {
      if (seated && mySeat) {
        const seat = seatedAvatarPose(mySeat as SeatId);
        onPose({ ...seat, s: 'sitIdle' });
        return;
      }
      const s = dance ? 'dance' : pose.s;
      const d =
        s === 'dance' && dance
          ? (() => {
              const i = DANCE_CLIPS.indexOf(dance);
              return i >= 0 ? i : undefined;
            })()
          : undefined;
      onPose({ ...pose, s, d });
    },
    [onPose, seated, mySeat, dance],
  );

  const recordAndPublish = useCallback(
    (pose: Pose) => {
      lastPoseRef.current = pose;
      publish(pose);
    },
    [publish],
  );

  /**
   * Seated and dancing avatars stop moving, so the dead band would suppress the
   * state change entirely. Nudge one send whenever the state flips and let the
   * heartbeat carry it from there.
   *
   * The pose is taken from the live ref rather than a zero vector — publishing
   * (0,0,0) would teleport the avatar to the room origin on every peer.
   */
  const onPoseRef = useRef(onPose);
  onPoseRef.current = onPose;
  useEffect(() => {
    if (seated && mySeat) {
      const seat = seatedAvatarPose(mySeat as SeatId);
      onPoseRef.current({ ...seat, s: 'sitIdle' });
      return;
    }
    const s = dance ? 'dance' : 'idle';
    const i = dance ? DANCE_CLIPS.indexOf(dance) : -1;
    onPoseRef.current({
      ...lastPoseRef.current,
      s,
      d: s === 'dance' && i >= 0 ? i : undefined,
    });
  }, [seated, mySeat, dance]);

  // Seated and cinema views drive the camera from the seat anchor; walking is
  // disabled in both so the two never fight over camera.position.
  useSeatedCamera({ seatId: mySeat, enabled: seated || cinema });

  return (
    <>
      <TheatreScreen texture={texture} onTogglePlay={onTogglePlay} />
      <Physics gravity={[0, 0, 0]} timeStep="vary">
        <TheatreColliders />
        <LocalPlayer enabled={walking} onPose={recordAndPublish} />
      </Physics>
    </>
  );
}

/** DOM overlay, outside the Canvas. */
function SitPrompt({
  seatMap,
  mySeat,
}: {
  seatMap: Record<string, string | null>;
  mySeat: string | null;
}) {
  const anyFree = Object.values(seatMap).some((v) => v === null);
  if (mySeat) {
    return (
      <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 rounded-md bg-black/70 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white/80">
        Press E to stand
      </div>
    );
  }
  if (!anyFree) return null;
  return (
    <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 rounded-md bg-black/50 px-3 py-1.5 text-xs font-medium tracking-wide text-white/50">
      Walk to a seat and press E to sit
    </div>
  );
}
