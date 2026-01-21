// Environment variables
export const env = {
  BACKEND_URL:
    process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.rudrasahoo.live',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'https://api.rudrasahoo.live',
} as const;
