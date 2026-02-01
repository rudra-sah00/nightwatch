import { describe, expect, it } from 'vitest';
import { cn, delay, formatDuration, truncate } from '@/lib/utils';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    const result = cn('px-4', 'py-2');
    expect(result).toBe('px-4 py-2');
  });

  it('handles conditional classes', () => {
    const result = cn('base', true && 'active', false && 'disabled');
    expect(result).toContain('base');
    expect(result).toContain('active');
    expect(result).not.toContain('disabled');
  });

  it('handles undefined and null values', () => {
    const result = cn('base', undefined, null, 'end');
    expect(result).toBe('base end');
  });

  it('merges tailwind classes properly', () => {
    const result = cn('px-4', 'px-6');
    expect(result).toBe('px-6'); // Later class should win
  });
});

describe('formatDuration', () => {
  it('formats seconds under a minute', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2:05');
    expect(formatDuration(600)).toBe('10:00');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatDuration(3665)).toBe('1:01:05');
    expect(formatDuration(7200)).toBe('2:00:00');
  });

  it('handles zero', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('pads single digits correctly', () => {
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3605)).toBe('1:00:05');
  });
});

describe('truncate', () => {
  it('truncates long text', () => {
    const text = 'This is a very long text that needs to be truncated';
    expect(truncate(text, 20)).toBe('This is a very long...');
  });

  it('does not truncate short text', () => {
    const text = 'Short text';
    expect(truncate(text, 20)).toBe('Short text');
  });

  it('handles exact length', () => {
    const text = 'Exactly twenty chars';
    expect(truncate(text, 20)).toBe(text);
  });

  it('trims whitespace before ellipsis', () => {
    const text = 'Text with spaces';
    const result = truncate(text, 9);
    expect(result).toBe('Text with...');
  });
});

describe('delay', () => {
  it('delays execution', async () => {
    const start = Date.now();
    await delay(50);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(45); // Allow small margin
  });

  it('returns a promise', () => {
    const result = delay(10);
    expect(result).toBeInstanceOf(Promise);
  });
});
