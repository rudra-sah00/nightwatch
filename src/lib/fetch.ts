import { env } from './env';
import { ApiError } from '@/types';

interface FetchOptions extends RequestInit {
    timeout?: number;
}

/**
 * Fetch wrapper with credentials and error handling
 */
export async function apiFetch<T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const { timeout = 10000, ...fetchOptions } = options;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(`${env.BACKEND_URL}${endpoint}`, {
            ...fetchOptions,
            credentials: 'include', // Send cookies
            headers: {
                'Content-Type': 'application/json',
                ...fetchOptions.headers,
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error: ApiError = {
                message: errorData.message || `HTTP ${response.status}`,
                status: response.status,
            };
            throw error;
        }

        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
            throw { message: 'Request timeout', status: 408 } as ApiError;
        }

        throw error;
    }
}
