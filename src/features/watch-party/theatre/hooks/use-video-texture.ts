'use client';

import { type RefObject, useEffect, useState } from 'react';
import { SRGBColorSpace, VideoTexture } from 'three';

/**
 * Wraps the party's existing HLS `<video>` element as a three.js texture.
 *
 * Nothing new is fetched or decoded. The element is the one `Player.Root`
 * already owns, which is why the 3D overlay keeps that player mounted rather
 * than swapping it out — playback, party sync, audio and subtitles all continue
 * to run through it, and the theatre screen is just another consumer of the same
 * decoded frames.
 *
 * Takes the REF, not `ref.current`. Reading `.current` in the caller's render
 * and passing the element down cannot work: React does not re-render when a
 * ref's contents change, so if the `<video>` had not mounted yet at first paint
 * the scene would hold `null` forever and the screen would stay blank for the
 * whole session. That was a real bug. Resolving the element inside an effect,
 * and polling briefly until it exists, makes mount order irrelevant.
 *
 * Returns null until the element has enough data to sample. Binding a texture to
 * an empty video paints garbage or throws on some drivers.
 */
export function useVideoTexture(
  videoRef: RefObject<HTMLVideoElement | null> | null | undefined,
): VideoTexture | null {
  const [texture, setTexture] = useState<VideoTexture | null>(null);

  useEffect(() => {
    if (!videoRef) {
      setTexture(null);
      return;
    }

    let created: VideoTexture | null = null;
    let element: HTMLVideoElement | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;

    function attach() {
      if (created || !element) return;
      // HAVE_CURRENT_DATA — there is at least one frame to show
      if (element.readyState < 2) return;
      const t = new VideoTexture(element);
      // Video frames are already sRGB; without this the picture renders washed out
      t.colorSpace = SRGBColorSpace;
      t.generateMipmaps = false;
      created = t;
      setTexture(t);
    }

    function bind(el: HTMLVideoElement) {
      element = el;
      el.addEventListener('loadeddata', attach);
      el.addEventListener('canplay', attach);
      attach();
    }

    const initial = videoRef.current;
    if (initial) {
      bind(initial);
    } else {
      // The player mounts its <video> independently of this scene, so wait for
      // it rather than giving up on the first frame.
      poll = setInterval(() => {
        const el = videoRef.current;
        if (!el) return;
        if (poll) {
          clearInterval(poll);
          poll = null;
        }
        bind(el);
      }, 200);
    }

    return () => {
      if (poll) clearInterval(poll);
      if (element) {
        element.removeEventListener('loadeddata', attach);
        element.removeEventListener('canplay', attach);
      }
      if (created) {
        created.dispose();
        created = null;
      }
      setTexture(null);
    };
  }, [videoRef]);

  return texture;
}
