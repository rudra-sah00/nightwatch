'use client';

interface TvPlayerOverlayProps {
  title: string;
  subtitle?: string;
  participants?: { id: string; name: string; profilePhoto?: string }[];
}

/**
 * Top overlay for the TV player showing title, episode info, and watch-together participants.
 */
export function TvPlayerOverlay({
  title,
  subtitle,
  participants,
}: TvPlayerOverlayProps) {
  return (
    <div className="absolute top-0 left-0 right-0 p-8 bg-gradient-to-b from-black/80 via-black/40 to-transparent z-20 flex items-start justify-between">
      {/* Title info */}
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold truncate">{title}</h1>
        {subtitle && (
          <p className="text-sm text-white/60 mt-1 truncate">{subtitle}</p>
        )}
      </div>

      {/* Watch-together participants */}
      {participants && participants.length > 0 && (
        <div className="flex items-center gap-2 ml-6 shrink-0">
          <span className="material-symbols-outlined text-sm text-white/60">
            group
          </span>
          <div className="flex -space-x-2">
            {participants.slice(0, 5).map((p) => (
              <div
                key={p.id}
                className="w-8 h-8 rounded-full border-2 border-black bg-indigo-600 flex items-center justify-center overflow-hidden"
                title={p.name}
              >
                {p.profilePhoto ? (
                  <img
                    src={p.profilePhoto}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-bold text-white">
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            ))}
            {participants.length > 5 && (
              <div className="w-8 h-8 rounded-full border-2 border-black bg-white/20 flex items-center justify-center">
                <span className="text-xs font-bold">
                  +{participants.length - 5}
                </span>
              </div>
            )}
          </div>
          <span className="text-xs text-white/50 ml-1">
            {participants.length} watching
          </span>
        </div>
      )}
    </div>
  );
}
