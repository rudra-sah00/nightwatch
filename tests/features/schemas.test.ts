import { describe, expect, it } from 'vitest';
import { updateProfileSchema } from '@/features/profile/schema';
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
    it('should validate correct profile update', () => {
      const validData = {
        name: 'Test User',
        email: 'test@example.com',
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject name shorter than 2 characters', () => {
      const invalidData = {
        name: 'T',
        email: 'test@example.com',
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Name must be at least 2 characters',
        );
      }
    });

    it('should accept name with exactly 2 characters', () => {
      const validData = {
        name: 'Jo',
        email: 'test@example.com',
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        name: 'Test User',
        email: 'invalid-email',
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email address');
      }
    });

    it('should accept email with plus addressing', () => {
      const validData = {
        name: 'Test User',
        email: 'test+tag@example.com',
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept email with subdomain', () => {
      const validData = {
        name: 'Test User',
        email: 'test@mail.example.com',
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject email without @ symbol', () => {
      const invalidData = {
        name: 'Test User',
        email: 'testexample.com',
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject email without domain', () => {
      const invalidData = {
        name: 'Test User',
        email: 'test@',
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing name field', () => {
      const invalidData = {
        email: 'test@example.com',
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing email field', () => {
      const invalidData = {
        name: 'Test User',
      };

      const result = updateProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept long names', () => {
      const validData = {
        name: 'This is a very long name with many characters',
        email: 'test@example.com',
      };

      const result = updateProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});
