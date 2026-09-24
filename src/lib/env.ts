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
const wsRelayUrl = process.env.NEXT_PUBLIC_WS_RELAY_URL;
const agoraAppId = process.env.NEXT_PUBLIC_AGORA_APP_ID;
const turnstileKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

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
 * - `WS_RELAY_URL` — WebSocket endpoint for the watch-party relay. Deliberately
 *   OPTIONAL and separate from `WS_URL`: the relay is its own process on its own port
 *   with its own tunnel hostname, so it restarts without touching the API. Falling back
 *   to `WS_URL` would silently point relay traffic at the API's three load-balanced
 *   replicas, where room members would land on different processes and each would run
 *   its own tick — so when this is unset the relay simply stays off.
 * - `AGORA_APP_ID` — Agora project App ID for RTC (voice and video).
 * - `TURNSTILE_SITE_KEY` — Cloudflare Turnstile site key (empty string if unset).
 */
export const env = {
  BACKEND_URL: backendUrl,
  WS_URL: wsUrl,
  WS_RELAY_URL: wsRelayUrl || '',
  AGORA_APP_ID: agoraAppId,
  TURNSTILE_SITE_KEY: turnstileKey || '',
  GOOGLE_CLIENT_ID: googleClientId || '',
} as const;
