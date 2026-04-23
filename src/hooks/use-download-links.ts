'use client';

import { useEffect, useMemo, useState } from 'react';

const RELEASES_API =
  'https://api.github.com/repos/rudra-sah00/nightwatch/releases/latest';
const RELEASES_FALLBACK =
  'https://github.com/rudra-sah00/nightwatch/releases/latest';

type DownloadLinks = { windows: string; mac: string; linux: string };

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
        });
      })
      .catch(() =>
        setLinks({
          windows: RELEASES_FALLBACK,
          mac: RELEASES_FALLBACK,
          linux: RELEASES_FALLBACK,
        }),
      );
  }, []);
  return links;
}

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
