/**
 * Build-time environment variable accessor.
 *
 * Next.js requires `process.env.NEXT_PUBLIC_*` to be accessed as literal
 * property lookups so the bundler can inline them. Dynamic access like
 * `process.env[key]` returns `undefined` in the browser.
 *
 * Throws at startup if any required variable is missing.
 *
 * @module env
 */

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
const agoraAppId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
const turnstileKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

if (!backendUrl || !wsUrl || !agoraAppId) {
  throw new Error(
    'Missing required environment variables. Check .env or CI/CD configuration.',
  );
}

/**
 * Typed, validated environment variables available to both server and client code.
 *
 * - `BACKEND_URL` — Base URL of the Node.js API server.
 * - `WS_URL` — WebSocket endpoint for Socket.IO connections.
 * - `AGORA_APP_ID` — Agora project App ID for RTM/RTC.
 * - `TURNSTILE_SITE_KEY` — Cloudflare Turnstile site key (empty string if unset).
 */
export const env = {
  BACKEND_URL: backendUrl,
  WS_URL: wsUrl,
  AGORA_APP_ID: agoraAppId,
  TURNSTILE_SITE_KEY: turnstileKey || '',
} as const;
