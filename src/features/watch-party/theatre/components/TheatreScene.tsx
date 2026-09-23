'use client';

import { PerformanceMonitor, Stats } from '@react-three/drei';
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
import { ACESFilmicToneMapping, MathUtils, SRGBColorSpace } from 'three';
import { usePlayerContext } from '@/features/watch/player/context/PlayerContext';
import type { RTMMessage } from '../../room/types/rtm-messages';
import { CAPSULE_CENTRE_TO_FEET } from '../hooks/use-avatar-controls';
import { useDanceMenu } from '../hooks/use-dance-menu';
import { useDanceSpace } from '../hooks/use-dance-space';
import { usePointerLook } from '../hooks/use-pointer-look';
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
  getSeat,
  ROOM,
  type SeatId,
  STANDING_EYE_HEIGHT,
  seatedAvatarPose,
  spawnFor,
} from '../lib/layout';
import type { StanceRef } from '../lib/stance';
import { useTheatreView } from '../lib/view-mode';
import { avatarModelForCharacter, avatarModels } from '../types';
import { DanceWheel } from './DanceWheel';
import { FrameLimiter } from './FrameLimiter';
import { LocalAvatar } from './LocalAvatar';
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
  /**
   * userId -> display name, from the party roster.
   *
   * Names used to come only from chat, so a member who never typed showed a
   * slice of their raw id above their head while the sidebar displayed their
   * name correctly. The roster is the same source the sidebar reads.
   */
  memberNames?: Record<string, string>;
  /**
   * Who is sitting where, owned by `WatchPartyVideoArea`.
   *
   * Deliberately not owned here. This component is unmounted whenever the view
   * mode returns to `2d`, and a seat claim has to outlive that — otherwise a
   * round trip through 2D loses your chair, leaves your old claim stuck on every
   * peer, and resumes with a stale picture of everyone else's seats. See
   * `use-seat-occupancy`.
   */
  seatMap: Record<string, string | null>;
  mySeat: SeatId | null;
  /** Take a seat, or stand up when passed null. */
  claimSeat: (seat: SeatId | null) => void;
  /**
   * Where this user was standing last time, owned by `WatchPartyVideoArea`.
   *
   * Read once per mount to place the body and the camera, and written every frame
   * while walking. Not owned here for the same reason the seat is not: this
   * component is destroyed on every switch back to 2D. See `lib/stance.ts`.
   */
  stanceRef: StanceRef;
}

/**
 * Resolution bounds for the adaptive dpr.
 *
 * `DPR_MAX` is the measured ceiling, not a guess — see the note where it is used.
 * `DPR_MIN` is deliberately below 1: on a Retina panel a 0.75 buffer is still
 * upscaled from more pixels than a non-Retina 1.0 and is far better than dropping
 * frames.
 */
/**
 * Whether to ask for MSAA.
 *
 * Off on high-density displays. MSAA resolves geometry edges by supersampling
 * them, and on a panel dense enough that one CSS pixel is already 2+ device
 * pixels, the edge it is smoothing is smaller than the eye can resolve — so it
 * costs bandwidth for a difference nobody sees. This is the long-standing Retina
 * finding in the three.js optimisation lists, not a guess.
 *
 * Kept ON for 1x displays, where an aliased edge is genuinely visible and the
 * buffer is small enough that MSAA is affordable.
 *
 * Read once at module scope because `gl` is consumed when the renderer is
 * constructed — changing it later would need a Canvas remount, which would drop
 * the WebGL context and every uploaded texture with it.
 */
const USE_MSAA =
  typeof window === 'undefined' ? true : window.devicePixelRatio < 2;

const DPR_MIN = 0.75;
const DPR_MAX = 1.5;

