import { describe, expect, it } from 'vitest';
import {
  base64ToFloat32,
  float32ToPcm,
  pcmToBase64,
} from '@/features/ask-ai/lib/pcm';

describe('pcmToBase64 / base64ToFloat32 round trip', () => {
  it('preserves sample values within Int16 precision', () => {
    const original = new Float32Array([0, 0.5, -0.5, 0.25, -0.25, 1, -1]);
    const decoded = base64ToFloat32(pcmToBase64(float32ToPcm(original)));

    expect(decoded).toHaveLength(original.length);
    for (let i = 0; i < original.length; i++) {
      // Int16 quantisation gives ~3e-5 of headroom.
      expect(decoded[i]).toBeCloseTo(original[i], 3);
    }
  });

  it('handles a chunk larger than the fromCharCode slice size', () => {
    // 0x8000 bytes = 16384 samples, so this crosses the chunk boundary.
    const samples = new Int16Array(20000);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = (i % 1000) - 500;
    }
    const decoded = base64ToFloat32(pcmToBase64(samples));
    expect(decoded).toHaveLength(samples.length);
    expect(decoded[0]).toBeCloseTo(-500 / 32768, 6);
    expect(decoded[19999]).toBeCloseTo(((19999 % 1000) - 500) / 32768, 6);
  });

  it('encodes an empty buffer without throwing', () => {
    expect(pcmToBase64(new Int16Array(0))).toBe('');
  });
});

describe('float32ToPcm', () => {
  it('clamps values outside [-1, 1]', () => {
    const pcm = float32ToPcm(new Float32Array([2, -2]));
    expect(pcm[0]).toBe(0x7fff);
    expect(pcm[1]).toBe(-0x7fff);
  });
});

describe('base64ToFloat32 — malformed input', () => {
  it('returns empty for non-base64 rather than throwing', () => {
    expect(base64ToFloat32('!!!not base64!!!')).toHaveLength(0);
  });

  it('returns empty for a truncated 16-bit frame', () => {
    // Three bytes cannot be whole 16-bit samples.
    const odd = btoa('abc');
    expect(base64ToFloat32(odd)).toHaveLength(0);
  });

  it('returns empty for an empty string', () => {
    expect(base64ToFloat32('')).toHaveLength(0);
  });
});
