import { usePlayerContext } from '../../context/PlayerContext';
import { formatTime } from '../../utils/format-time';

export function PlayerTimeDisplay() {
  const { state, metadata } = usePlayerContext();

  if (metadata.type === 'livestream') return null;

  return (
    <div className="bg-white border-[3px] border-[#1a1a1a] px-3 py-1.5 text-[#1a1a1a] text-xs md:text-sm lg:text-base 2xl:text-lg font-black font-headline uppercase tracking-widest ml-2 md:ml-3 lg:ml-4 2xl:ml-5 tabular-nums flex-shrink-0 neo-shadow-sm">
      <span>{formatTime(state.currentTime)}</span>
      <span className="text-[#1a1a1a]/50 mx-2 md:mx-3">/</span>
      <span className="text-[#1a1a1a]/80">{formatTime(state.duration)}</span>
    </div>
  );
}
