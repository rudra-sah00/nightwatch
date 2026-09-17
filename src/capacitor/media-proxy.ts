import { Capacitor, registerPlugin } from '@capacitor/core';

/**
 * Bridge to the on-device loopback media forwarder (NWMediaProxyPlugin).
 *
 * The VOD CDN only serves media to requests carrying an allow-listed `Referer`, and
 * a WebView cannot attach one to a `<video>` request:
 *   - Android: `shouldInterceptRequest` is not called for the video file itself, and
 *     returning a synthetic response breaks Range requests, so seeking dies.
 *   - iOS: WKWebView exposes no header API for media.
 *
 * So the native side runs a tiny HTTP server on 127.0.0.1 that forwards to the CDN
 * with the right headers. Rewriting the URL to point at it keeps playback inside the
 * existing `<video>` element, so all the player UI — overlays, D-pad navigation,
 * watch-party sync — keeps working. Traffic still goes device → CDN, so this costs no
 * server bandwidth.
 */

interface MediaProxyInfo {
  /** e.g. "http://127.0.0.1:53124" */
  origin: string;
  /** Per-launch secret; the forwarder rejects requests without it. */
  token: string;
}

interface NWMediaProxyPlugin {
  start(): Promise<MediaProxyInfo>;
  stop(): Promise<void>;
}

const NWMediaProxy = registerPlugin<NWMediaProxyPlugin>('NWMediaProxy');

/** Hosts the native forwarder is willing to fetch. Keep in sync with ALLOWED_HOSTS. */
const PROXYABLE_HOSTS = ['hakunaymatata.com', 'aoneroom.com'];

let cached: MediaProxyInfo | null = null;
let starting: Promise<MediaProxyInfo | null> | null = null;

/** Android only for now — the iOS forwarder is not implemented yet. */
export function isMediaProxyAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

/**
 * Start the forwarder (idempotent). Resolves null when unavailable or if start fails,
 * so callers can fall back rather than losing playback entirely.
 */
export async function ensureMediaProxy(): Promise<MediaProxyInfo | null> {
  if (!isMediaProxyAvailable()) return null;
  if (cached) return cached;
  if (starting) return starting;

  starting = NWMediaProxy.start()
    .then((info) => {
      cached = info;
      return info;
    })
    .catch((err) => {
      console.warn('[NW-MediaProxy] start failed', err);
      return null;
    })
    .finally(() => {
      starting = null;
    });

  return starting;
}

function isProxyableUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== 'http:' && protocol !== 'https:') return false;
    return PROXYABLE_HOSTS.some(
      (d) => hostname === d || hostname.endsWith(`.${d}`),
    );
  } catch {
    return false;
  }
}

function toBase64Url(value: string): string {
  const b64 =
    typeof btoa === 'function'
      ? btoa(value)
      : Buffer.from(value, 'utf8').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Rewrite a single CDN URL to go via the loopback forwarder. */
export function toProxiedUrl(url: string, info: MediaProxyInfo): string {
  if (!isProxyableUrl(url)) return url;
  return `${info.origin}/m/${info.token}/${toBase64Url(url)}`;
}

/**
 * Rewrite the media URLs of a play response so they flow through the forwarder.
 *
 * Only touches responses flagged `directPlayback` (raw CDN URLs). Electron is left
 * alone: it injects headers itself via `onBeforeSendHeaders`, so it needs no proxy.
 * Returns the response unchanged when the forwarder is unavailable.
 */
export async function applyMediaProxy<
  T extends {
    directPlayback?: boolean;
    masterPlaylistUrl?: string;
    qualities?: { quality: string; url: string; size?: number }[];
  },
>(response: T): Promise<T> {
  if (!response.directPlayback || !isMediaProxyAvailable()) return response;

  const info = await ensureMediaProxy();
  if (!info) return response;

  return {
    ...response,
    masterPlaylistUrl: response.masterPlaylistUrl
      ? toProxiedUrl(response.masterPlaylistUrl, info)
      : response.masterPlaylistUrl,
    qualities: response.qualities?.map((q) => ({
      ...q,
      url: toProxiedUrl(q.url, info),
    })),
  };
}
