import { apiFetch } from '@/lib/fetch';
import { API_ROUTES } from '@/lib/constants';
import { LoginResponse, LogoutResponse } from '@/types';
import { LoginInput } from './schema';

/**
 * Login user with email and password
 */
export async function loginUser(data: LoginInput): Promise<LoginResponse> {
    return apiFetch<LoginResponse>(API_ROUTES.AUTH.LOGIN, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

/**
 * Logout current user
 */
export async function logoutUser(): Promise<LogoutResponse> {
    return apiFetch<LogoutResponse>(API_ROUTES.AUTH.LOGOUT, {
        method: 'POST',
    });
}
