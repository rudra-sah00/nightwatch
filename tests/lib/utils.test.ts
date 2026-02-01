import { describe, expect, it } from 'vitest';
import { cn, delay, formatDuration, truncate } from '@/lib/utils';

describe('Utils', () => {
  describe('cn', () => {
    it('should merge class names', () => {
      const result = cn('foo', 'bar');
      expect(result).toBe('foo bar');
    });

    it('should handle conditional classes', () => {
      const result = cn('foo', false && 'bar', 'baz');
      expect(result).toBe('foo baz');
    });

    it('should merge Tailwind classes correctly', () => {
      const result = cn('px-2 py-1', 'px-4');
      expect(result).toBe('py-1 px-4');
    });

    it('should handle empty inputs', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle undefined and null', () => {
      const result = cn('foo', undefined, null, 'bar');
      expect(result).toBe('foo bar');
    });

    it('should handle arrays', () => {
      const result = cn(['foo', 'bar'], 'baz');
      expect(result).toBe('foo bar baz');
    });

    it('should handle objects', () => {
      const result = cn({ foo: true, bar: false, baz: true });
      expect(result).toBe('foo baz');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatDuration(45)).toBe('0:45');
      expect(formatDuration(90)).toBe('1:30');
      expect(formatDuration(125)).toBe('2:05');
    });

    it('should format seconds to HH:MM:SS', () => {
      expect(formatDuration(3600)).toBe('1:00:00');
      expect(formatDuration(3665)).toBe('1:01:05');
      expect(formatDuration(7200)).toBe('2:00:00');
    });

    it('should handle zero', () => {
      expect(formatDuration(0)).toBe('0:00');
    });

    it('should pad single digits', () => {
      expect(formatDuration(5)).toBe('0:05');
      expect(formatDuration(65)).toBe('1:05');
    });

    it('should handle large durations', () => {
      expect(formatDuration(36000)).toBe('10:00:00');
      expect(formatDuration(359999)).toBe('99:59:59');
    });

    it('should handle fractional seconds', () => {
      expect(formatDuration(90.7)).toBe('1:30');
      expect(formatDuration(125.99)).toBe('2:05');
    });
  });

  describe('truncate', () => {
    it('should truncate long text', () => {
      const text = 'This is a very long text that needs to be truncated';
      expect(truncate(text, 20)).toBe('This is a very long...');
    });

    it('should not truncate short text', () => {
      const text = 'Short text';
      expect(truncate(text, 20)).toBe('Short text');
    });

    it('should handle exact length', () => {
      const text = 'Exactly 20 chars!!!.';
      expect(truncate(text, 20)).toBe('Exactly 20 chars!!!.');
    });

    it('should handle empty string', () => {
      expect(truncate('', 10)).toBe('');
    });

    it('should trim whitespace before ellipsis', () => {
      const text = 'Hello world this is a test';
      expect(truncate(text, 11)).toBe('Hello world...');
    });

    it('should handle zero length', () => {
      expect(truncate('Hello', 0)).toBe('...');
    });
  });

  describe('delay', () => {
    it('should delay for specified milliseconds', async () => {
      const start = Date.now();
      await delay(100);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(150);
    });

    it('should resolve immediately with 0ms delay', async () => {
      const start = Date.now();
      await delay(0);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(10);
    });

    it('should return a promise', () => {
      const result = delay(10);
      expect(result).toBeInstanceOf(Promise);
    });

    it('should be chainable', async () => {
      let executed = false;
      await delay(10).then(() => {
        executed = true;
      });
      expect(executed).toBe(true);
    });
  });
});
