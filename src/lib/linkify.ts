/**
 * Link parsing and rendering utilities for chat messages
 */

interface TextSegment {
  id: string;
  type: 'text' | 'link';
  content: string;
  url?: string;
}

// URL regex pattern that matches http(s) URLs
const URL_REGEX =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/gi;

/**
 * Parse text and identify URLs for clickable links
 * @param text - The text to parse
 * @returns Array of text segments with links identified
 */
export function parseLinks(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_REGEX)) {
    // Add text before the URL
    if (match.index > lastIndex) {
      segments.push({
        id: `text-${lastIndex}`,
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    // Add the URL
    segments.push({
      id: `link-${match.index}`,
      type: 'link',
      content: match[0],
      url: match[0],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      id: `text-${lastIndex}`,
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  // If no links found, return the whole text as one segment
  if (segments.length === 0) {
    segments.push({
      id: 'text-0',
      type: 'text',
      content: text,
    });
  }

  return segments;
}
