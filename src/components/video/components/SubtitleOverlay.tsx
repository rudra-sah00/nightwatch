'use client';

import React, { useMemo } from 'react';

interface SubtitleOverlayProps {
  text: string;
  isFullscreen: boolean;
  fontSize?: 'small' | 'medium' | 'large';
  backgroundColor?: 'transparent' | 'semi' | 'solid';
}

export function SubtitleOverlay({ 
  text, 
  isFullscreen,
  fontSize = 'medium',
  backgroundColor = 'semi'
}: SubtitleOverlayProps) {
  // Process text for common subtitle formatting with improved handling
  const processedText = useMemo(() => {
    if (!text) return '';
    
    return text
      // Escape HTML first
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Convert newlines to br
      .replace(/\n/g, '<br/>')
      // Handle SSA/ASS italic markers
      .replace(/\{\\i1\}(.*?)\{\\i0\}/g, '<em>$1</em>')
      .replace(/\{\\i\}(.*?)\{\\i0?\}/g, '<em>$1</em>')
      // Handle SSA/ASS bold markers
      .replace(/\{\\b1\}(.*?)\{\\b0\}/g, '<strong>$1</strong>')
      .replace(/\{\\b\}(.*?)\{\\b0?\}/g, '<strong>$1</strong>')
      // Handle SSA/ASS underline
      .replace(/\{\\u1\}(.*?)\{\\u0\}/g, '<u>$1</u>')
      // Handle VTT voice tags
      .replace(/<v\s+([^>]+)>/gi, '')
      .replace(/<\/v>/gi, '')
      // Handle VTT class tags
      .replace(/<c\.([^>]+)>/gi, '')
      .replace(/<\/c>/gi, '')
      // Strip any remaining ASS tags
      .replace(/\{[^}]*\}/g, '');
  }, [text]);

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
    <div 
      className="absolute bottom-14 sm:bottom-16 md:bottom-20 lg:bottom-24 left-0 right-0 flex justify-center pointer-events-none z-20 px-2 sm:px-4 md:px-8"
    >
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
          dangerouslySetInnerHTML={{
            __html: processedText,
          }}
        />
      </div>
    </div>
  );
}
