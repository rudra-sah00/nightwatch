'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** Props for the {@link RecordButton} component. */
interface RecordButtonProps {
  /** Whether a recording is currently in progress. */
  isRecording: boolean;
  /** Current recording duration in seconds. */
  duration: number;
  /** Whether the minimum duration has been reached and recording can be stopped. */
  canStop: boolean;
  /** Whether the recorder is initializing. */
  isStarting?: boolean;
  /** Whether the recorder is finalizing and uploading remaining segments. */
  isStopping?: boolean;
  /** Callback to start a new recording. */
  onStart: () => void;
  /** Callback to stop the current recording. */
  onStop: () => void;
}

/**
 * Formats seconds into `m:ss` display string.
 * @param seconds - Total seconds.
 * @returns Formatted time string.
 */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Pill-shaped recording control button that cycles through idle, starting,
 * recording (with live timer), and stopping states.
 */
export function RecordButton({
  isRecording,
  duration,
  canStop,
  isStarting,
  isStopping,
  onStart,
  onStop,
}: RecordButtonProps) {
  const t = useTranslations('live');

  if (isStarting) {
    return (
      <button
        type="button"
        disabled
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/60 text-white text-xs font-headline font-bold uppercase tracking-widest"
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>{t('clipStarting')}</span>
      </button>
    );
  }

  if (isStopping) {
    return (
      <button
        type="button"
        disabled
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-600/60 text-white text-xs font-headline font-bold uppercase tracking-widest"
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>{t('clipSaving')}</span>
      </button>
    );
  }

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
      <span>{t('clip')}</span>
    </button>
  );
}
