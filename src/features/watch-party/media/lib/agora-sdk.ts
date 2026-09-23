/**
 * Agora RTC SDK loading and encoder presets.
 *
 * The SDK is ~400 KB, so it is imported dynamically and memoised: a watch party
 * that never opens voice or video should not pay for it, and a party that does
 * should pay once. Extracted from `useAgora.ts` so the module singleton and its
 * test seam are not buried inside a 900-line file.
 *
 * @packageDocumentation
 */

// Set log level: 0 (DEBUG), 1 (INFO), 2 (WARNING), 3 (ERROR), 4 (NONE)
// Production must remain silent for Agora RTC logs.
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const AGORA_LOG_LEVEL = IS_PRODUCTION
  ? 4
  : process.env.NEXT_PUBLIC_AGORA_DEBUG === 'true'
    ? 0
    : 2;

/** Lazily resolved Agora SDK default export. */
let _AgoraRTC: typeof import('agora-rtc-sdk-ng').default | null = null;

/**
 * The Agora RTC SDK, loaded on first use.
 *
 * @returns The SDK default export, with the log level already applied.
 */
export async function getAgoraRTC() {
  if (!_AgoraRTC) {
    const mod = await import('agora-rtc-sdk-ng');
    _AgoraRTC = mod.default;
    _AgoraRTC.setLogLevel(AGORA_LOG_LEVEL);
  }
  return _AgoraRTC;
}

/** @internal Reset/inject for testing. */
export function resetAgoraState(
  mock?: typeof import('agora-rtc-sdk-ng').default,
) {
  _AgoraRTC = mock ?? null;
}

/**
 * Voice-optimized audio config for watch party chat.
 * - 48kHz sample rate for clarity
 * - Mono channel (stereo not needed for voice)
 * - 40kbps bitrate — efficient bandwidth while maintaining quality
 * Ref: https://docs.agora.io/en/video-calling/enhance-call-quality/configure-audio-encoding
 */
export const AUDIO_ENCODER_CONFIG = 'music_standard' as const;

/**
 * Video config sized for sidebar tile rendering (small tiles).
 * - 480×360 @ 15fps — sufficient for sidebar participant views
 * - motion optimization → prioritize smoothness over clarity
 * - bitrateMin prevents quality dropping too low on bad networks
 * Ref: https://docs.agora.io/en/video-calling/enhance-call-quality/configure-video-encoding
 */
export const VIDEO_ENCODER_CONFIG = {
  width: 480,
  height: 360,
  frameRate: 15,
  bitrateMin: 200,
  bitrateMax: 600,
} as const;

/**
 * Prioritize smooth video for watch party sidebar tiles.
 * Ref: https://docs.agora.io/en/video-calling/enhance-call-quality/video-transmission-optimization
 */
export const VIDEO_OPTIMIZATION_MODE = 'motion' as const;
