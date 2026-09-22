'use client';

import { Canvas } from '@react-three/fiber';
import { Physics, type RapierRigidBody } from '@react-three/rapier';
import type { RefObject } from 'react';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { usePlayerContext } from '@/features/watch/player/context/PlayerContext';
import type { RTMMessage } from '../../room/types/rtm-messages';
import { useDanceMenu } from '../hooks/use-dance-menu';
import { useDanceSpace } from '../hooks/use-dance-space';
import { useGateInteraction } from '../hooks/use-gate-interaction';
import { usePointerLook } from '../hooks/use-pointer-look';
import { useSeatOccupancy } from '../hooks/use-seat-occupancy';
import { useSeatedCamera } from '../hooks/use-seated-camera';
import { useSitInteraction } from '../hooks/use-sit-interaction';
import { useSpeechBubbles } from '../hooks/use-speech-bubbles';
import { useTheatreAssets } from '../hooks/use-theatre-assets';
import { useTheatreNetwork } from '../hooks/use-theatre-network';
import { useVideoTexture } from '../hooks/use-video-texture';
import { DANCE_CLIPS } from '../lib/animation';
import { DANCE_CLEARANCE_M } from '../lib/dance-rules';
import type { Pose } from '../lib/interpolation';
import {
  ROOM,
  type SeatId,
  SPAWN,
  STANDING_EYE_HEIGHT,
  seatedAvatarPose,
} from '../lib/layout';
import { createStats } from '../lib/theatre-stats';
import { useTheatreView } from '../lib/view-mode';
import { avatarModelForCharacter, avatarModels } from '../types';
import { DanceWheel } from './DanceWheel';
import { LocalAvatar } from './LocalAvatar';
import { LocalPlayer } from './LocalPlayer';
import { PassiveAvatars } from './PassiveAvatars';
import { RemoteAvatars } from './RemoteAvatar';
import { TheatreCafe } from './TheatreCafe';
import { TheatreColliders } from './TheatreColliders';
import { TheatreLighting } from './TheatreLighting';
import { TheatreRoom } from './TheatreRoom';
import { TheatreScreen } from './TheatreScreen';
import { TheatreSeating } from './TheatreSeating';
import { StatsProbe, TheatreStatsHud } from './TheatreStatsHud';

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
  /**
   * userId -> display name, from the party roster.
   *
   * Names used to come only from chat, so a member who never typed showed a
   * slice of their raw id above their head while the sidebar displayed their
   * name correctly. The roster is the same source the sidebar reads.
   */
  memberNames?: Record<string, string>;
}

