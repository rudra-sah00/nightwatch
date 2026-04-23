/**
 * Agora audio/video encoding presets for DM and group calls.
 * Matches the watch-party configuration for consistency.
 */

/**
 * Voice-optimized audio config.
 * - 48kHz sample rate for clarity
 * - Mono channel (stereo not needed for voice)
 * - Includes built-in AEC, ANS, and AGC
 * Ref: https://docs.agora.io/en/video-calling/enhance-call-quality/configure-audio-encoding
 */
export const CALL_AUDIO_ENCODER = 'music_standard' as const;

/**
 * Video config for call participant views.
 * - 480×360 @ 15fps — sufficient for call tiles
 * - bitrateMin prevents quality dropping too low on bad networks
 * Ref: https://docs.agora.io/en/video-calling/enhance-call-quality/configure-video-encoding
 */
export const CALL_VIDEO_ENCODER = {
  width: 480,
  height: 360,
  frameRate: 15,
  bitrateMin: 200,
  bitrateMax: 600,
} as const;

/**
 * Prioritize smooth video over sharpness.
 * Ref: https://docs.agora.io/en/video-calling/enhance-call-quality/video-transmission-optimization
 */
export const CALL_VIDEO_OPTIMIZATION = 'motion' as const;
