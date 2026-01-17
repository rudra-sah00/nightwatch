'use client';

import type React from 'react';
import { useMemo } from 'react';

interface SubtitleOverlayProps {
  text: string;
  isFullscreen: boolean;
  fontSize?: 'small' | 'medium' | 'large';
  backgroundColor?: 'transparent' | 'semi' | 'solid';
}

interface TextSegment {
  type: 'text' | 'em' | 'strong' | 'u' | 'br';
  content?: string;
  key: string;
}

interface MatchInfo {
  match: RegExpMatchArray;
  type: 'em' | 'strong' | 'u';
  index: number;
}

/**
 * Parse subtitle text and extract formatting
 * Returns an array of segments that can be safely rendered
 */
function parseSubtitleText(text: string): TextSegment[] {
  if (!text) return [];

  const segments: TextSegment[] = [];
  let keyIndex = 0;

  // First, clean up the text - remove VTT/ASS tags we don't need
  const cleanedText = text
    // Handle VTT voice tags
    .replace(/<v\s+[^>]+>/gi, '')
    .replace(/<\/v>/gi, '')
    // Handle VTT class tags
    .replace(/<c\.[^>]+>/gi, '')
    .replace(/<\/c>/gi, '')
    // Strip any ASS tags we don't process
    .replace(/\{[^}]*\}/g, '');

  // Now process the text for formatting
  // Split by newlines first
  const lines = cleanedText.split('\n');

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    // Process each line for inline formatting
    let remaining = line;

    while (remaining.length > 0) {
      // Look for formatting patterns
      const italicMatch = remaining.match(/\{\\i1?\}(.*?)\{\\i0?\}/);
      const boldMatch = remaining.match(/\{\\b1?\}(.*?)\{\\b0?\}/);
      const underlineMatch = remaining.match(/\{\\u1?\}(.*?)\{\\u0?\}/);

      // Collect all valid matches with their positions
      const matches: MatchInfo[] = [];

      if (italicMatch && italicMatch.index !== undefined) {
        matches.push({ match: italicMatch, type: 'em', index: italicMatch.index });
      }
      if (boldMatch && boldMatch.index !== undefined) {
        matches.push({ match: boldMatch, type: 'strong', index: boldMatch.index });
      }
      if (underlineMatch && underlineMatch.index !== undefined) {
        matches.push({ match: underlineMatch, type: 'u', index: underlineMatch.index });
      }

      // Sort by index to find the first match
      matches.sort((a, b) => a.index - b.index);
      const firstMatch = matches[0];

      if (firstMatch) {
        // Add text before the match
        if (firstMatch.index > 0) {
          const beforeText = remaining.substring(0, firstMatch.index);
          if (beforeText) {
            segments.push({
              type: 'text',
              content: beforeText,
              key: `text-${keyIndex++}`,
            });
          }
        }

        // Add the formatted segment
        segments.push({
          type: firstMatch.type,
          content: firstMatch.match[1],
          key: `${firstMatch.type}-${keyIndex++}`,
        });

        // Move past the match
        remaining = remaining.substring(firstMatch.index + firstMatch.match[0].length);
      } else {
        // No more formatting, add the rest as plain text
        if (remaining) {
          segments.push({
            type: 'text',
            content: remaining,
            key: `text-${keyIndex++}`,
          });
        }
        remaining = '';
      }
    }

    // Add line break if not the last line
    if (lineIndex < lines.length - 1) {
      segments.push({
        type: 'br',
        key: `br-${keyIndex++}`,
      });
    }
  }

  return segments;
}

/**
 * Render a text segment as a React element
 */
function renderSegment(segment: TextSegment): React.ReactNode {
  switch (segment.type) {
    case 'em':
      return <em key={segment.key}>{segment.content}</em>;
    case 'strong':
      return <strong key={segment.key}>{segment.content}</strong>;
    case 'u':
      return <u key={segment.key}>{segment.content}</u>;
    case 'br':
      return <br key={segment.key} />;
    default:
      return <span key={segment.key}>{segment.content}</span>;
  }
}

export function SubtitleOverlay({
  text,
  isFullscreen,
  fontSize = 'medium',
  backgroundColor = 'semi',
}: SubtitleOverlayProps) {
  // Parse and process text safely without dangerouslySetInnerHTML
  const segments = useMemo(() => parseSubtitleText(text), [text]);

  if (!text) return null;

  // Font size mapping - enhanced for mobile
  const fontSizeMap = {
    small: isFullscreen ? 'clamp(1rem, 2.5vw, 1.75rem)' : 'clamp(0.7rem, 1.8vw, 1rem)',
    medium: isFullscreen ? 'clamp(1.25rem, 3vw, 2.5rem)' : 'clamp(0.85rem, 2.2vw, 1.35rem)',
    large: isFullscreen ? 'clamp(1.5rem, 3.5vw, 3rem)' : 'clamp(1rem, 2.8vw, 1.6rem)',
  };

  // Background styles
  const bgStyleMap = {
    transparent: 'bg-transparent',
    semi: 'bg-black/75 backdrop-blur-sm',
    solid: 'bg-black/95',
  };

  return (
    <div className="absolute bottom-14 sm:bottom-16 md:bottom-20 lg:bottom-24 left-0 right-0 flex justify-center pointer-events-none z-20 px-2 sm:px-4 md:px-8">
      <div
        className={`
          px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 md:py-3 rounded-md sm:rounded-lg max-w-[98%] sm:max-w-[95%] md:max-w-[80%] text-center
          ${bgStyleMap[backgroundColor]}
          transition-all duration-200 ease-out
        `}
        style={{
          fontSize: fontSizeMap[fontSize],
          lineHeight: '1.5',
        }}
      >
        <span
          className="text-white font-semibold tracking-wide leading-relaxed"
          style={{
            textShadow: `
              0 0 8px rgba(0,0,0,0.95),
              0 2px 4px rgba(0,0,0,0.9),
              1px 1px 2px rgba(0,0,0,0.85),
              -1px -1px 2px rgba(0,0,0,0.85)
            `,
            WebkitFontSmoothing: 'antialiased',
          }}
        >
          {segments.map(renderSegment)}
        </span>
      </div>
    </div>
  );
}