export function TheatreScene({
  userId,
  rtmSendMessage,
  cinema = false,
  memberIds = [],
  memberNames,
}: TheatreSceneProps) {
  const { data: assets, isLoading, error } = useTheatreAssets();
  const { bubbles, names: chatNames } = useSpeechBubbles(true);

  /**
   * Roster names win; chat names only fill gaps.
   *
   * A pose can arrive from someone the roster has not listed yet, and a chat
   * line is the only name we have for them until it does.
   */
  const names = useMemo(
    () => ({ ...chatNames, ...(memberNames ?? {}) }),
    [chatNames, memberNames],
  );

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

  const { peerIds, publishPose, samplePeer, peerCharacter, netStats } =
    useTheatreNetwork({
      userId,
      rtmSendMessage,
      character,
      // The roster is the authority on who exists: peers missing from it are
      // despawned, so a departure lands in 3D whichever membership signal fired.
      memberIds,
      enabled: true,
    });

  // Maps a peer's chosen body onto one of the already-loaded models.
  const resolveCharacterModel = useCallback(
    (c: 'man' | 'woman') =>
      assets ? avatarModelForCharacter(assets, c) : null,
    [assets],
  );

  /**
   * Live FPS / network readout.
   *
   * A ref, not state: the frame sampler writes every frame and the HUD polls it
   * at 5 Hz, so displaying the numbers never re-renders the scene.
   */
  /**
   * Dance wheel presentation, lifted out of SceneInterior.
   *
   * The wheel is a DOM overlay so it must render OUTSIDE the Canvas, but the
   * state that drives it depends on physics (clearance) and the seated camera,
   * both of which only exist inside. SceneInterior therefore reports upward.
   */
  const [wheel, setWheel] = useState<{
    open: boolean;
    origin: { x: number; y: number };
    hovered: number | null;
  }>({ open: false, origin: { x: 0, y: 0 }, hovered: null });

  /**
   * Whether the local player is standing at the cafe doors.
   *
   * Reported up from inside the Canvas for the same reason as the wheel: the
   * proximity test needs the live camera position, the prompt is DOM.
   */
  const [gateInRange, setGateInRange] = useState(false);

  const stats = useRef(createStats());
  useEffect(() => {
    const id = setInterval(() => {
      const n = netStats();
      stats.current.lastPacketAt = n.lastPacketAt;
      stats.current.packetHz = n.packetHz;
      stats.current.rttMs = n.rttMs;
      stats.current.peers = peerIds.length;
    }, 200);
    return () => clearInterval(id);
  }, [netStats, peerIds.length]);

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
        /*
          Capped at 1.5, not 2.

          The scene is fragment-bound, not geometry-bound: ~12,000 triangles lit by
          16 point and area lights, so cost scales with pixels shaded rather than
          with what is in the room. At dpr 2 a Retina display renders four times the
          pixels of a 1x buffer; 1.5 renders 2.25x, about 44% less work, and with
          `antialias` still on the difference is hard to see on a display that dense.
          This is the cheapest frame-time win available here and it costs no asset
          work.
        */
        dpr={[1, 1.5]}
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
            is the house lighting around it — ceiling downlights, sconces, cove
            wash, step and exit glow, standing in for the 52 Blender fixtures
            that glTF cannot carry. It goes bright while walking and dims when
            you sit down or switch to screen focus. It also initialises
            RectAreaLight's lookup tables, without which both the coves here and
            the screen light emit nothing. */}
        <TheatreLighting seated={mySeat !== null} cinema={cinema} />

        <Suspense fallback={null}>
          <RoomWithDoors
            url={assets.models.room}
            onGateRangeChange={setGateInRange}
          />
          {/* The cafe through the gate. Downloaded since 3D shipped but never
              mounted, which is why walking through the doors led into a dark
              void — there was no geometry there to light. */}
          <TheatreCafe url={assets.models.cafe} />
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
            userId={userId}
            avatarUrl={resolveCharacterModel('man')}
            onTogglePlay={readOnly ? undefined : playerHandlers.togglePlay}
            seatMap={seatMap}
            mySeat={mySeat}
            claimSeat={claimSeat}
            cinema={cinema}
            onPose={handlePose}
            onWheelChange={setWheel}
          />
        </Suspense>

        <StatsProbe stats={stats} />

        <fog attach="fog" args={['#05060a', ROOM.maxZ, ROOM.maxZ + 8]} />
      </Canvas>

      <DanceWheel
        open={wheel.open}
        origin={wheel.origin}
        hovered={wheel.hovered}
      />
      <TheatreStatsHud stats={stats} />
      <SitPrompt seatMap={seatMap} mySeat={mySeat} />
      {/* Standing at the doors takes precedence in the prompt: the seat prompt
          cannot be showing at the same time, because the gate is 1.3 m beyond
          the furthest seat pad's radius. */}
      {gateInRange && mySeat === null ? (
        <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 rounded-md bg-black/70 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white/80">
          Press E to open the cafe doors
        </div>
      ) : null}
    </div>
  );
}

/**
 * Publishes the clearance probe to code that lives outside `<Physics />`.
 *
 * `useRapier` throws unless it runs inside the Physics provider, and the dance
 * menu that needs the measurement is a keyboard/DOM concern that sits above it.
 * This component exists solely to bridge that: it renders nothing, sits inside
 * Physics, and writes its callbacks into refs the outer scene already holds.
 *
 * Calling `useDanceSpace` directly from the outer scene is what crashed the whole
 * watch party — react-three-rapier throws "useRapier must be used within
 * <Physics />" on mount, which took out the page rather than just the dance
 * feature.
 */
/**
 * The room, plus the cafe doors it contains.
 *
 * Exists only because `useGateInteraction` needs `useThree` to read the camera
 * position, and `TheatreScene` sits outside the Canvas — it renders it. The door
 * prompt is a DOM overlay outside the Canvas, so proximity is reported upwards
 * rather than rendered here.
 */
function RoomWithDoors({
  url,
  onGateRangeChange,
}: {
  url: string;
  onGateRangeChange: (inRange: boolean) => void;
}) {
  const gate = useGateInteraction(true);

  useEffect(() => {
    onGateRangeChange(gate.inRange);
  }, [gate.inRange, onGateRangeChange]);

  return <TheatreRoom url={url} gateProgress={gate.progress} />;
}

