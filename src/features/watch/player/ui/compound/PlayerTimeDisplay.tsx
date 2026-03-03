import { usePlayerContext } from '../../context/PlayerContext';

const formatTime = (seconds: number) => {
  if (Number.isNaN(seconds) || !Number.isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export function PlayerTimeDisplay() {
  const { state, metadata } = usePlayerContext();

  if (metadata.type === 'livestream') return null;

  return (
    <div className="text-white text-sm md:text-base lg:text-lg 2xl:text-xl font-medium ml-2 md:ml-3 lg:ml-4 2xl:ml-5 tabular-nums flex-shrink-0">
      <span>{formatTime(state.currentTime)}</span>
      <span className="text-white/50 mx-1 md:mx-2 lg:mx-3 2xl:mx-4">/</span>
      <span className="text-white/70">{formatTime(state.duration)}</span>
    </div>
  );
}
