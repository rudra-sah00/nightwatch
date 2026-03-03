import { ArrowLeft, Users } from 'lucide-react';
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
          className="p-3 lg:p-4 2xl:p-5 rounded-full bg-white/5 hover:bg-white/20 transition-[colors,transform] duration-200 active:scale-95 backdrop-blur-sm border border-white/10 flex-shrink-0"
        >
          <ArrowLeft className="w-6 h-6 md:w-7 md:h-7 lg:w-8 lg:h-8 2xl:w-9 2xl:h-9 text-white" />
        </button>
      ) : null}

      {onSidebarToggle ? (
        <button
          type="button"
          onClick={onSidebarToggle}
          onMouseDown={(e) => e.preventDefault()}
          className="group flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 2xl:px-5 2xl:py-3 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 transition-[colors,transform] duration-300 active:scale-95 backdrop-blur-sm border border-indigo-500/30 hover:border-indigo-400/50 flex-shrink-0 shadow-lg shadow-indigo-500/10"
          title="Toggle Watch Party sidebar"
        >
          <Users className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 2xl:w-8 2xl:h-8 text-indigo-300 group-hover:text-indigo-200 transition-colors duration-300" />
          <span className="hidden lg:inline text-sm 2xl:text-base font-medium text-indigo-200 group-hover:text-white transition-colors duration-300">
            Party
          </span>
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50" />
        </button>
      ) : null}

      <div className="flex-1 min-w-0">
        <h1 className="text-white font-semibold text-lg md:text-2xl lg:text-3xl 2xl:text-4xl truncate drop-shadow-lg">
          {metadata.title}
        </h1>
        {metadata.type === 'series' && metadata.season && metadata.episode ? (
          <p className="text-white/60 text-sm md:text-base lg:text-lg 2xl:text-xl">
            Season {metadata.season} · Episode {metadata.episode}
          </p>
        ) : null}
      </div>
    </div>
  );
}
