import { API_ROUTES } from '@/lib/constants';
import { apiFetch } from '@/lib/fetch';
import type { LoginResponse, LogoutResponse } from '@/types';
import type { ForgotPasswordInput, LoginInput, RegisterInput } from './schema';

/**
 * Login user with email and password
 */
export async function loginUser(
  data: LoginInput,
  options?: RequestInit,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>(API_ROUTES.AUTH.LOGIN, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options,
  });
}

export async function logoutUser(
  options?: RequestInit,
): Promise<LogoutResponse> {
  return apiFetch<LogoutResponse>(API_ROUTES.AUTH.LOGOUT, {
    method: 'POST',
    ...options,
  });
}

/**
 * Register new user
 */
export async function registerUser(
  data: RegisterInput,
  options?: RequestInit,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>(API_ROUTES.AUTH.REGISTER, {
    method: 'POST',
    body: JSON.stringify(data),
    ...options,
  });
}

/**
 * Verify OTP for Login or Registration
 */
export async function verifyOtp(
  email: string,
  otp: string,
  context: 'login' | 'register',
  mobileState?: string,
  options?: RequestInit,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/api/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp, context, mobileState }),
    ...options,
  });
}

export async function validateInvite(
  inviteCode: string,
): Promise<{ valid: boolean }> {
  return apiFetch<{ valid: boolean }>('/api/auth/validate-invite', {
    method: 'POST',
    body: JSON.stringify({ inviteCode }),
  });
}

export async function resendOtp(
  email: string,
): Promise<{ message: string; nextCooldown: number }> {
  return apiFetch('/api/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function forgotPassword(
  data: ForgotPasswordInput,
): Promise<{ message: string }> {
  return apiFetch('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function resetPassword(
  token: string,
  password: string,
): Promise<{ message: string }> {
  return apiFetch('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword: password }),
  });
}

/**
 * Checks if a username is available in real-time
 */
export async function checkUsername(
  username: string,
  options?: RequestInit,
): Promise<{ available: boolean }> {
  return apiFetch<{ available: boolean }>(
    `/api/user/check-username/${encodeURIComponent(username)}`,
    options,
  );
}

// ── Desktop Auth (browser-to-app login) ─────────────────────────
