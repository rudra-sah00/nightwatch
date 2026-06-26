'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatTime } from '@/features/music/utils';

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
      title={t('clipRecordTitle')}
    >
      <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
      <span>{t('clip')}</span>
    </button>
  );
}
