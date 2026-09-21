'use client';

import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Suspense, useCallback } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import type { RTMMessage } from '../../room/types/rtm-messages';
import { useTheatreAssets } from '../hooks/use-theatre-assets';
import { useTheatreNetwork } from '../hooks/use-theatre-network';
import type { Pose } from '../lib/interpolation';
import { ROOM, SPAWN, STANDING_EYE_HEIGHT } from '../lib/layout';
import { LocalPlayer } from './LocalPlayer';
import { RemoteAvatars } from './RemoteAvatar';
import { TheatreColliders } from './TheatreColliders';
import { TheatreRoom } from './TheatreRoom';
import { TheatreSeating } from './TheatreSeating';

interface TheatreSceneProps {
  userId: string;
  rtmSendMessage?: (msg: RTMMessage) => void;
  /** Screen-focused mode locks the camera instead of allowing free walking. */
  cinema?: boolean;
}

/**
 * Canvas root for 3D theatre mode.
 *
 * Asset URLs come from the backend manifest, so nothing renders until that
 * resolves. The auditorium is deliberately dark — the screen is the primary
 * light source (spec §4), so ambient is kept very low and the bulk of the
 * illumination will come from the screen driver once it lands.
 */
export function TheatreScene({
  userId,
  rtmSendMessage,
  cinema = false,
}: TheatreSceneProps) {
  const { data: assets, isLoading, error } = useTheatreAssets();

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
      {/* Very low ambient: just enough that unlit corners are not pure black. */}
      <ambientLight intensity={0.08} color="#2a2018" />

      {/* Placeholder for the screen's contribution until use-screen-light lands. */}
      <rectAreaLight
        position={[0, 2.084, 0.1]}
        width={7}
        height={2.93}
        intensity={3}
        color="#cfe0ff"
      />

      <Suspense fallback={null}>
        <TheatreRoom url={assets.models.room} />
        <TheatreSeating url={assets.models.chair} />
        <RemoteAvatars
          peerIds={peerIds}
          url={assets.models.avatar}
          sample={samplePeer}
        />
        {/*
          Physics is inside Suspense so colliders and the capsule only exist once
          the room has loaded — spawning the capsule first would drop it through
          a floor that has not arrived yet.

          Gravity is zero at the world level because the character controller
          integrates its own gravity; letting Rapier also apply it would double
          the fall rate.
        */}
        <Physics gravity={[0, 0, 0]} timeStep="vary">
          <TheatreColliders />
          <LocalPlayer enabled={!cinema} onPose={handlePose} />
        </Physics>
      </Suspense>

      <fog attach="fog" args={['#05060a', ROOM.maxZ, ROOM.maxZ + 8]} />
    </Canvas>
  );
}
