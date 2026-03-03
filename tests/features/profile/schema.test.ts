import { describe, expect, it } from 'vitest';
import {
  changePasswordSchema,
  updateProfileSchema,
} from '@/features/profile/schema';

describe('Update Profile Schema', () => {
  it('accepts valid profile data with all fields', () => {
    const result = updateProfileSchema.safeParse({
      name: 'John Doe',
      username: 'johndoe',
      preferredServer: 's1',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (all fields optional)', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });

  it('accepts partial update with only name', () => {
    expect(updateProfileSchema.safeParse({ name: 'Jo' }).success).toBe(true);
  });

  it('rejects short name', () => {
    const result = updateProfileSchema.safeParse({ name: 'J' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/at least 2/i);
    }
  });

  it('rejects username shorter than 3 characters', () => {
    const result = updateProfileSchema.safeParse({ username: 'ab' });
    expect(result.success).toBe(false);
  });

  it('rejects username with special characters other than underscore', () => {
    const result = updateProfileSchema.safeParse({ username: 'john-doe' });
    expect(result.success).toBe(false);
  });

  it('accepts username with underscores', () => {
    expect(
      updateProfileSchema.safeParse({ username: 'john_doe_1' }).success,
    ).toBe(true);
  });

  it('accepts preferredServer s1 and s2 only', () => {
    expect(
      updateProfileSchema.safeParse({ preferredServer: 's1' }).success,
    ).toBe(true);
    expect(
      updateProfileSchema.safeParse({ preferredServer: 's2' }).success,
    ).toBe(true);
    expect(
      updateProfileSchema.safeParse({ preferredServer: 's3' }).success,
    ).toBe(false);
  });

  it('accepts long names', () => {
    const result = updateProfileSchema.safeParse({
      name: 'John Jacob Jingleheimer Schmidt',
    });
    expect(result.success).toBe(true);
  });
});

describe('Change Password Schema', () => {
  const valid = {
    currentPassword: 'OldPass123!',
    newPassword: 'NewPass123!',
    confirmPassword: 'NewPass123!',
  };

  it('accepts valid password change', () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects when new passwords do not match', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      confirmPassword: 'Different123!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/do not match/i);
    }
  });

  it('rejects newPassword shorter than 8 characters', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      newPassword: 'Ab1!',
      confirmPassword: 'Ab1!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects newPassword without uppercase letter', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      newPassword: 'newpass123!',
      confirmPassword: 'newpass123!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects newPassword without special character', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      newPassword: 'NewPass123',
      confirmPassword: 'NewPass123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty currentPassword', () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      currentPassword: '',
    });
    expect(result.success).toBe(false);
  });
});
