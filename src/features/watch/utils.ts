/**
 * Injects a stream token into a URL's path for path-based authentication.
 * Handles migration from old query-parameter style to new path-based style.
 */
export function injectTokenIntoUrl(
  urlStr: string | undefined,
  token: string,
): string | undefined {
  if (!urlStr) return undefined;
  try {
    const url = new URL(
      urlStr,
      typeof window !== 'undefined' ? window.location.origin : undefined,
    );

    // 1. Handle migration from old query-param style to path-based style
    // Old CDN: /api/stream/cdn?url=...
    // New CDN: /api/stream/cdn/TOKEN/URL
    if (url.pathname.endsWith('/cdn') && url.searchParams.has('url')) {
      const encodedUrl = url.searchParams.get('url');
      if (encodedUrl) {
        // Reconstruct as path-based
        const newPath = `/api/stream/cdn/${token}/${encodedUrl}`;
        url.pathname = newPath;
        url.searchParams.delete('url');
        url.searchParams.delete('st'); // Remove old token if present
        return url.toString();
      }
    }

    const pathParts = url.pathname.split('/');
    // pathParts split by / results in empty string at start if path starts with /
    // e.g. /api/stream/cdn -> ['', 'api', 'stream', 'cdn']

    let updated = false;

    if (pathParts.includes('hls')) {
      const idx = pathParts.indexOf('hls');
      // Old format: .../hls/MOVIE_ID  (length = idx + 2)
      // New format: .../hls/TOKEN/MOVIE_ID (length = idx + 3)

      const partsAfterHls = pathParts.length - (idx + 1);

      if (partsAfterHls === 1) {
        // Old format! Convert to new.
        const movieId = pathParts[idx + 1];
        pathParts.splice(idx + 1, 1, token, movieId); // Insert token before movieId
        updated = true;
        url.searchParams.delete('st');
      } else if (partsAfterHls >= 2) {
        // New format, just replace the token
        pathParts[idx + 1] = token;
        updated = true;
      }
    } else if (pathParts.includes('cdn')) {
      const idx = pathParts.indexOf('cdn');
      const partsAfterCdn = pathParts.length - (idx + 1);

      // Note: we already handled query-param conversion above.
      // This block handles updating token in ALREADY path-based URLs.
      if (partsAfterCdn >= 2) {
        pathParts[idx + 1] = token;
        updated = true;
      }
    }

    if (updated) {
      url.pathname = pathParts.join('/');
      return url.toString();
    }
    return url.toString();
  } catch (_e) {
    return urlStr;
  }
}

/**
 * Extracts a stream token from a URL (either path-based or query-parameter based).
 */
export function extractTokenFromUrl(
  urlStr: string | null | undefined,
): string | null {
  if (!urlStr) return null;
  try {
    const url = new URL(
      urlStr,
      typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost',
    );
    const pathParts = url.pathname.split('/');
    const hlsIdx = pathParts.indexOf('hls');

    // Path-based: /api/stream/hls/TOKEN/ID
    if (hlsIdx !== -1 && pathParts.length > hlsIdx + 2) {
      return pathParts[hlsIdx + 1];
    }

    const cdnIdx = pathParts.indexOf('cdn');
    // Path-based CDN: /api/stream/cdn/TOKEN/URL
    if (cdnIdx !== -1 && pathParts.length > cdnIdx + 2) {
      return pathParts[cdnIdx + 1];
    }

    // Query-based: ?st=TOKEN
    return url.searchParams.get('st');
  } catch (_e) {
    return null;
  }
}

/**
 * Wraps an external URL in the backend proxy.
 */
export function wrapInProxy(url: string, token: string): string {
  if (!url || url.startsWith('data:')) return url;
  if (url.includes('/api/stream/cdn')) return url;

  const encoded =
    typeof btoa !== 'undefined'
      ? btoa(url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      : Buffer.from(url).toString('base64url');
  return `/api/stream/cdn/${token}/${encoded}`;
}

/**
 * Normalizes a set of watch-related URLs using a provided token.
 */
export function normalizeWatchUrls(
  urls: {
    streamUrl: string | null;
    captionUrl?: string | null;
    spriteVtt?: string;
    subtitleTracks?: {
      id: string;
      label: string;
      language: string;
      src: string;
    }[];
  },
  token: string,
) {
  return {
    streamUrl:
      injectTokenIntoUrl(urls.streamUrl || '', token) || urls.streamUrl,
    captionUrl: urls.captionUrl
      ? wrapInProxy(urls.captionUrl, token)
      : urls.captionUrl,
    // Sprite VTT is a CDN URL, use wrapInProxy like captions
    spriteVtt: urls.spriteVtt
      ? wrapInProxy(urls.spriteVtt, token)
      : urls.spriteVtt,
    subtitleTracks: urls.subtitleTracks?.map((track) => ({
      ...track,
      src: wrapInProxy(track.src, token),
    })),
  };
}
