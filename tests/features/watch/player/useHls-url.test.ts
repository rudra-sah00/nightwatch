import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { toAbsoluteStreamUrl } from '@/features/watch/player/hooks/useHls';

/**
 * Regression cover for live TV in a watch party on mobile.
 *
 * The backend stores a RELATIVE playlist path for live channels
 * (`/api/livestream/iptv/proxy-playlist/<id>`) precisely so that a path replayed
 * by every party member resolves against each member's own origin. Its doc
 * claimed `useHls` absolutised leading-slash URLs — but that code existed only in
 * the native-HLS branch, which live streams never take: the `Hls.isSupported()`
 * condition deliberately keeps live on hls.js even on Capacitor, because AVPlayer
 * cannot follow the proxied playlist's rewritten paths.
 *
 * So the one case that needed absolutising was the one case that never got it.
 */

const ORIGINAL_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

function setCapacitor(isNative: boolean | null) {
  if (isNative === null) {
    delete (window as { Capacitor?: unknown }).Capacitor;
    return;
  }
  (window as { Capacitor?: unknown }).Capacitor = {
    isNativePlatform: () => isNative,
  };
}

describe('toAbsoluteStreamUrl', () => {
  beforeEach(() => {
    setCapacitor(null);
    process.env.NEXT_PUBLIC_BACKEND_URL = 'https://api.nightwatch.in';
  });

  afterEach(() => {
    setCapacitor(null);
    if (ORIGINAL_BACKEND_URL === undefined) {
      delete process.env.NEXT_PUBLIC_BACKEND_URL;
    } else {
      process.env.NEXT_PUBLIC_BACKEND_URL = ORIGINAL_BACKEND_URL;
    }
  });

  it('leaves an absolute url untouched', () => {
    const url = 'https://cdn.example.com/hls/abc/master.m3u8';
    expect(toAbsoluteStreamUrl(url)).toBe(url);
  });

  it('leaves an upstream IPTV url untouched', () => {
    const url =
      'https://stitcher-ipv4.pluto.tv/v1/stitch/embed/hls/channel/5f8c/master.m3u8';
    expect(toAbsoluteStreamUrl(url)).toBe(url);
  });

  it('resolves the live-TV proxy path against the page origin on the web', () => {
    const out = toAbsoluteStreamUrl('/api/livestream/iptv/proxy-playlist/ch-1');
    expect(out).toBe(
      `${window.location.origin}/api/livestream/iptv/proxy-playlist/ch-1`,
    );
  });

  it('resolves against the backend on a Capacitor native platform', () => {
    setCapacitor(true);
    expect(
      toAbsoluteStreamUrl('/api/livestream/iptv/proxy-playlist/ch-1'),
    ).toBe('https://api.nightwatch.in/api/livestream/iptv/proxy-playlist/ch-1');
  });

  it('uses the page origin on Capacitor when no backend url is configured', () => {
    setCapacitor(true);
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
    expect(
      toAbsoluteStreamUrl('/api/livestream/iptv/proxy-playlist/ch-1'),
    ).toBe(`${window.location.origin}/api/livestream/iptv/proxy-playlist/ch-1`);
  });

  it('does not double up the slash when the backend url has a trailing one', () => {
    setCapacitor(true);
    process.env.NEXT_PUBLIC_BACKEND_URL = 'https://api.nightwatch.in/';
    expect(toAbsoluteStreamUrl('/api/stream/hls/T/1/master.m3u8')).toBe(
      'https://api.nightwatch.in/api/stream/hls/T/1/master.m3u8',
    );
  });

  it('treats a protocol-relative url as already absolute', () => {
    // Only a single leading slash marks a path we own; `//host/…` is a URL.
    const url = '//cdn.example.com/a.m3u8';
    expect(toAbsoluteStreamUrl(url)).toBe(`${window.location.origin}${url}`);
  });
});
