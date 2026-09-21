'use client';

import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense, useCallback, useEffect, useRef } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { usePlayerContext } from '@/features/watch/player/context/PlayerContext';
import type { RTMMessage } from '../../room/types/rtm-messages';
import { useDanceKeys } from '../hooks/use-dance-keys';
import { useSeatOccupancy } from '../hooks/use-seat-occupancy';
import { useSeatedCamera } from '../hooks/use-seated-camera';
import { useSitInteraction } from '../hooks/use-sit-interaction';
import { useSpeechBubbles } from '../hooks/use-speech-bubbles';
import { useTheatreAssets } from '../hooks/use-theatre-assets';
import { useTheatreNetwork } from '../hooks/use-theatre-network';
import { useVideoTexture } from '../hooks/use-video-texture';
import type { Pose } from '../lib/interpolation';
import { ROOM, SPAWN, STANDING_EYE_HEIGHT } from '../lib/layout';
import { LocalPlayer } from './LocalPlayer';
import { RemoteAvatars } from './RemoteAvatar';
import { TheatreColliders } from './TheatreColliders';
import { TheatreRoom } from './TheatreRoom';
import { TheatreScreen } from './TheatreScreen';
import { TheatreSeating } from './TheatreSeating';

interface TheatreSceneProps {
  userId: string;
  rtmSendMessage?: (msg: RTMMessage) => void;
  /** Screen-focused mode locks the camera instead of allowing free walking. */
  cinema?: boolean;
}

export function TheatreScene({
  userId,
  rtmSendMessage,
  cinema = false,
}: TheatreSceneProps) {
  const { data: assets, isLoading, error } = useTheatreAssets();
  const { bubbles, names } = useSpeechBubbles(true);

  // The party's existing <video>. Reused, never re-fetched — which is why the 3D
  // overlay keeps Player.Root mounted underneath.
  const { videoRef } = usePlayerContext();

  const { seatMap, mySeat, claimSeat } = useSeatOccupancy({
    userId,
    rtmSendMessage,
    enabled: true,
  });

  const { peerIds, publishPose, samplePeer } = useTheatreNetwork({
    userId,
    rtmSendMessage,
    enabled: true,
  });

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
        {/* Very low ambient. The screen is the primary light source, so the
            rest of the room is lit by TheatreScreen's screen-driven light. */}
        <ambientLight intensity={0.08} color="#2a2018" />

        <Suspense fallback={null}>
          <TheatreRoom url={assets.models.room} />
          <TheatreSeating
            url={assets.models.chair}
            seatMap={seatMap}
            highlightedSeat={null}
          />
          <RemoteAvatars
            peerIds={peerIds}
            url={assets.models.avatar}
            sample={samplePeer}
            names={names}
            bubbles={bubbles}
          />
          <SceneInterior
            video={videoRef.current}
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
  video,
  seatMap,
  mySeat,
  claimSeat,
  cinema,
  onPose,
}: {
  video: HTMLVideoElement | null;
  seatMap: Record<string, string | null>;
  mySeat: ReturnType<typeof useSeatOccupancy>['mySeat'];
  claimSeat: ReturnType<typeof useSeatOccupancy>['claimSeat'];
  cinema: boolean;
  onPose: (p: Pose) => void;
}) {
  const lastPoseRef = useRef<Pose>({ x: 0, y: 0, z: 0, r: 0, s: 'idle' });
  const texture = useVideoTexture(video);
  const { seated } = useSitInteraction({
    seatMap,
    mySeat,
    claimSeat,
    enabled: !cinema,
  });
  const { dance } = useDanceKeys(!cinema);

  /**
   * Override the animation state the walk controller derived.
   *
   * LocalPlayer only knows about locomotion, so without this a seated avatar
   * would broadcast 'idle' and stand up in its own chair on every peer's screen.
   * Sitting wins over dancing — you cannot do both.
   */
  const publish = useCallback(
    (pose: Pose) => {
      const s = seated ? 'sitIdle' : dance ? 'dance' : pose.s;
      onPose({ ...pose, s });
    },
    [onPose, seated, dance],
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
    const s = seated ? 'sitIdle' : dance ? 'dance' : 'idle';
    onPoseRef.current({ ...lastPoseRef.current, s });
  }, [seated, dance]);

  // Seated and cinema views drive the camera from the seat anchor; walking is
  // disabled in both so the two never fight over camera.position.
  useSeatedCamera({ seatId: mySeat, enabled: seated || cinema });

  return (
    <>
      <TheatreScreen texture={texture} />
      <Physics gravity={[0, 0, 0]} timeStep="vary">
        <TheatreColliders />
        <LocalPlayer enabled={!seated && !cinema} onPose={recordAndPublish} />
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