function DanceSpaceProbe({
  bodyRef,
  canDanceRef,
  clearanceRef,
}: {
  bodyRef: React.RefObject<RapierRigidBody | null>;
  canDanceRef: React.RefObject<(() => boolean) | null>;
  clearanceRef: React.RefObject<(() => number) | null>;
}) {
  const { canDanceHere, clearance } = useDanceSpace(bodyRef);
  useEffect(() => {
    canDanceRef.current = canDanceHere;
    clearanceRef.current = clearance;
    return () => {
      canDanceRef.current = null;
      clearanceRef.current = null;
    };
  }, [canDanceHere, clearance, canDanceRef, clearanceRef]);
  return null;
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
  onWheelChange,
  userId,
  avatarUrl,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  onTogglePlay?: () => void;
  seatMap: Record<string, string | null>;
  mySeat: ReturnType<typeof useSeatOccupancy>['mySeat'];
  claimSeat: ReturnType<typeof useSeatOccupancy>['claimSeat'];
  cinema: boolean;
  /** Local user id, for the identity colour peers also see. */
  userId: string;
  /** Local user's avatar glb, or null when the manifest has none. */
  avatarUrl: string | null;
  onPose: (p: Pose) => void;
  onWheelChange: (w: {
    open: boolean;
    origin: { x: number; y: number };
    hovered: number | null;
  }) => void;
}) {
  const lastPoseRef = useRef<Pose>({ x: 0, y: 0, z: 0, r: 0, s: 'idle' });
  const texture = useVideoTexture(videoRef);
  const { seated } = useSitInteraction({
    seatMap,
    mySeat,
    claimSeat,
    enabled: !cinema,
  });
  const walking = !seated && !cinema;

  // Clearance probe needs the player's collider, so the body ref is owned here
  // and handed to LocalPlayer rather than created inside it.
  const playerBody = useRef<RapierRigidBody>(null);
  // The probe must run inside <Physics />, so it is published into refs by
  // DanceSpaceProbe below rather than called here.
  const canDanceRef = useRef<(() => boolean) | null>(null);
  const clearanceRef = useRef<(() => number) | null>(null);
  // No probe yet means no physics world yet, so refuse rather than permit.
  const canDanceHere = useCallback(() => canDanceRef.current?.() ?? false, []);
  const clearance = useCallback(() => clearanceRef.current?.() ?? 0, []);

  const {
    open: wheelOpen,
    origin: wheelOrigin,
    hovered,
    dance,
  } = useDanceMenu({
    enabled: !cinema,
    seated,
    canDanceHere,
    onRefused: (reason) => {
      if (reason === 'seated') {
        toast.info('Stand up to dance', {
          description: 'Press E to leave your seat first.',
        });
        return;
      }
      const room = clearance();
      toast.info('Not enough room to dance', {
        description: Number.isFinite(room)
          ? `You need ${DANCE_CLEARANCE_M.toFixed(1)} m of clear space — there is ${room.toFixed(1)} m here. Try the aisle or the rear platform.`
          : 'Move somewhere more open, like the aisle or the rear platform.',
      });
    },
  });

  // Mouse look. Off while the wheel is open: a locked pointer reports only
  // relative movement and shows no cursor, so there would be nothing to aim at.
  // Toggling this releases and re-acquires the lock for us.
  usePointerLook({ enabled: walking && !wheelOpen });

  // Hand the wheel's presentation state to the DOM layer above the Canvas.
  useEffect(() => {
    onWheelChange({ open: wheelOpen, origin: wheelOrigin, hovered });
  }, [wheelOpen, wheelOrigin, hovered, onWheelChange]);

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

  /*
    How far the dance camera has pulled back, mirrored into state so the local
    avatar can be revealed.

    Kept as state rather than a ref because `LocalAvatar` has to re-render to
    become visible, and `LocalPlayer` only reports it when it changes by more
    than a centimetre — so this settles within the glide and then stops, instead
    of setting state every frame.
  */
  const [cameraDistance, setCameraDistance] = useState(0);
  const danceIndex = dance ? DANCE_CLIPS.indexOf(dance) : -1;

  return (
    <>
      <TheatreScreen texture={texture} onTogglePlay={onTogglePlay} />
      <Physics gravity={[0, 0, 0]} timeStep="vary">
        <TheatreColliders />
        <DanceSpaceProbe
          bodyRef={playerBody}
          canDanceRef={canDanceRef}
          clearanceRef={clearanceRef}
        />
        <LocalPlayer
          enabled={walking}
          onPose={recordAndPublish}
          bodyRef={playerBody}
          dancing={Boolean(dance) && walking}
          onCameraDistance={setCameraDistance}
        />
        {/* Only mounted while the camera is off the head — there is nothing to
            see in first person, and this is a full skinned character. */}
        {cameraDistance > 0.05 && avatarUrl ? (
          <LocalAvatar
            url={avatarUrl}
            selfId={userId}
            body={playerBody}
            danceIndex={danceIndex >= 0 ? danceIndex : null}
            cameraDistance={cameraDistance}
          />
        ) : null}
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
