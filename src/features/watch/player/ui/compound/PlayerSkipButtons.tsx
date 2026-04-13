import { SkipBack, SkipForward } from 'lucide-react';
import { usePlayerContext } from '../../context/PlayerContext';

export function PlayerSkipButtons() {
  const { playerHandlers, metadata, readOnly } = usePlayerContext();

  if (metadata.type === 'livestream' || readOnly) return null;

  return (
    <div className="hidden md:flex items-center gap-1 lg:gap-2">
      <button
        type="button"
        onClick={() => playerHandlers.skip(-10)}
        onMouseDown={(e) => e.preventDefault()}
        className="p-3 lg:p-4 2xl:p-5 rounded-full/20 transition-[colors,transform] duration-200 active:scale-95 group"
      >
        <SkipBack className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 text-primary-foreground group-hover:text-primary-foreground/90" />
      </button>
      <button
        type="button"
        onClick={() => playerHandlers.skip(10)}
        onMouseDown={(e) => e.preventDefault()}
        className="p-3 lg:p-4 2xl:p-5 rounded-full/20 transition-[colors,transform] duration-200 active:scale-95 group"
      >
        <SkipForward className="w-6 h-6 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 text-primary-foreground group-hover:text-primary-foreground/90" />
      </button>
    </div>
  );
}
