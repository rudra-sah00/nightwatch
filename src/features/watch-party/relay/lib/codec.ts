/**
 * Binary wire codec for the watch-party relay's high-rate channel.
 *
 * ---- WHY THIS FILE HAS NO IMPORTS ----
 *
 * A BYTE-IDENTICAL copy of this file lives in the other repository — frontend at
 * `src/features/watch-party/relay/lib/codec.ts`, backend at `src/relay/codec.ts`.
 * The two MUST agree exactly: a skew between them does not fail loudly, it renders
 * avatars in slightly wrong places, which is a miserable bug to trace back to a
 * serialisation mismatch. Keeping the module self-contained means the copies can be
 * compared by hash, and `codec-checksum.test.ts` in each repo pins that hash — so
 * changing one without the other fails CI rather than production.
 *
 * Nothing in this file may reference a repo-specific path, or the hashes diverge.
 *
 * So no import from `layout.ts` or `animation.ts`, even though both are tempting.
 * Instead:
 *
 *  - `AVATAR_STATE_WIRE` restates the state list, and a test asserts it matches
 *    `AvatarState` in `animation.ts` so the two cannot drift.
 *  - Clamping is to the RANGE THE FORMAT CAN REPRESENT, not to room bounds. Room
 *    geometry is a scene concern; the codec's job is to never wrap a value silently.
 *    A test asserts the room's real bounds sit comfortably inside what the format
 *    holds.
 *
 * ---- WHY BINARY, GIVEN WE NO LONGER PAY PER MESSAGE ----
 *
 * Three reasons survive the move off Agora's per-message billing. The tick stamp in
 * a batch is the shared timeline that fixes the interpolation clock bug by
 * construction; one batch instead of seven messages is seven times less envelope,
 * parse and dispatch work on a main thread already running HLS decode and WebGL; and
 * it bounds server work to one write per client per tick however many people move.
 *
 * @packageDocumentation
 */

/* ────────────────────────────── frame types ────────────────────────────── */

/** Client → relay: one avatar pose. */
export const FRAME_POSE = 0x01;
/** Client → relay: one sketch cursor position. */
export const FRAME_CURSOR = 0x02;
/** Relay → client: every pose that changed this tick. */
export const FRAME_POSE_BATCH = 0x81;

/** Byte lengths, exported so both ends can size buffers without recomputing. */
export const POSE_UPLINK_BYTES = 10;
export const CURSOR_UPLINK_BYTES = 7;
export const BATCH_HEADER_BYTES = 7;
export const POSE_RECORD_BYTES = 8;

/**
 * Animation states, in WIRE ORDER.
 *
 * **Append, never reorder or insert.** The index is what travels, exactly as
 * `DANCE_CLIPS` in `animation.ts` documents for the dance index. Reordering changes
 * what every already-running client renders. An unknown index decodes to `idle`
 * rather than throwing, so a newer sender degrades to a still avatar on an older
 * client instead of breaking it.
 *
 * Three bits, so there is room for eight states. `animation.ts` defines six.
 */
export const AVATAR_STATE_WIRE = [
  'idle',
  'walk',
  'sitDown',
  'sitIdle',
  'standUp',
  'dance',
] as const;

export type WireAvatarState = (typeof AVATAR_STATE_WIRE)[number];

/** Three bits for the dance index, so eight clips fit. `DANCE_CLIPS` has five. */
const STATE_MASK = 0x07;
const DANCE_SHIFT = 3;
const DANCE_MASK = 0x07;

/* ────────────────────────────── shapes ────────────────────────────── */

/**
 * Anything a decoder accepts.
 *
 * Aliased rather than written out at each call site so every decoder signature fits
 * on one line under 80 columns. That matters beyond neatness: the frontend formats at
 * 80 and the backend at 100, and a signature that SPLITS at 80 would be JOINED at
 * 100, so the two copies of this file could not stay byte-identical. Keeping every
 * construct comfortably inside the narrower limit makes the file a fixed point under
 * both configurations.
 */
export type Bytes = ArrayBufferView | ArrayBuffer;

/** A pose as the scene thinks of it: metres and degrees. */
export interface WirePose {
  /** metres */
  x: number;
  /** metres, height above the front floor */
  y: number;
  /** metres */
  z: number;
  /** yaw, degrees */
  r: number;
  /** animation state */
  s: string;
  /** dance index, only meaningful when `s` is 'dance' */
  d?: number;
}

/** A decoded pose plus the slot it belongs to. */
export interface WirePoseRecord extends WirePose {
  slot: number;
}

/** A decoded uplink pose frame. */
export interface DecodedPoseUplink {
  seq: number;
  pose: WirePose;
}

/** A decoded uplink cursor frame. Coordinates are normalised 0..1. */
export interface DecodedCursorUplink {
  seq: number;
  x: number;
  y: number;
}

