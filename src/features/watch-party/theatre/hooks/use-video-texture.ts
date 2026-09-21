'use client';

import { useEffect, useState } from 'react';
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
 * Returns null until the element has enough data to sample. Binding a texture to
 * an empty video paints garbage or throws on some drivers.
 */
export function useVideoTexture(
  video: HTMLVideoElement | null | undefined,
): VideoTexture | null {
  const [texture, setTexture] = useState<VideoTexture | null>(null);

  useEffect(() => {
    if (!video) {
      setTexture(null);
      return;
    }

    let created: VideoTexture | null = null;

    function attach() {
      if (created || !video) return;
      // HAVE_CURRENT_DATA — there is at least one frame to show
      if (video.readyState < 2) return;
      const t = new VideoTexture(video);
      // Video frames are already sRGB; without this the picture renders washed out
      t.colorSpace = SRGBColorSpace;
      t.generateMipmaps = false;
      created = t;
      setTexture(t);
    }

    attach();
    video.addEventListener('loadeddata', attach);
    video.addEventListener('canplay', attach);

    return () => {
      video.removeEventListener('loadeddata', attach);
      video.removeEventListener('canplay', attach);
      if (created) {
        created.dispose();
        created = null;
      }
      setTexture(null);
    };
  }, [video]);

  return texture;
}
