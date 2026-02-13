// Environment variables
// Note: We must access process.env.NEXT_PUBLIC_* directly for Next.js to inline them at build time.
// Dynamic access like process.env[key] returns undefined in the browser.

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
const agoraAppId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
const turnstileKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

if (!backendUrl || !wsUrl || !agoraAppId) {
  throw new Error(
    'Missing required environment variables. Check .env or CI/CD configuration.',
  );
}

export const env = {
  BACKEND_URL: backendUrl,
  WS_URL: wsUrl,
  AGORA_APP_ID: agoraAppId,
  TURNSTILE_SITE_KEY: turnstileKey || '',
} as const;
