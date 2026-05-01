import Image from 'next/image';

/** Props for the {@link Avatar} component. */
interface AvatarProps {
  /** Display name used for the alt text and initial fallback. */
  name: string;
  /** URL of the profile photo, or `null` to show the initial fallback. */
  photo: string | null;
  /** Pixel size for width and height. @defaultValue 32 */
  size?: number;
  /** When `true`, uses light-on-dark styling for overlay contexts. */
  light?: boolean;
}

/**
 * Circular avatar that renders a profile photo or a single-letter initial fallback.
 *
 * @param props - {@link AvatarProps}
 */
export function Avatar({ name, photo, size = 32, light }: AvatarProps) {
  if (photo) {
    return (
      <Image
        src={photo}
        alt={name}
        width={size}
        height={size}
        className="rounded-full border-2 border-border object-cover shrink-0"
        unoptimized
      />
    );
  }
  return (
    <div
      className={`rounded-full border-2 flex items-center justify-center font-headline font-black text-[10px] uppercase shrink-0 ${
        light
          ? 'border-white/20 bg-white/10 text-white'
          : 'border-border bg-muted'
      }`}
      style={{ width: size, height: size }}
    >
      {name[0]}
    </div>
  );
}
