import { describe, expect, it } from 'vitest';
import {
  duckMediaElements,
  formatDuration,
} from '@/features/friends/call/call.utils';

describe('call.utils', () => {
  describe('formatDuration', () => {
    it('formats 0 seconds', () => {
      expect(formatDuration(0)).toBe('0:00');
    });

    it('formats seconds under a minute', () => {
      expect(formatDuration(5)).toBe('0:05');
      expect(formatDuration(45)).toBe('0:45');
    });

    it('formats exact minutes', () => {
      expect(formatDuration(60)).toBe('1:00');
      expect(formatDuration(300)).toBe('5:00');
    });

    it('formats minutes and seconds', () => {
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(125)).toBe('2:05');
    });

    it('formats large durations', () => {
      expect(formatDuration(3661)).toBe('61:01');
    });

    it('pads single-digit seconds', () => {
      expect(formatDuration(61)).toBe('1:01');
      expect(formatDuration(9)).toBe('0:09');
    });
  });

  describe('duckMediaElements', () => {
    it('reduces volume of media elements and restores on cleanup', () => {
      const audio = document.createElement('audio');
      audio.volume = 1.0;
      document.body.appendChild(audio);

      const restore = duckMediaElements(0.2);
      expect(audio.volume).toBeCloseTo(0.2);

      restore();
      expect(audio.volume).toBeCloseTo(1.0);

      document.body.removeChild(audio);
    });

    it('clamps volume to 0 minimum', () => {
      const audio = document.createElement('audio');
      audio.volume = 0.01;
      document.body.appendChild(audio);

      const restore = duckMediaElements(0.1);
      expect(audio.volume).toBeGreaterThanOrEqual(0);

      restore();
      document.body.removeChild(audio);
    });

    it('handles no media elements gracefully', () => {
      const restore = duckMediaElements(0.5);
      expect(() => restore()).not.toThrow();
    });
  });
});
