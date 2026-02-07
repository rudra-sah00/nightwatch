import { describe, expect, it } from 'vitest';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '@/features/auth/schema';

describe('Login Schema', () => {
  it('accepts valid login data', () => {
    const validData = {
      email: 'test@example.com',
      password: 'password123',
    };

    const result = loginSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('accepts login with optional captcha', () => {
    const data = {
      email: 'test@example.com',
      password: 'password123',
      captchaToken: 'some-token',
    };

    const result = loginSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects empty email', () => {
    const data = {
      email: '',
      password: 'password123',
    };

    const result = loginSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects empty password', () => {
    const data = {
      email: 'test@example.com',
      password: '',
    };

    const result = loginSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('Register Schema', () => {
  it('accepts valid registration data', () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password!',
    };

    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects password without uppercase', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password!',
    };

    const result = registerSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/uppercase/i);
    }
  });

  it('rejects password without special character', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123',
    };

    const result = registerSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/special/i);
    }
  });

  it('rejects short password', () => {
    const data = {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Pa!',
    };

    const result = registerSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/at least 6/i);
    }
  });

  it('rejects invalid email', () => {
    const data = {
      name: 'John Doe',
      email: 'notanemail',
      password: 'Password123',
    };

    const result = registerSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('rejects short name', () => {
    const data = {
      name: 'J',
      email: 'john@example.com',
      password: 'Password123',
    };

    const result = registerSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('Forgot Password Schema', () => {
  it('accepts valid email', () => {
    const data = { email: 'test@example.com' };
    const result = forgotPasswordSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const data = { email: 'notanemail' };
    const result = forgotPasswordSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

describe('Reset Password Schema', () => {
  it('accepts valid password reset', () => {
    const data = {
      password: 'NewPass!',
      confirmPassword: 'NewPass!',
    };

    const result = resetPasswordSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const data = {
      password: 'NewPass!',
      confirmPassword: 'Different!',
    };

    const result = resetPasswordSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/match/i);
    }
  });

  it('accepts passwords without lowercase (optional)', () => {
    const data = {
      password: 'NEWPASS!',
      confirmPassword: 'NEWPASS!',
    };

    const result = resetPasswordSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('requires uppercase letter', () => {
    const data = {
      password: 'newpass!',
      confirmPassword: 'newpass!',
    };

    const result = resetPasswordSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('accepts passwords without number (optional)', () => {
    const data = {
      password: 'NewPass!',
      confirmPassword: 'NewPass!',
    };

    const result = resetPasswordSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('requires special character', () => {
    const data = {
      password: 'NewPass123',
      confirmPassword: 'NewPass123',
    };

    const result = resetPasswordSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('requires minimum 6 characters', () => {
    const data = {
      password: 'Pa1!',
      confirmPassword: 'Pa1!',
    };

    const result = resetPasswordSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
