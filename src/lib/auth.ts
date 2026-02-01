import type { User } from '@/types';
import { STORAGE_KEYS } from './constants';
import {
  getCachedLocalStorage,
  removeCachedLocalStorage,
  setCachedLocalStorage,
} from './storage-cache';

/**
 * Get user from storage
 */
export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;

  const stored = getCachedLocalStorage(STORAGE_KEYS.USER);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as User;
  } catch {
    return null;
  }
}

/**
 * Store user in localStorage
 */
export function storeUser(user: User): void {
  if (typeof window === 'undefined') return;
  setCachedLocalStorage(STORAGE_KEYS.USER, JSON.stringify(user));
}

/**
 * Clear user from storage
 */
export function clearStoredUser(): void {
  if (typeof window === 'undefined') return;
  removeCachedLocalStorage(STORAGE_KEYS.USER);
}
