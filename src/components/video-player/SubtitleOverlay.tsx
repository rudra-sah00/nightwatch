'use client';

import React from 'react';

interface SubtitleOverlayProps {
  text: string;
  isFullscreen: boolean;
}

export function SubtitleOverlay({ text, isFullscreen }: SubtitleOverlayProps) {
  if (!text) return null;

  return (
    <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none z-20">
      <div
        className="px-4 py-2 bg-black/80 rounded-lg max-w-[80%] text-center"
        style={{
          fontSize: isFullscreen ? '1.5rem' : '1.1rem',
          lineHeight: '1.4',
        }}
      >
        <span
          className="text-white font-medium drop-shadow-lg"
          dangerouslySetInnerHTML={{
            __html: text
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/\n/g, '<br/>'),
          }}
        />
      </div>
    </div>
  );
}
