import { vi } from 'vitest';

export const getStoredUser = vi.fn(() => null);
export const storeUser = vi.fn();
export const clearStoredUser = vi.fn();