/**
 * One tick's worth of movement, as `encodePoseBatch` takes it.
 *
 * An options object rather than three positional parameters, because a MULTI-LINE
 * parameter list cannot be formatted identically in both repositories: the frontend's
 * `trailingCommas: "all"` requires a trailing comma and the backend's `"es5"` forbids
 * one. Keeping the signature to a single short line sidesteps that permanently, and
 * named arguments read better at the call site.
 */
export interface PoseBatch {
  /** Server time, ms since the room epoch. The shared timeline. */
  tick: number;
  /** Roster generation the slot indices are valid against. */
  rosterGen: number;
  poses: readonly WirePoseRecord[];
}

/** A decoded downlink batch. */
export interface DecodedPoseBatch {
  /** Server time, ms since the room epoch. The shared timeline. */
  tick: number;
  /** Roster generation these slot indices are valid against. */
  rosterGen: number;
  poses: WirePoseRecord[];
}

/* ────────────────────────────── helpers ────────────────────────────── */

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return value < min ? min : value > max ? max : value;
}

/** Metres → centimetres as int16. Clamps rather than wrapping; a wrap teleports. */
function metresToI16Cm(metres: number): number {
  return clamp(Math.round(metres * 100), -32768, 32767);
}

/** Metres → centimetres as uint8. Every walkable surface is under 0.66 m. */
function metresToU8Cm(metres: number): number {
  return clamp(Math.round(metres * 100), 0, 255);
}

/**
 * Degrees → one byte. 1.40625° per step.
 *
 * Finer than `THEATRE_NET.ROTATION_EPSILON` (2°), so this quantisation can never
 * produce a visible step the dead band would not already have swallowed.
 */
function degreesToU8(degrees: number): number {
  const wrapped = ((degrees % 360) + 360) % 360;
  return Math.round((wrapped * 256) / 360) & 0xff;
}

function u8ToDegrees(byte: number): number {
  return (byte * 360) / 256;
}

/** Pack the animation state and dance index into one byte. */
export function packState(state: string, dance?: number): number {
  const stateIndex = AVATAR_STATE_WIRE.indexOf(state as WireAvatarState);
  const safeState = stateIndex < 0 ? 0 : stateIndex;
  const hasDance = typeof dance === 'number' && dance >= 0;
  const safeDance = hasDance ? dance & DANCE_MASK : 0;
  return (safeState & STATE_MASK) | (safeDance << DANCE_SHIFT);
}

/** Unpack a state byte. An unknown state index degrades to 'idle'. */
export function unpackState(byte: number): { s: WireAvatarState; d?: number } {
  const stateIndex = byte & STATE_MASK;
  const s = AVATAR_STATE_WIRE[stateIndex] ?? 'idle';
  // The dance index is only meaningful for 'dance'. Carrying it otherwise would make
  // `exceedsDeadBand` see a change on a field nothing renders.
  if (s !== 'dance') {
    return { s };
  }
  return { s, d: (byte >> DANCE_SHIFT) & DANCE_MASK };
}

/**
 * Is `seq` newer than `last`, accounting for uint16 wraparound?
 *
 * The standard sequence-comparison rule: treat the difference as signed over half
 * the space. Equality is NOT newer — a repeated sequence number is a duplicate, and
 * accepting it would let a retransmitted frame overwrite a fresher one.
 */
export function isNewerSeq(seq: number, last: number): boolean {
  const delta = (seq - last) & 0xffff;
  return delta !== 0 && delta < 0x8000;
}

/* ────────────────────────────── encode ────────────────────────────── */

/** Encode a client's own pose. 10 bytes. */
export function encodePose(seq: number, pose: WirePose): Uint8Array {
  const buffer = new ArrayBuffer(POSE_UPLINK_BYTES);
  const view = new DataView(buffer);
  view.setUint8(0, FRAME_POSE);
  view.setUint16(1, seq & 0xffff, true);
  view.setInt16(3, metresToI16Cm(pose.x), true);
  view.setInt16(5, metresToI16Cm(pose.z), true);
  view.setUint8(7, metresToU8Cm(pose.y));
  view.setUint8(8, degreesToU8(pose.r));
  view.setUint8(9, packState(pose.s, pose.d));
  return new Uint8Array(buffer);
}

/**
 * Encode a sketch cursor. 7 bytes.
 *
 * `x` and `y` are NORMALISED 0..1, not pixels. `use-sketch-overlay.ts` currently
 * sends raw Konva stage coordinates, which is a bug independent of this transport:
 * two clients with different window sizes draw each other's cursors in the wrong
 * place. Normalising is required at the send site before calling this.
 */
