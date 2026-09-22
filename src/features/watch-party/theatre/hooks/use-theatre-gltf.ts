'use client';

import { useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { attachKtx2, detectKtx2Support } from '../lib/ktx2';

/**
 * Load a theatre model, with KTX2 support attached.
 *
 * Every theatre asset must come through here rather than calling `useGLTF`
 * directly. The `v3` set stores its textures as KTX2 (`KHR_texture_basisu`), and a
 * bare `GLTFLoader` throws on that extension instead of falling back — so a direct
 * `useGLTF` would fail to load the room, the chair or the avatars outright.
 *
 * `detectKtx2Support` is called before `useGLTF`, in render order rather than in an
 * effect, because `useGLTF` suspends and begins parsing immediately: an effect
 * would run after the transcode had already been attempted. It is idempotent, so
 * every model calling it costs one boolean check.
 *
 * This is also backward compatible. A `v2` model with JPEG textures ignores the
 * attached loader entirely, so the version can be rolled forward or back through
 * `THEATRE_ASSET_VERSION` with no client change.
 */
export function useTheatreGltf(url: string) {
  const gl = useThree((state) => state.gl);
  detectKtx2Support(gl);
  return useGLTF(url, false, false, attachKtx2);
}
