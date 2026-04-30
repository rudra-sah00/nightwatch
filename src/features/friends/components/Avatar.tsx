import Image from 'next/image';

interface AvatarProps {
  name: string;
  photo: string | null;
  size?: number;
  light?: boolean;
}

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
