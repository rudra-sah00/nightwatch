import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePlayerContext } from '../../context/PlayerContext';

interface PlayerHeaderProps {
  onSidebarToggle?: () => void;
  hideBackButton?: boolean;
}

export function PlayerHeader({
  onSidebarToggle,
  hideBackButton,
}: PlayerHeaderProps) {
  const { metadata, state, playerHandlers } = usePlayerContext();

  return (
    <div
      className={cn(
        'absolute top-0 left-0 right-0 p-4 sm:p-6 lg:p-8 2xl:p-10 hidden sm:flex items-center gap-4 lg:gap-6 z-20 pointer-events-auto transition-opacity duration-300',
        state.isLoading ? 'opacity-0 pointer-events-none' : 'opacity-100',
      )}
    >
      {!hideBackButton ? (
        <button
          type="button"
          onClick={playerHandlers.goBack}
          onMouseDown={(e) => e.preventDefault()}
          className="p-3 lg:p-4 bg-white border-[3px] border-[#1a1a1a] neo-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none hover:bg-[#ffe066] active:bg-[#ffcc00] transition-all duration-200 flex-shrink-0 text-[#1a1a1a]"
        >
          <ArrowLeft className="w-6 h-6 md:w-7 md:h-7 stroke-[3px]" />
        </button>
      ) : null}

      {onSidebarToggle ? (
        <button
          type="button"
          onClick={onSidebarToggle}
          onMouseDown={(e) => e.preventDefault()}
          className="p-3 bg-[#0055ff] border-[4px] border-[#1a1a1a] neo-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:bg-[#0044cc] transition-all duration-200 flex-shrink-0 cursor-pointer text-white"
          title="Toggle Watch Party sidebar"
        >
          <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
        </button>
      ) : null}

      <div className="flex-1 min-w-0">
        <h1
          className="text-white font-black font-headline uppercase tracking-wider text-xl md:text-3xl lg:text-4xl 2xl:text-5xl truncate"
          style={{ textShadow: '4px 4px 0px #1a1a1a' }}
        >
          {metadata.title}
        </h1>
        {metadata.type === 'series' && metadata.season && metadata.episode ? (
          <p
            className="text-[#ffcc00] font-black font-headline uppercase tracking-widest text-sm md:text-base lg:text-xl mt-1"
            style={{ textShadow: '2px 2px 0px #1a1a1a' }}
          >
            Season {metadata.season} · Episode {metadata.episode}
          </p>
        ) : null}
      </div>
    </div>
  );
}
