'use client';

interface TitleOverlayProps {
  title?: string;
  showControls: boolean;
}

export function TitleOverlay({ title, showControls }: TitleOverlayProps) {
  if (!title || !showControls) return null;

  return (
    <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 via-black/30 to-transparent p-6 pb-16">
      <h2 className="text-white text-xl md:text-2xl font-bold drop-shadow-lg truncate">{title}</h2>
    </div>
  );
}