export function encodeCursor(seq: number, x: number, y: number): Uint8Array {
  const buffer = new ArrayBuffer(CURSOR_UPLINK_BYTES);
  const view = new DataView(buffer);
  view.setUint8(0, FRAME_CURSOR);
  view.setUint16(1, seq & 0xffff, true);
  view.setUint16(3, Math.round(clamp(x, 0, 1) * 65535), true);
  view.setUint16(5, Math.round(clamp(y, 0, 1) * 65535), true);
  return new Uint8Array(buffer);
}

/**
 * Encode one tick's worth of movement for one recipient.
 *
 * `tick` is the relay's own clock, identical for every pose in the batch and for
 * every recipient of it. That single fact is what removes the clock-skew bug: today
 * senders stamp `Date.now()` and receivers compare against their own `Date.now()`,
 * so the interpolation window is `INTERP_DELAY_MS ± skew`.
 */
export function encodePoseBatch(batch: PoseBatch): Uint8Array {
  const { tick, rosterGen, poses } = batch;
  const count = Math.min(poses.length, 255);
  const size = BATCH_HEADER_BYTES + count * POSE_RECORD_BYTES;
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  view.setUint8(0, FRAME_POSE_BATCH);
  view.setUint32(1, tick >>> 0, true);
  view.setUint8(5, rosterGen & 0xff);
  view.setUint8(6, count);

  for (let i = 0; i < count; i += 1) {
    const pose = poses[i];
    const at = BATCH_HEADER_BYTES + i * POSE_RECORD_BYTES;
    view.setUint8(at, pose.slot & 0xff);
    view.setInt16(at + 1, metresToI16Cm(pose.x), true);
    view.setInt16(at + 3, metresToI16Cm(pose.z), true);
    view.setUint8(at + 5, metresToU8Cm(pose.y));
    view.setUint8(at + 6, degreesToU8(pose.r));
    view.setUint8(at + 7, packState(pose.s, pose.d));
  }

  return new Uint8Array(buffer);
}

/* ────────────────────────────── decode ────────────────────────────── */

/**
 * Every decoder returns null rather than throwing.
 *
 * These parse bytes off a network, so malformed input is an expected condition, not
 * an exception. A throw inside a Socket.IO event handler on the relay would be an
 * unhandled rejection that a hostile or buggy client could trigger at will.
 */
function viewOf(data: Bytes): DataView {
  if (data instanceof ArrayBuffer) {
    return new DataView(data);
  }
  return new DataView(data.buffer, data.byteOffset, data.byteLength);
}

export function decodePose(data: Bytes): DecodedPoseUplink | null {
  const view = viewOf(data);
  if (view.byteLength !== POSE_UPLINK_BYTES) {
    return null;
  }
  if (view.getUint8(0) !== FRAME_POSE) {
    return null;
  }

  const { s, d } = unpackState(view.getUint8(9));
  return {
    seq: view.getUint16(1, true),
    pose: {
      x: view.getInt16(3, true) / 100,
      z: view.getInt16(5, true) / 100,
      y: view.getUint8(7) / 100,
      r: u8ToDegrees(view.getUint8(8)),
      s,
      d,
    },
  };
}

export function decodeCursor(data: Bytes): DecodedCursorUplink | null {
  const view = viewOf(data);
  if (view.byteLength !== CURSOR_UPLINK_BYTES) {
    return null;
  }
  if (view.getUint8(0) !== FRAME_CURSOR) {
    return null;
  }
  return {
    seq: view.getUint16(1, true),
    x: view.getUint16(3, true) / 65535,
    y: view.getUint16(5, true) / 65535,
  };
}

export function decodePoseBatch(data: Bytes): DecodedPoseBatch | null {
  const view = viewOf(data);
  if (view.byteLength < BATCH_HEADER_BYTES) {
    return null;
  }
  if (view.getUint8(0) !== FRAME_POSE_BATCH) {
    return null;
  }

  const count = view.getUint8(6);
  // A truncated batch is rejected whole rather than partially applied: a half-read
  // record would place an avatar at a decoded-from-garbage position.
  if (view.byteLength !== BATCH_HEADER_BYTES + count * POSE_RECORD_BYTES) {
    return null;
  }

  const poses: WirePoseRecord[] = [];
  for (let i = 0; i < count; i += 1) {
    const at = BATCH_HEADER_BYTES + i * POSE_RECORD_BYTES;
    const { s, d } = unpackState(view.getUint8(at + 7));
    poses.push({
      slot: view.getUint8(at),
      x: view.getInt16(at + 1, true) / 100,
      z: view.getInt16(at + 3, true) / 100,
      y: view.getUint8(at + 5) / 100,
      r: u8ToDegrees(view.getUint8(at + 6)),
      s,
      d,
    });
  }

  return {
    tick: view.getUint32(1, true),
    rosterGen: view.getUint8(5),
    poses,
  };
}

/** Which frame type a buffer claims to be, or null if it is too short to say. */
export function frameType(data: Bytes): number | null {
  const view = viewOf(data);
  return view.byteLength === 0 ? null : view.getUint8(0);
}