export function TheatreScene({
  userId,
  rtmSendMessage,
  cinema = false,
  memberIds = [],
  memberNames,
  seatMap,
  mySeat,
  claimSeat,
  stanceRef,
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

  const { peerIds, publishPose, samplePeer, peerCharacter } = useTheatreNetwork(
    {
      userId,
      rtmSendMessage,
      character,
      // The roster is the authority on who exists: peers missing from it are
      // despawned, so a departure lands in 3D whichever membership signal fired.
      memberIds,
      enabled: true,
    },
  );

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
  /**
   * This player's spawn slot, so the camera starts where their capsule does.
   *
   * Both used to read SPAWN directly, which put every client on the same square
   * metre — and avatars carry no colliders, so nothing separated them again.
   */
  const spawn = useMemo(() => spawnFor(userId), [userId]);

  /*
    Where this entry into 3D starts, in priority order:

      1. the seat this user holds — a claim outlives the scene, so if they were
         sitting when they left they are sitting when they come back, AT the seat
         rather than gliding to it from the rear platform;
      2. where they were standing last time (`stanceRef`);
      3. their spawn slot, which is only ever right the first time.

    `spawnFor` alone is what this used to be, and it is why walking to the front
    row, pressing `V` twice and coming back put you on the rear platform again —
    every time, which is the form of the bug that gets noticed.

    A mount-time snapshot on purpose, and in a ref rather than a memo with
    dependencies: it seeds the physics body and the camera, and re-reading a value
    that changes every frame would fight the character controller for ownership of
    the player's position.
  */
  const entryRef = useRef<{
    x: number;
    y: number;
    z: number;
    /** Radians, for the camera. The stance stores degrees, as the wire does. */
    yaw: number;
    /** Camera eye — the seat's anchor when seated, eye height when standing. */
    eye: { x: number; y: number; z: number };
  } | null>(null);
  if (entryRef.current === null) {
    const seat = mySeat ? getSeat(mySeat) : null;
    if (seat) {
      const body = seatedAvatarPose(seat.id);
      entryRef.current = {
        x: body.x,
        y: body.y,
        z: body.z,
        yaw: seat.view.yaw,
        eye: seat.eye,
      };
    } else {
      const remembered = stanceRef.current;
      const base = remembered ?? spawn;
      entryRef.current = {
        x: base.x,
        y: base.y,
        z: base.z,
        yaw: remembered ? MathUtils.degToRad(remembered.yaw) : 0,
        eye: { x: base.x, y: base.y + STANDING_EYE_HEIGHT, z: base.z },
      };
    }
  }
  const entry = entryRef.current;

  const [wheel, setWheel] = useState<{
    open: boolean;
    origin: { x: number; y: number };
    hovered: number | null;
  }>({ open: false, origin: { x: 0, y: 0 }, hovered: null });

  const handlePose = useCallback(
    (pose: Pose) => {
      publishPose(pose);
    },
    [publishPose],
  );

  /*
    Adaptive resolution, bounded ABOVE by the value that was already measured good.

    The scene is fragment-bound (~12,000 triangles, and 3 RectAreaLights which each
    cost several point lights per pixel), so cost scales almost purely with pixels
    shaded. 1.5 was not an arbitrary cap: dpr 2 on a Retina display renders 1.78x
    the pixels of 1.5, and 1.5 was chosen as the point where `antialias` still hides
    the difference.

    An earlier version of this mapped the monitor's factor onto 1..2, which allowed
    MORE pixels than that measured ceiling on any machine whose first few frames
    looked healthy — trading away a known-good setting for an unvalidated one. The
    range only goes down from 1.5 now: adaptivity is there to protect weak hardware,
    not to spend more on strong hardware than the look requires.
  */
  const [dpr, setDpr] = useState(DPR_MAX);

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
        dpr={dpr}
        camera={{
          // The seat's own eye anchor when seated, so a returning viewer opens
          // their eyes in the chair instead of on the rear platform.
          position: [entry.eye.x, entry.eye.y, entry.eye.z],
          // Facing matters as much as position on a re-entry: coming back turned
          // 180° from where you were looking is the same disorientation as being
          // moved. `usePointerLook` and `useSeatedCamera` both seed themselves
          // from the camera, so setting it here is enough.
          rotation: [0, entry.yaw, 0],
          fov: 60,
          near: 0.1,
          far: 100,
        }}
        gl={{ antialias: USE_MSAA, powerPreference: 'high-performance' }}
        /*
          The loop is driven by `FrameLimiter` below, not by r3f's own rAF.

          rAF is already vsync-locked, so this changes nothing on a 60 Hz display.
          It caps high-refresh ones: a 120 Hz ProMotion laptop was rendering twice
          the frames for a scene that looks identical at 60, and this scene is
          fragment-bound, so halving frames roughly halves GPU load. No quality is
          traded — the skipped frames were never distinguishable.

          `never` means nothing renders unless `advance` is called, so FrameLimiter
          must stay mounted as the first child. See its docblock.
        */
        frameloop="never"
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
          gl.outputColorSpace = SRGBColorSpace;
        }}
      >
        <FrameLimiter fps={60} />

        {/* Frame-rate readout, from drei's stats.js panel. This replaces a
            hand-rolled HUD: stats.js is the reference implementation, already
            samples inside the render loop, and one fewer bespoke component is one
            fewer thing to get the units wrong in — the custom probe read 0 fps for
            a while because it trusted a delta the loop was feeding it in the wrong
            unit. */}
        <Stats />

        {/* Adaptive resolution. Headless: it only reports, and `setDpr` applies.
            `factor` runs 0..1 as measured frames approach the refresh rate, mapped
            onto 1..2 so capable hardware gets MORE than the old fixed 1.5 and weak
            hardware drops below it. */}
        <PerformanceMonitor
          onChange={({ factor }) =>
            setDpr(
              Math.round((DPR_MIN + factor * (DPR_MAX - DPR_MIN)) * 100) / 100,
            )
          }
        />

        {/* The screen is the primary light source (see TheatreScreen); this rig
            is the house lighting around it — ceiling downlights, sconces, cove
            wash, step and exit glow, standing in for the 52 Blender fixtures
            that glTF cannot carry. It goes bright while walking and dims when
            you sit down or switch to screen focus. It also initialises
            RectAreaLight's lookup tables, without which both the coves here and
            the screen light emit nothing. */}
        <TheatreLighting seated={mySeat !== null} cinema={cinema} />

        <Suspense fallback={null}>
          <TheatreRoom />
          <TheatreSeating seatMap={seatMap} highlightedSeat={null} />
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
            urls={avatarModels(assets)}
            names={names}
            bubbles={bubbles}
          />
          <SceneInterior
            videoRef={videoRef}
            userId={userId}
            entry={entry}
            stanceRef={stanceRef}
            avatarUrl={resolveCharacterModel(character)}
            onTogglePlay={readOnly ? undefined : playerHandlers.togglePlay}
            seatMap={seatMap}
            mySeat={mySeat}
            claimSeat={claimSeat}
            cinema={cinema}
            onPose={handlePose}
            onWheelChange={setWheel}
          />
        </Suspense>

        <fog attach="fog" args={['#05060a', ROOM.maxZ, ROOM.maxZ + 8]} />
      </Canvas>

      <DanceWheel
        open={wheel.open}
        origin={wheel.origin}
        hovered={wheel.hovered}
      />
      <SitPrompt seatMap={seatMap} mySeat={mySeat} />
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
  entry,
  stanceRef,
  avatarUrl,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  onTogglePlay?: () => void;
  seatMap: Record<string, string | null>;
  mySeat: SeatId | null;
  claimSeat: (seat: SeatId | null) => void;
  cinema: boolean;
  /** Local user id, for the identity colour peers also see. */
  userId: string;
  /** Feet position and yaw this entry into 3D starts from. */
  entry: { x: number; y: number; z: number; yaw: number };
  /** Where the walking position is remembered, owned above this component. */
  stanceRef: StanceRef;
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
      /*
        Remember where we are standing, so the next entry into 3D resumes here
        rather than at the spawn slot. Written every frame on purpose: a mode
        switch can happen on any of them, and there is no event that says "the
        user is about to press V". It is a plain object assignment into a module
        variable — no state, no re-render.

        Only the WALKING position is recorded. While seated this callback does not
        run (the controller is switched off), which is correct: a seat is already
        remembered, by the claim.
      */
      stanceRef.current = {
        x: pose.x,
        y: pose.y,
        z: pose.z,
        yaw: pose.r,
      };
      publish(pose);
    },
    [publish, stanceRef],
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
    ---- put the body back on the pad when you stand ----

    The walk controller is switched off while sitting, so the capsule is still
    wherever it was when you sat down — and now that everyone is SEATED ON ENTRY
    (see `use-seat-occupancy`), for most people that is the spawn slot on the rear
    platform, which they have never walked away from. Standing up without this
    teleports you behind both rows, several metres from the chair you just left,
    which reads as the room throwing you out.

    The pad is the right target because it is the spot you stand on to sit: it is
    0.52 m in front of the chair, inside the standing band, and already proven
    reachable by `collision.test.ts`.

    Tracked against the PREVIOUS seat, because by the time this runs the claim is
    gone and only the seat you vacated says where to put you.
  */
  const lastSeat = useRef<SeatId | null>(mySeat);
  useEffect(() => {
    const previous = lastSeat.current;
    lastSeat.current = mySeat;
    if (mySeat !== null || previous === null) return;
    const body = playerBody.current;
    if (!body) return;
    const { pad } = getSeat(previous);
    // Rapier holds a capsule at its centre; the pad is a floor position.
    body.setTranslation(
      { x: pad.x, y: pad.y + CAPSULE_CENTRE_TO_FEET, z: pad.z },
      true,
    );
    body.setNextKinematicTranslation({
      x: pad.x,
      y: pad.y + CAPSULE_CENTRE_TO_FEET,
      z: pad.z,
    });
  }, [mySeat]);

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
          selfId={userId}
          start={entry}
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
