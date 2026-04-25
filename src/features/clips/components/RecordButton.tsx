'use client';

interface RecordButtonProps {
  isRecording: boolean;
  duration: number;
  canStop: boolean;
  onStart: () => void;
  onStop: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function RecordButton({
  isRecording,
  duration,
  canStop,
  onStart,
  onStop,
}: RecordButtonProps) {
  if (isRecording) {
    return (
      <button
        type="button"
        onClick={canStop ? onStop : undefined}
        disabled={!canStop}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-headline font-bold uppercase tracking-widest transition-opacity disabled:opacity-50"
      >
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
        <span>REC {formatTime(duration)}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onStart}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-headline font-bold uppercase tracking-widest backdrop-blur-sm transition-colors"
      title="Record clip (max 5 min)"
    >
      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
      <span>Clip</span>
    </button>
  );
}
