/**
 * Link parsing and rendering utilities for chat messages
 */

export interface TextSegment {
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

  // Reset regex index
  URL_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex pattern matching
  while ((match = URL_REGEX.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    // Add the URL
    segments.push({
      type: 'link',
      content: match[0],
      url: match[0],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  // If no links found, return the whole text as one segment
  if (segments.length === 0) {
    segments.push({
      type: 'text',
      content: text,
    });
  }

  return segments;
}

/**
 * Check if text contains any URLs
 * @param text - The text to check
 * @returns true if text contains at least one URL
 */
export function containsLinks(text: string): boolean {
  URL_REGEX.lastIndex = 0;
  return URL_REGEX.test(text);
}

/**
 * Extract all URLs from text
 * @param text - The text to extract URLs from
 * @returns Array of URLs found in the text
 */
export function extractUrls(text: string): string[] {
  const urls: string[] = [];
  URL_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: Standard regex pattern matching
  while ((match = URL_REGEX.exec(text)) !== null) {
    urls.push(match[0]);
  }

  return urls;
}
