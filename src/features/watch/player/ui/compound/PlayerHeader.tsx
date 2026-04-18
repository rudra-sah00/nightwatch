import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePlayerContext } from '../../context/PlayerContext';

interface PlayerHeaderProps {
  onSidebarToggle?: () => void;
  isSidebarOpen?: boolean;
  hideBackButton?: boolean;
}

export function PlayerHeader({
  onSidebarToggle,
  isSidebarOpen,
  hideBackButton,
}: PlayerHeaderProps) {
  const { metadata, playerHandlers } = usePlayerContext();

  return (
    <header
      className={cn(
        'player-header absolute top-0 left-0 right-0 p-4 sm:p-6 lg:p-8 2xl:p-10 hidden sm:flex items-center gap-4 lg:gap-6 z-20 pointer-events-auto transition-opacity duration-300 opacity-100',
      )}
    >
      {!hideBackButton ? (
        <Button
          type="button"
          variant="default"
          size="icon"
          onClick={playerHandlers.goBack}
          onMouseDown={(e) => e.preventDefault()}
          className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-primary-foreground transition-colors cursor-pointer border-transparent"
        >
          <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
        </Button>
      ) : null}

      {onSidebarToggle ? (
        <Button
          type="button"
          variant="default"
          size="icon"
          onClick={onSidebarToggle}
          onMouseDown={(e) => e.preventDefault()}
          className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-primary-foreground transition-colors cursor-pointer border-transparent"
          title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {isSidebarOpen ? (
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
          ) : (
            <ArrowRight className="w-5 h-5 md:w-6 md:h-6 stroke-[3px]" />
          )}
        </Button>
      ) : null}

      <div className="flex-1 min-w-0">
        <h1 className="text-white font-black font-headline uppercase tracking-wider text-xl md:text-3xl lg:text-4xl 2xl:text-5xl truncate drop-shadow-md">
          {metadata.title}
        </h1>
        {metadata.type === 'series' && metadata.season && metadata.episode ? (
          <p className="text-neo-yellow font-black font-headline uppercase tracking-widest text-sm md:text-base lg:text-xl mt-1 drop-shadow-md">
            Season {metadata.season} · Episode {metadata.episode}
          </p>
        ) : null}
      </div>
    </header>
  );
}
