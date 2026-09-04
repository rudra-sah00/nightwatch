/**
 * PCM ↔ base64 conversion for the Nova Sonic audio transport.
 *
 * Nova Sonic speaks 16-bit little-endian LPCM: 16 kHz mono for input, 24 kHz
 * mono for output, base64-encoded over the socket.
 *
 * These are kept free of Web Audio and DOM types so they can be unit tested.
 */

/** Largest slice passed to `String.fromCharCode.apply` at once. */
const CHUNK_SIZE = 0x8000;

/**
 * Base64-encodes 16-bit PCM samples.
 *
 * Encoding byte-by-byte with `binary += String.fromCharCode(b)` builds a new
 * string on every byte, which is why this used to be a measurable cost on the
 * capture path (it ran on the main thread for every chunk). Applying
 * `fromCharCode` to whole slices keeps the work proportional to the number of
 * chunks instead of the number of bytes.
 */
export function pcmToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + CHUNK_SIZE) as unknown as number[],
    );
  }
  return btoa(binary);
}

/**
 * Decodes base64 16-bit PCM into normalised floats for Web Audio playback.
 *
 * Returns an empty array for input that is not whole 16-bit frames rather than
 * throwing, so one malformed chunk cannot tear down a live session.
 */
export function base64ToFloat32(base64: string): Float32Array {
  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    return new Float32Array(0);
  }

  // Two bytes per sample — an odd length means a truncated frame.
  if (binary.length % 2 !== 0) return new Float32Array(0);

  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    // Int16 range is asymmetric (-32768..32767); dividing by 32768 keeps the
    // result within [-1, 1) without clipping the negative extreme.
    float32[i] = int16[i] / 32768;
  }
  return float32;
}

/** Clamps and converts normalised floats to 16-bit PCM. */
export function float32ToPcm(input: Float32Array): Int16Array {
  const pcm = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const clamped = Math.max(-1, Math.min(1, input[i]));
    pcm[i] = clamped * 0x7fff;
  }
  return pcm;
}
