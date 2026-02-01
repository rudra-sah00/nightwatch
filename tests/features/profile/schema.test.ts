import { describe, expect, it } from 'vitest';
import { updateProfileSchema } from '@/features/profile/schema';

describe('Update Profile Schema', () => {
  it('accepts valid profile data', () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    const result = updateProfileSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const data = {
      name: 'John Doe',
      email: 'not-an-email',
    };

    const result = updateProfileSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/invalid/i);
    }
  });

  it('rejects short name', () => {
    const data = {
      name: 'J',
      email: 'john@example.com',
    };

    const result = updateProfileSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/at least 2/i);
    }
  });

  it('accepts minimum valid name', () => {
    const data = {
      name: 'Jo',
      email: 'jo@example.com',
    };

    const result = updateProfileSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const data = {
      email: 'john@example.com',
    };

    const result = updateProfileSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects missing email', () => {
    const data = {
      name: 'John Doe',
    };

    const result = updateProfileSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts long names', () => {
    const data = {
      name: 'John Jacob Jingleheimer Schmidt',
      email: 'john@example.com',
    };

    const result = updateProfileSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('accepts email with plus addressing', () => {
    const data = {
      name: 'John Doe',
      email: 'john+test@example.com',
    };

    const result = updateProfileSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
