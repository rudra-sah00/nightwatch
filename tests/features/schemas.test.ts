import { describe, expect, it } from 'vitest';
import {
  changePasswordSchema,
  updateProfileSchema,
} from '@/features/profile/schema';
import { searchQuerySchema } from '@/features/search/schema';

describe('Search Schema', () => {
  describe('searchQuerySchema', () => {
    it('should validate correct search query', () => {
      const validData = { q: 'test query' };

      const result = searchQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept single character query', () => {
      const validData = { q: 'a' };

      const result = searchQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept maximum length query', () => {
      const validData = { q: 'a'.repeat(100) };

      const result = searchQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty query', () => {
      const invalidData = { q: '' };

      const result = searchQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject query longer than 100 characters', () => {
      const invalidData = { q: 'a'.repeat(101) };

      const result = searchQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing query field', () => {
      const invalidData = {};

      const result = searchQuerySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept query with special characters', () => {
      const validData = { q: 'test!@#$%^&*()' };

      const result = searchQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept query with numbers', () => {
      const validData = { q: 'test123' };

      const result = searchQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept query with spaces', () => {
      const validData = { q: 'test with spaces' };

      const result = searchQuerySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});

describe('Profile Schema', () => {
  describe('updateProfileSchema', () => {
    it('should validate with all fields', () => {
      const result = updateProfileSchema.safeParse({
        name: 'Test User',
        username: 'testuser',
        preferredServer: 's1',
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty object (all fields optional)', () => {
      const result = updateProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept partial update with only name', () => {
      const result = updateProfileSchema.safeParse({ name: 'Jo' });
      expect(result.success).toBe(true);
    });

    it('should reject name shorter than 2 characters', () => {
      const result = updateProfileSchema.safeParse({ name: 'T' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('validation.nameMinLength');
      }
    });

    it('should reject username shorter than 3 characters', () => {
      const result = updateProfileSchema.safeParse({ username: 'ab' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'validation.usernameMinLength',
        );
      }
    });

    it('should reject username with special characters', () => {
      const result = updateProfileSchema.safeParse({ username: 'test-user!' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'validation.usernameFormat',
        );
      }
    });

    it('should accept username with underscores', () => {
      const result = updateProfileSchema.safeParse({
        username: 'test_user_123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid preferredServer value', () => {
      const result = updateProfileSchema.safeParse({ preferredServer: 's4' });
      expect(result.success).toBe(false);
    });

    it('should accept preferredServer s1, s2, and s3', () => {
      expect(
        updateProfileSchema.safeParse({ preferredServer: 's1' }).success,
      ).toBe(true);
      expect(
        updateProfileSchema.safeParse({ preferredServer: 's2' }).success,
      ).toBe(true);
      expect(
        updateProfileSchema.safeParse({ preferredServer: 's3' }).success,
      ).toBe(true);
    });
  });

  describe('changePasswordSchema', () => {
    const valid = {
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass123!',
      confirmPassword: 'NewPass123!',
    };

    it('should validate a correct password change', () => {
      expect(changePasswordSchema.safeParse(valid).success).toBe(true);
    });

    it('should reject when passwords do not match', () => {
      const result = changePasswordSchema.safeParse({
        ...valid,
        confirmPassword: 'Different123!',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'validation.newPasswordsMismatch',
        );
      }
    });

    it('should reject newPassword shorter than 8 characters', () => {
      const result = changePasswordSchema.safeParse({
        ...valid,
        newPassword: 'Ab1!',
        confirmPassword: 'Ab1!',
      });
      expect(result.success).toBe(false);
    });

    it('should reject newPassword without uppercase letter', () => {
      const result = changePasswordSchema.safeParse({
        ...valid,
        newPassword: 'newpass123!',
        confirmPassword: 'newpass123!',
      });
      expect(result.success).toBe(false);
    });

    it('should reject newPassword without special character', () => {
      const result = changePasswordSchema.safeParse({
        ...valid,
        newPassword: 'NewPass123',
        confirmPassword: 'NewPass123',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty currentPassword', () => {
      const result = changePasswordSchema.safeParse({
        ...valid,
        currentPassword: '',
      });
      expect(result.success).toBe(false);
    });
  });
});
