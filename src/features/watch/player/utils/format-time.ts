/**
 * Formats a duration in seconds to a human-readable time string.
 * Hoisted to a shared module so SeekBar and PlayerTimeDisplay don't
 * each define their own copy (rule 7.4 / rule 6.3).
 *
 * Examples:
 *   75   → "1:15"
 *   3661 → "1:01:01"
 *   NaN  → "0:00"
 */
export function formatTime(seconds: number): string {
  if (Number.isNaN(seconds) || !Number.isFinite(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}
