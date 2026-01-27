/**
 * Base64URL encoding for strings (browser-safe)
 */
export const toBase64Url = (str: string): string => {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/**
 * Wraps an external URL with the frontend proxy endpoint
 * @param url The external URL to proxy
 * @returns The proxied URL, or the original if relative/falsy
 */
export const getProxyUrl = (
  url: string | null | undefined,
): string | undefined => {
  if (!url) return undefined;

  // Skip if it is already a local path or data URL
  if (url.startsWith('/') || url.startsWith('data:')) {
    return url;
  }

  // Skip if already proxied by frontend or backend
  if (
    url.includes('/api/proxy?url=') ||
    url.includes('/api/stream/image?url=')
  ) {
    return url;
  }

  return `/api/proxy?url=${toBase64Url(url)}`;
};
