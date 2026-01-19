// Environment variables
export const env = {
    BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000',
    WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000',
} as const;
