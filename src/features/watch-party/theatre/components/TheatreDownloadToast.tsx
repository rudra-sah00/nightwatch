'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useTheatreView } from '../lib/view-mode';

/**
 * Circular download indicator for the theatre asset toast.
 *
 * An SVG ring rather than a bar because the toast is narrow and the number in
 * the middle is the thing people actually read. Rotated -90deg so it fills
 * clockwise from twelve o'clock.
 *
 * Kept presentational and prop-driven so it can be rendered in a test or a
 * story without the store.
 */
export function ProgressRing({
  fraction,
  label,
  indeterminate = false,
  tone = 'default',
}: {
  fraction: number;
  label: string;
  /** Sizes unknown — show a neutral ring instead of a misleading 0%. */
  indeterminate?: boolean;
  tone?: 'default' | 'error';
}) {
  const RADIUS = 26;
  const STROKE = 6;
  const SIZE = (RADIUS + STROKE) * 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const safe = Number.isFinite(fraction)
    ? Math.min(1, Math.max(0, fraction))
    : 0;
  const offset = indeterminate
    ? CIRCUMFERENCE * 0.75
    : CIRCUMFERENCE * (1 - safe);

  return (
    <div
      className="relative shrink-0"
      style={{ width: SIZE, height: SIZE }}
      role="progressbar"
      aria-label="3D theatre download progress"
      aria-valuemin={0}
      aria-valuemax={100}
      // Omitted while indeterminate so assistive tech announces "busy"
      // rather than a percentage we do not actually know.
      aria-valuenow={indeterminate ? undefined : Math.round(safe * 100)}
      aria-valuetext={label}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className={indeterminate ? 'motion-safe:animate-spin' : undefined}
        aria-hidden="true"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-border/30"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          strokeLinecap="butt"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          className={[
            tone === 'error' ? 'stroke-destructive' : 'stroke-primary',
            // No transition while spinning, or the dash fights the rotation.
            indeterminate
              ? ''
              : 'motion-safe:transition-[stroke-dashoffset] motion-safe:duration-200 motion-safe:ease-out',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      </svg>
      {!indeterminate && (
        <span className="absolute inset-0 flex items-center justify-center font-headline text-sm font-bold tabular-nums">
          {Math.round(safe * 100)}%
        </span>
      )}
    </div>
  );
}

/** "12.4 MB / 38.1 MB", or just the downloaded figure when the total is unknown. */
function byteLabel(received: number, total: number): string {
  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)} MB`;
  if (total <= 0) return mb(received);
  return `${mb(received)} / ${mb(total)}`;
}

/**
 * The persistent download card shown inside the sonner toast.
 *
 * Subscribes to the view store itself rather than taking progress as a prop.
 * That is the whole reason this stays mounted: sonner is told about the toast
 * once, and every byte update re-renders only this component. Calling
 * `toast.custom()` on each chunk would rebuild the toast dozens of times a
 * second.
 */
export function TheatreDownloadCard() {
  const phase = useTheatreView((s) => s.phase);
  const progress = useTheatreView((s) => s.progress);
  const receivedBytes = useTheatreView((s) => s.receivedBytes);
  const totalBytes = useTheatreView((s) => s.totalBytes);
  const filesDone = useTheatreView((s) => s.filesDone);
  const fileCount = useTheatreView((s) => s.fileCount);
  const attempt = useTheatreView((s) => s.attempt);
  const error = useTheatreView((s) => s.error);
  const retry = useTheatreView((s) => s.retry);
  const disable = useTheatreView((s) => s.disable);

  const failed = phase === 'error';
  // Before the HEAD probes land we know neither total nor received, and showing
  // "0%" then would read as a stall rather than a start.
  const indeterminate = !failed && totalBytes <= 0 && receivedBytes <= 0;

  return (
    <div
      className="flex w-full items-center gap-4 border-4 border-border bg-background p-4 text-foreground"
      // Polite so the running percentage does not interrupt a screen reader
      // mid-sentence on every update.
      role="status"
      aria-live="polite"
    >
      <ProgressRing
        fraction={progress}
        indeterminate={indeterminate}
        tone={failed ? 'error' : 'default'}
        label={
          failed
            ? `Download failed: ${error ?? 'unknown error'}`
            : byteLabel(receivedBytes, totalBytes)
        }
      />

      <div className="min-w-0 flex-1">
        <p className="font-headline text-sm font-bold uppercase tracking-widest">
          {failed ? 'Download failed' : 'Downloading 3D theatre'}
        </p>

        <p className="mt-0.5 truncate font-body text-sm font-medium opacity-80 tabular-nums">
          {failed
            ? (error ?? 'Something went wrong')
            : byteLabel(receivedBytes, totalBytes)}
        </p>

        <p className="mt-0.5 truncate font-body text-xs font-medium opacity-60">
          {failed
            ? 'Files already downloaded are kept.'
            : attempt > 1
              ? `Reconnecting — attempt ${attempt}`
              : fileCount > 0
                ? `${filesDone} of ${fileCount} files`
                : 'Checking file sizes'}
        </p>

        {failed && (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={retry}
              className="border-4 border-border bg-primary px-3 py-1 font-headline text-xs font-bold uppercase tracking-widest text-primary-foreground"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={disable}
              className="border-4 border-border bg-muted px-3 py-1 font-headline text-xs font-bold uppercase tracking-widest text-foreground"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Stable id so every update targets the one toast instead of stacking new ones. */
export const DOWNLOAD_TOAST_ID = 'theatre-asset-download';

/**
 * Owns the lifetime of the persistent download toast.
 *
 * The toast is created once when the download starts and is given
 * `duration: Infinity` with `dismissible: false`, so it cannot time out or be
 * swiped away while bytes are still moving — the user asked for it to stay until
 * the download is actually finished. It is only ever removed by this hook:
 *
 *  - `ready`  -> dismissed, replaced by the short "press V" success toast.
 *  - `error`  -> kept, but becomes dismissible and grows Retry / Cancel buttons.
 *  - `idle`   -> dismissed, which is how Cancel and the settings toggle clear it.
 *
 * Note it does NOT re-render the toast on progress: `TheatreDownloadCard`
 * subscribes to the store on its own, so sonner is touched only on a phase
 * change. Recreating the toast on every chunk would restart its animation and
 * churn the DOM many times a second.
 */
export function useTheatreDownloadToast() {
  const phase = useTheatreView((s) => s.phase);

  useEffect(() => {
    if (phase !== 'downloading' && phase !== 'error') {
      toast.dismiss(DOWNLOAD_TOAST_ID);
      return;
    }

    toast.custom(() => <TheatreDownloadCard />, {
      id: DOWNLOAD_TOAST_ID,
      duration: Number.POSITIVE_INFINITY,
      // A failed download is dismissible: the user may not want to retry, and
      // trapping an error card on screen with no way out would be hostile.
      dismissible: phase === 'error',
      // The card draws its own neo-brutalist border, so sonner's wrapper styling
      // would double it up.
      unstyled: true,
      classNames: { toast: 'w-full' },
    });
  }, [phase]);

  // Never leave the toast behind if the party unmounts mid-download.
  useEffect(
    () => () => {
      toast.dismiss(DOWNLOAD_TOAST_ID);
    },
    [],
  );
}
