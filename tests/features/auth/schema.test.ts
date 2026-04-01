import { describe, expect, it } from 'vitest';
import {
  forgotPasswordSchema,
  getPasswordStrength,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@/features/auth/schema';

describe('Auth Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty email', () => {
      const invalidData = {
        email: '',
        password: 'password123',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Email or username is required',
        );
      }
    });

    it('should reject empty password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Password is required');
      }
    });

    it('should accept optional captcha token', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        captchaToken: 'test-token',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password!1',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject name shorter than 2 characters', () => {
      const invalidData = {
        name: 'T',
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password!1',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Name must be at least 2 characters',
        );
      }
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        name: 'Test User',
        username: 'testuser',
        email: 'invalid-email',
        password: 'Password!1',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format');
      }
    });

    it('should reject password shorter than 8 characters', () => {
      const invalidData = {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'Pass1!',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Password must be at least 8 characters',
        );
      }
    });

    it('should reject password without uppercase letter', () => {
      const invalidData = {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'password!1',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Password must contain at least one uppercase letter',
        );
      }
    });

    it('should reject password without special character', () => {
      const invalidData = {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password12',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Password must contain at least one special character',
        );
      }
    });

    it('should reject password without lowercase', () => {
      const validData = {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'ABCDEFG!',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept password without number (not required)', () => {
      const validData = {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password!',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept optional invite code', () => {
      const validData = {
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password!1',
        inviteCode: 'INVITE123',
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('forgotPasswordSchema', () => {
    it('should validate correct email', () => {
      const validData = {
        email: 'test@example.com',
      };

      const result = forgotPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'invalid-email',
      };

      const result = forgotPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format');
      }
    });
  });

  describe('resetPasswordSchema', () => {
    it('should validate matching passwords', () => {
      const validData = {
        password: 'NewPass1!',
        confirmPassword: 'NewPass1!',
      };

      const result = resetPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject password shorter than 8 characters', () => {
      const invalidData = {
        password: 'Pa1!xx',
        confirmPassword: 'Pa1!xx',
      };

      const result = resetPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Password must be at least 8 characters',
        );
      }
    });

    it('should accept password without lowercase letter (optional)', () => {
      const validData = {
        password: 'NEWPASS1!',
        confirmPassword: 'NEWPASS1!',
      };

      const result = resetPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject password without uppercase letter', () => {
      const invalidData = {
        password: 'newpass1!',
        confirmPassword: 'newpass1!',
      };

      const result = resetPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Password must contain at least one uppercase letter',
        );
      }
    });

    it('should accept password without number (optional)', () => {
      const validData = {
        password: 'NewPasss!',
        confirmPassword: 'NewPasss!',
      };

      const result = resetPasswordSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject password without special character', () => {
      const invalidData = {
        password: 'Password12',
        confirmPassword: 'Password12',
      };

      const result = resetPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Password must contain at least one special character',
        );
      }
    });

    it('should reject non-matching passwords', () => {
      const invalidData = {
        password: 'NewPass1!',
        confirmPassword: 'DiffPass1!',
      };

      const result = resetPasswordSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Passwords don't match");
      }
    });
  });

  describe('getPasswordStrength', () => {
    it('should return weak for empty password', () => {
      const result = getPasswordStrength('');
      expect(result.strength).toBe('weak');
      expect(result.score).toBe(0);
      expect(result.label).toBe('Weak');
      expect(result.color).toBe('#ef4444');
    });

    it('should return weak for short password', () => {
      const result = getPasswordStrength('abc');
      expect(result.strength).toBe('weak');
    });

    it('should return weak for password with only lowercase', () => {
      const result = getPasswordStrength('abcdefgh');
      expect(result.strength).toBe('weak');
    });

    it('should return fair for 8+ chars with uppercase and special', () => {
      const result = getPasswordStrength('Abcdefg!');
      expect(result.strength).toBe('fair');
      expect(result.label).toBe('Fair');
      expect(result.color).toBe('#f59e0b');
    });

    it('should return strong for long password with all char types', () => {
      const result = getPasswordStrength('MyStr0ngP@ssword!');
      expect(result.strength).toBe('strong');
      expect(result.label).toBe('Strong');
      expect(result.color).toBe('#10b981');
    });

    it('should penalize repeated characters', () => {
      const withRepeated = getPasswordStrength('AAAbbb!!11');
      const withoutRepeated = getPasswordStrength('AbCdEf!1gh');
      expect(withRepeated.score).toBeLessThan(withoutRepeated.score);
    });

    it('should penalize keyboard patterns', () => {
      const withPattern = getPasswordStrength('Qwerty!123');
      const withoutPattern = getPasswordStrength('Xbrtmp!123');
      expect(withPattern.score).toBeLessThan(withoutPattern.score);
    });

    it('should give bonus for 12+ char password', () => {
      const short = getPasswordStrength('Abcdefg!');
      const long = getPasswordStrength('Abcdefghijk!');
      expect(long.score).toBeGreaterThan(short.score);
    });

    it('should give bonus for all 4 character types', () => {
      const twoTypes = getPasswordStrength('ABCDEFGH!');
      const fourTypes = getPasswordStrength('Abcdefg1!');
      expect(fourTypes.score).toBeGreaterThan(twoTypes.score);
    });
  });
});
