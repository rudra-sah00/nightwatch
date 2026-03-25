/**
 * SpriteService — Handles video scrubbing preview support (Sprite VTT parsing and preloading).
 */

export interface SpriteCue {
  start: number;
  end: number;
  url: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// Cache for sprite VTT data
const spriteVttCache = new Map<string, SpriteCue[]>();

/**
 * Parse VTT timestamp to seconds
 */
export function parseVttTime(timestamp: string): number {
  if (!timestamp) return 0;
  const parts = timestamp.split(':');
  if (parts.length === 3) {
    return (
      parseInt(parts[0], 10) * 3600 +
      parseInt(parts[1], 10) * 60 +
      parseFloat(parts[2])
    );
  }
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  }
  return parseFloat(parts[0]);
}

/**
 * Parse a backend CDN proxy URL -> { token, originalCdnUrl }
 * Format: /api/stream/cdn/TOKEN/BASE64_URL_MODIFIED
 */
export function parseProxyCdnUrl(
  url: string,
): { token: string; cdnUrl: string } | null {
  // Handle both absolute (https://...) and relative (/api/...) proxy URLs
  const m = url.match(/\/api\/stream\/cdn\/([^/]+)\/(.+?)(?:\?.*)?$/);
  if (!m) return null;
  try {
    // Reverse wrapInProxy's base64url encoding
    const encoded = m[2].replace(/-/g, '+').replace(/_/g, '/');
    const pad = (4 - (encoded.length % 4)) % 4;
    const cdnUrl = atob(encoded + '='.repeat(pad));
    return { token: m[1], cdnUrl };
  } catch {
    return null;
  }
}

/**
 * Wrap an external URL in the CDN proxy
 */
export function proxyCdnImage(rawUrl: string, token: string): string {
  if (
    !rawUrl ||
    rawUrl.startsWith('data:') ||
    rawUrl.includes('/api/stream/cdn')
  ) {
    return rawUrl;
  }
  const encoded = btoa(rawUrl)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `/api/stream/cdn/${token}/${encoded}`;
}

/**
 * Fetch and parse sprite VTT file
 */
export async function fetchSpriteVtt(vttUrl: string): Promise<SpriteCue[]> {
  // Check cache first
  const cached = spriteVttCache.get(vttUrl);
  if (cached) {
    return cached;
  }

  const res = await fetch(vttUrl);
  if (!res.ok) throw new Error(`Failed to fetch sprite VTT: ${res.status}`);

  const text = await res.text();
  const sprites: SpriteCue[] = [];
  const lines = text.split('\n');
  let currentStart = 0;
  let currentEnd = 0;

  // Extract proxy info if applicable
  const proxyInfo = parseProxyCdnUrl(vttUrl);
  const preloadedUrls = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      const parts = line.split('-->');
      currentStart = parseVttTime(parts[0].trim());
      currentEnd = parseVttTime(parts[1].trim());
    } else if (line.includes('#xywh=')) {
      const [rawUrl, hash] = line.split('#xywh=');
      const coords = hash.split(',').map(Number);

      let absoluteUrl = rawUrl.trim();
      if (!absoluteUrl.startsWith('http')) {
        const base = proxyInfo?.cdnUrl ?? vttUrl;
        try {
          absoluteUrl = new URL(absoluteUrl, base).toString();
        } catch {
          // keep as-is if resolution fails
        }
      }

      if (proxyInfo && absoluteUrl.startsWith('http')) {
        absoluteUrl = proxyCdnImage(absoluteUrl, proxyInfo.token);
      }

      if (coords.length === 4) {
        sprites.push({
          start: currentStart,
          end: currentEnd,
          url: absoluteUrl,
          x: coords[0],
          y: coords[1],
          w: coords[2],
          h: coords[3],
        });

        // Preload unique images for instant hover
        if (!preloadedUrls.has(absoluteUrl)) {
          preloadedUrls.add(absoluteUrl);
          if (typeof window !== 'undefined') {
            const img = new Image();
            img.src = absoluteUrl;
          }
        }
      }
    }
  }

  spriteVttCache.set(vttUrl, sprites);
  return sprites;
}
