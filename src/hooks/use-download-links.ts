'use client';

import { useEffect, useMemo, useState } from 'react';

/** GitHub Releases API endpoint for the latest desktop build. */
const RELEASES_API =
  'https://api.github.com/repos/rudra-sah00/nightwatch/releases/latest';

/** Fallback URL when the API call fails or an asset is missing. */
const RELEASES_FALLBACK =
  'https://github.com/rudra-sah00/nightwatch/releases/latest';

/** Per-platform download URLs resolved from the latest GitHub release. */
type DownloadLinks = {
  windows: string;
  mac: string;
  linux: string;
  android: string;
};

/**
 * Fetches the latest GitHub release and resolves per-platform download URLs.
 *
 * Looks for `.exe` (Windows), `.dmg` (macOS), and `.AppImage` (Linux) assets.
 * Falls back to the generic releases page on error or missing assets.
 *
 * @returns `DownloadLinks` once resolved, or `null` while loading.
 */
export function useDownloadLinks() {
  const [links, setLinks] = useState<DownloadLinks | null>(null);
  useEffect(() => {
    fetch(RELEASES_API)
      .then((r) => r.json())
      .then((data) => {
        const assets: { name: string; browser_download_url: string }[] =
          data.assets ?? [];
        const find = (test: (n: string) => boolean) =>
          assets.find((a) => test(a.name))?.browser_download_url ??
          RELEASES_FALLBACK;
        setLinks({
          windows: find((n) => n.endsWith('.exe') && !n.endsWith('.blockmap')),
          mac: find((n) => n.endsWith('.dmg') && !n.endsWith('.blockmap')),
          linux: find((n) => n.endsWith('.AppImage')),
          android: find((n) => n.endsWith('.apk')),
        });
      })
      .catch(() =>
        setLinks({
          windows: RELEASES_FALLBACK,
          mac: RELEASES_FALLBACK,
          linux: RELEASES_FALLBACK,
          android: RELEASES_FALLBACK,
        }),
      );
  }, []);
  return links;
}

/**
 * Convenience wrapper around {@link useDownloadLinks} that returns only the
 * download URL matching the user's current operating system.
 *
 * Detects macOS, Windows, and Linux via `navigator.userAgent`.
 *
 * @returns The platform-specific download URL, or `null` if not yet resolved
 *          or the OS cannot be detected.
 */
export function useCurrentOSDownload() {
  const links = useDownloadLinks();
  const osKey = useMemo(() => {
    if (typeof navigator === 'undefined') return null;
    const ua = navigator.userAgent;
    if (/Mac/i.test(ua)) return 'mac' as const;
    if (/Win/i.test(ua)) return 'windows' as const;
    if (/Linux/i.test(ua)) return 'linux' as const;
    return null;
  }, []);

  if (!links || !osKey) return null;
  return links[osKey];
}
