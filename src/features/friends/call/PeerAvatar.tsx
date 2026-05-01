import Image from 'next/image';
import type { CallPeer } from '@/features/friends/hooks/use-call';

/**
 * Circular avatar for a voice-call peer, using a light-on-dark color scheme.
 *
 * Renders the peer's profile photo or a single-letter initial fallback.
 *
 * @param props.peer - The {@link CallPeer} to display.
 * @param props.size - Pixel size for width and height. @defaultValue 40
 */
export function PeerAvatar({
  peer,
  size = 40,
}: {
  peer: CallPeer;
  size?: number;
}) {
  if (peer.photo) {
    return (
      <Image
        src={peer.photo}
        alt={peer.name}
        width={size}
        height={size}
        className="rounded-full border-2 border-white/20 object-cover"
        unoptimized
      />
    );
  }
  return (
    <div
      className="rounded-full border-2 border-white/20 bg-white/10 flex items-center justify-center font-headline font-black text-white uppercase"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {peer.name[0]}
    </div>
  );
}
