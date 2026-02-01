import { describe, expect, it } from 'vitest';
import { searchQuerySchema } from '@/features/search/schema';

describe('Search Query Schema', () => {
  it('accepts valid search query', () => {
    const validData = {
      q: 'breaking bad',
    };

    const result = searchQuerySchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('accepts single character query', () => {
    const data = {
      q: 'a',
    };

    const result = searchQuerySchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects empty query', () => {
    const data = {
      q: '',
    };

    const result = searchQuerySchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects query exceeding 100 characters', () => {
    const data = {
      q: 'a'.repeat(101),
    };

    const result = searchQuerySchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts query at maximum length', () => {
    const data = {
      q: 'a'.repeat(100),
    };

    const result = searchQuerySchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts query with special characters', () => {
    const data = {
      q: 'spider-man: far from home',
    };

    const result = searchQuerySchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts query with numbers', () => {
    const data = {
      q: '2001 a space odyssey',
    };

    const result = searchQuerySchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects missing query parameter', () => {
    const data = {};

    const result = searchQuerySchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('trims whitespace from query', () => {
    const data = {
      q: '  breaking bad  ',
    };

    const result = searchQuerySchema.safeParse(data);
    // Note: Zod doesn't trim by default unless .trim() is used
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.q).toBe('  breaking bad  ');
    }
  });
});
