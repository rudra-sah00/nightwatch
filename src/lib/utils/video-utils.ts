/**
 * Video Player Utility Functions
 */

import { SubtitleCue, QualityLevel } from '@/types/video';

/**
 * Format seconds to time string (e.g., "1:23:45" or "23:45")
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get human-readable quality label from level data
 */
export function getQualityLabel(level: QualityLevel): string {
  if (level.height) {
    if (level.height >= 2160) return '4K';
    if (level.height >= 1440) return '1440p';
    if (level.height >= 1080) return '1080p';
    if (level.height >= 720) return '720p';
    if (level.height >= 480) return '480p';
    if (level.height >= 360) return '360p';
    return `${level.height}p`;
  }
  if (level.bitrate) return `${Math.round(level.bitrate / 1000)} kbps`;
  return 'Auto';
}

/**
 * Convert SRT subtitle format to VTT format
 */
export function srtToVtt(srt: string): string {
  const text = srt.replace(/\r/g, '');
  const lines = text.split('\n');
  const out: string[] = ['WEBVTT', ''];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip index numbers
    if (/^\d+$/.test(line.trim())) continue;
    
    // Convert timestamp format from SRT (comma) to VTT (dot)
    const match = line.match(/(\d{2}:\d{2}:\d{2}),(\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}),(\d{3})(.*)/);
    if (match) {
      out.push(`${match[1]}.${match[2]} --> ${match[3]}.${match[4]}${match[5] || ''}`);
      continue;
    }
    out.push(line);
  }
  
  return out.join('\n');
}

/**
 * Parse VTT/SRT content into subtitle cues
 */
export function parseSubtitleContent(content: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const lines = content.replace(/\r/g, '').split('\n');
  let i = 0;
  
  // Skip WEBVTT header and any metadata
  while (i < lines.length && !lines[i].includes('-->')) {
    i++;
  }
  
  while (i < lines.length) {
    const line = lines[i];
    const timeMatch = line.match(
      /(\d{2}:)?(\d{2}):(\d{2})[.,](\d{3})\s*-->\s*(\d{2}:)?(\d{2}):(\d{2})[.,](\d{3})/
    );
    
    if (timeMatch) {
      const startH = timeMatch[1] ? parseInt(timeMatch[1]) : 0;
      const startM = parseInt(timeMatch[2]);
      const startS = parseInt(timeMatch[3]);
      const startMs = parseInt(timeMatch[4]);
      const start = startH * 3600 + startM * 60 + startS + startMs / 1000;
      
      const endH = timeMatch[5] ? parseInt(timeMatch[5]) : 0;
      const endM = parseInt(timeMatch[6]);
      const endS = parseInt(timeMatch[7]);
      const endMs = parseInt(timeMatch[8]);
      const end = endH * 3600 + endM * 60 + endS + endMs / 1000;
      
      i++;
      const textLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('-->')) {
        textLines.push(lines[i]);
        i++;
      }
      
      if (textLines.length > 0) {
        cues.push({ start, end, text: textLines.join('\n') });
      }
    } else {
      i++;
    }
  }
  
  return cues;
}

/**
 * Check if text content is VTT format
 */
export function isVttFormat(text: string): boolean {
  return /^\uFEFF?WEBVTT/m.test(text);
}

/**
 * Check if text content is SRT format
 */
export function isSrtFormat(text: string): boolean {
  return /\d+\s*\n\s*\d{2}:\d{2}:\d{2},\d{3}\s*-->/.test(text);
}

/**
 * Convert any subtitle format to VTT
 */
export function convertToVtt(text: string): string {
  if (isVttFormat(text)) {
    return text;
  }
  if (isSrtFormat(text)) {
    return srtToVtt(text);
  }
  // Assume it's plain VTT without header
  return `WEBVTT\n\n${text.replace(/\r/g, '')}`;
}

/**
 * Clamp a number between min and max values
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Calculate percentage position from mouse event
 */
export function getPositionFromEvent(
  event: React.MouseEvent<HTMLDivElement>,
  element: HTMLDivElement
): number {
  const rect = element.getBoundingClientRect();
  return clamp((event.clientX - rect.left) / rect.width, 0, 1);
}
