const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const env = {
  BACKEND_URL: getEnv('NEXT_PUBLIC_BACKEND_URL'),
  WS_URL: getEnv('NEXT_PUBLIC_WS_URL'),
  LIVEKIT_URL: getEnv('NEXT_PUBLIC_LIVEKIT_URL'),
  TURNSTILE_SITE_KEY: getEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY'),
} as const;
