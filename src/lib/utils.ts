import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format seconds to HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length).trim()}...`;
}

/**
 * Delay utility for async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Normalizes proxied image URLs to be relative to the frontend.
 * This ensures they work through the Next.js rewrite and avoids Next.js Image optimization 400 errors.
 */
export function getOptimizedImageUrl(url: string | null | undefined): string {
  if (!url || url === 'null') return '';

  // If it's already relative or data URL, return as is
  if (
    url.startsWith('/') ||
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('offline-media://')
  ) {
    return url;
  }

  // If it points to our backend, make it relative
  const backendUrl =
    typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_BACKEND_URL : '';
  const isBackendUrl = backendUrl && url.startsWith(backendUrl);

  if (
    isBackendUrl ||
    url.includes('localhost:4000/api/') ||
    url.includes('/api/stream/')
  ) {
    try {
      if (url.startsWith('http')) {
        const urlObj = new URL(url);
        return urlObj.pathname + urlObj.search;
      }
      return url;
    } catch (_e) {
      const index = url.indexOf('/api/');
      if (index !== -1) {
        return url.substring(index);
      }
    }
  }

  // Auto-proxy IMDb/Amazon images to bypass hotlinking protection (403/500 errors)
  if (url.includes('m.media-amazon.com') || url.includes('imdb.com')) {
    // Determine the base64 encoding safe for URLs
    const encoded =
      typeof window !== 'undefined'
        ? window
            .btoa(url)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
        : Buffer.from(url)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

    return `/api/stream/image?url=${encoded}`;
  }

  return url;
}
