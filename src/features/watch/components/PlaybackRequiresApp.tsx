'use client';

import { useRouter } from 'next/navigation';

/**
 * Shown when the backend answers a play request with PLAYBACK_REQUIRES_APP.
 *
 * The VOD CDN only serves media to requests carrying one of its allow-listed
 * `Referer` values. A browser cannot send one — `Referer` is a forbidden header,
 * so no fetch option, `referrerPolicy` or Service Worker can set it. The desktop
 * and mobile shells can, so playback lives there while the browser stays a
 * browse/search client.
 *
 * Deliberately not styled as an error: nothing has gone wrong, this build simply
 * cannot play this content.
 */

const RELEASES = 'https://github.com/rudra-sah00/nightwatch/releases/latest';

const DOWNLOADS: { label: string; sublabel: string; href: string }[] = [
  { label: 'Windows', sublabel: '.exe installer', href: RELEASES },
  { label: 'macOS', sublabel: '.dmg (Apple silicon)', href: RELEASES },
  { label: 'Linux', sublabel: '.AppImage', href: RELEASES },
  { label: 'Android', sublabel: '.apk', href: RELEASES },
  { label: 'Android TV', sublabel: '.apk', href: RELEASES },
];

interface PlaybackRequiresAppProps {
  title?: string;
}

export function PlaybackRequiresApp({ title }: PlaybackRequiresAppProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6">
        <span className="text-4xl" aria-hidden="true">
          🖥️
        </span>
      </div>

      <h2 className="text-white text-2xl font-semibold mb-3">
        Watch in the Nightwatch app
      </h2>

      <p className="text-white/70 max-w-md mb-2">
        {title ? (
          <>
            <span className="text-white">{title}</span> can&apos;t be played in
            a web browser.
          </>
        ) : (
          <>This title can&apos;t be played in a web browser.</>
        )}
      </p>
      <p className="text-white/50 max-w-md mb-8 text-sm">
        Browsing, search and watchlists all work here — only playback needs the
        desktop or mobile app.
      </p>

      <div className="flex flex-wrap gap-3 justify-center mb-8 max-w-2xl">
        {DOWNLOADS.map((d) => (
          <a
            key={d.label}
            href={d.href}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 bg-white text-black rounded-lg font-medium hover:bg-white/90 transition-colors text-left"
          >
            <span className="block text-sm font-semibold">{d.label}</span>
            <span className="block text-xs text-black/60">{d.sublabel}</span>
          </a>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
        >
          Go back
        </button>
        <button
          type="button"
          onClick={() => router.push('/home')}
          className="px-6 py-2 bg-white/10 text-white rounded-lg font-medium hover:bg-white/20 transition-colors"
        >
          Browse titles
        </button>
      </div>
    </div>
  );
}
