import { describe, expect, it } from 'vitest';
import {
  CALL_AUDIO_ENCODER,
  CALL_VIDEO_ENCODER,
  CALL_VIDEO_OPTIMIZATION,
} from '@/features/friends/call/call.config';

describe('call.config', () => {
  it('uses music_standard audio encoder for voice clarity', () => {
    expect(CALL_AUDIO_ENCODER).toBe('music_standard');
  });

  it('configures video at 480x360 resolution', () => {
    expect(CALL_VIDEO_ENCODER.width).toBe(480);
    expect(CALL_VIDEO_ENCODER.height).toBe(360);
  });

  it('limits video framerate to 15fps', () => {
    expect(CALL_VIDEO_ENCODER.frameRate).toBe(15);
  });

  it('sets video bitrate range', () => {
    expect(CALL_VIDEO_ENCODER.bitrateMin).toBe(200);
    expect(CALL_VIDEO_ENCODER.bitrateMax).toBe(600);
    expect(CALL_VIDEO_ENCODER.bitrateMin).toBeLessThan(
      CALL_VIDEO_ENCODER.bitrateMax,
    );
  });

  it('uses motion optimization for smooth video', () => {
    expect(CALL_VIDEO_OPTIMIZATION).toBe('motion');
  });
});
