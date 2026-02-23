import { vi } from 'vitest';

export const setTokenExpiration = vi.fn();
export const apiFetch = vi.fn().mockResolvedValue({});
