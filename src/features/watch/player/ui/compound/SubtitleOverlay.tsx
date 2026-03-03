'use client';

import { useSubtitleOverlay } from './use-subtitle-overlay';

interface SubtitleOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentTrackId: string | null;
}

/**
 * Strip HTML-like tags from VTT cue text and decode common HTML entities.
 *
 * VTT cues can contain styling tags like <i>, <b>, <c.color> and entities
 * like &amp; &#160; &lt;. We strip all tags (safe), then decode only the
 * known-safe entity set so the display text is correct. The result is rendered
 * as a React text node — no dangerouslySetInnerHTML needed.
 */
function stripAndDecodeCueText(raw: string): string {
  // Strip all HTML-like tags first
  const stripped = raw.replace(/<[^>]*>/g, '');
  // Decode a safe allow-list of HTML entities common in VTT subtitle files
  return stripped
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, '\u00a0')
    .replace(/&#160;/g, '\u00a0')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}
export function SubtitleOverlay({
  videoRef,
  currentTrackId,
}: SubtitleOverlayProps) {
  const { cueText } = useSubtitleOverlay({ videoRef, currentTrackId });

  if (!cueText) return null;

  return (
    <section
      className="absolute bottom-[12%] left-0 right-0 flex justify-center pointer-events-none z-20 px-4"
      aria-live="polite"
      aria-label="Subtitle"
    >
      <div
        className="max-w-[80%] text-center leading-snug"
        style={{
          fontSize: `var(--subtitle-font-size, 1.25rem)`,
          fontFamily: `var(--subtitle-font-family, sans-serif)`,
          color: `var(--subtitle-text-color, white)`,
          backgroundColor: `var(--subtitle-bg-color, rgba(0,0,0,0.75))`,
          textShadow: `var(--subtitle-text-shadow, none)`,
          opacity: `var(--subtitle-opacity, 1)`,
          padding: '0.2em 0.5em',
          borderRadius: '4px',
          whiteSpace: 'pre-line',
        }}
      >
        {stripAndDecodeCueText(cueText)}
      </div>
    </section>
  );
}
