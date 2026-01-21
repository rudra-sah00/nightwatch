import { API_ROUTES } from '@/lib/constants';
import { apiFetch } from '@/lib/fetch';
import type { LoginResponse, LogoutResponse } from '@/types';
import type { LoginInput } from './schema';

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

/**
 * Logout current user
 */
export async function logoutUser(
  options?: RequestInit,
): Promise<LogoutResponse> {
  return apiFetch<LogoutResponse>(API_ROUTES.AUTH.LOGOUT, {
    method: 'POST',
    ...options,
  });
}
