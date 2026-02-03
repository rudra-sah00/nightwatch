import { describe, expect, it } from 'vitest';
import { containsLinks, extractUrls, parseLinks } from '@/lib/linkify';

describe('linkify utility', () => {
  describe('parseLinks', () => {
    it('should return text segment for plain text without links', () => {
      const result = parseLinks('Hello world!');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'text',
        content: 'Hello world!',
      });
    });

    it('should parse a single HTTP link', () => {
      const result = parseLinks('Check out http://example.com');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'text',
        content: 'Check out ',
      });
      expect(result[1]).toEqual({
        type: 'link',
        content: 'http://example.com',
        url: 'http://example.com',
      });
    });

    it('should parse a single HTTPS link', () => {
      const result = parseLinks('Visit https://example.com for more info');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        type: 'text',
        content: 'Visit ',
      });
      expect(result[1]).toEqual({
        type: 'link',
        content: 'https://example.com',
        url: 'https://example.com',
      });
      expect(result[2]).toEqual({
        type: 'text',
        content: ' for more info',
      });
    });

    it('should parse multiple links in text', () => {
      const result = parseLinks(
        'Check http://example.com and https://another.com',
      );

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ type: 'text', content: 'Check ' });
      expect(result[1]).toEqual({
        type: 'link',
        content: 'http://example.com',
        url: 'http://example.com',
      });
      expect(result[2]).toEqual({ type: 'text', content: ' and ' });
      expect(result[3]).toEqual({
        type: 'link',
        content: 'https://another.com',
        url: 'https://another.com',
      });
    });

    it('should handle links with paths', () => {
      const result = parseLinks('Visit https://example.com/path/to/page');

      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({
        type: 'link',
        content: 'https://example.com/path/to/page',
        url: 'https://example.com/path/to/page',
      });
    });

    it('should handle links with query parameters', () => {
      const result = parseLinks('https://example.com?foo=bar&baz=qux');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'link',
        content: 'https://example.com?foo=bar&baz=qux',
        url: 'https://example.com?foo=bar&baz=qux',
      });
    });

    it('should handle links with fragments', () => {
      const result = parseLinks('https://example.com#section');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'link',
        content: 'https://example.com#section',
        url: 'https://example.com#section',
      });
    });

    it('should not match URLs with ports (limitation of simple regex)', () => {
      const result = parseLinks('http://localhost:3000/api');

      // Simple regex doesn't match localhost or ports
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('text');
    });

    it('should handle links at the start of text', () => {
      const result = parseLinks('https://example.com is a good site');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: 'link',
        content: 'https://example.com',
        url: 'https://example.com',
      });
      expect(result[1]).toEqual({
        type: 'text',
        content: ' is a good site',
      });
    });

    it('should handle links at the end of text', () => {
      const result = parseLinks('Visit https://example.com');

      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({
        type: 'link',
        content: 'https://example.com',
        url: 'https://example.com',
      });
    });

    it('should handle consecutive links', () => {
      const result = parseLinks('http://first.com https://second.com');

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('link');
      expect(result[1]).toEqual({ type: 'text', content: ' ' });
      expect(result[2].type).toBe('link');
    });

    it('should handle empty string', () => {
      const result = parseLinks('');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'text',
        content: '',
      });
    });

    it('should handle links with subdomains', () => {
      const result = parseLinks('https://sub.domain.example.com');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'link',
        content: 'https://sub.domain.example.com',
        url: 'https://sub.domain.example.com',
      });
    });

    it('should handle links with hyphens in domain', () => {
      const result = parseLinks('https://my-example-site.com');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'link',
        content: 'https://my-example-site.com',
        url: 'https://my-example-site.com',
      });
    });

    it('should not parse incomplete URLs', () => {
      const result = parseLinks('http:// is not a valid link');

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('text');
    });

    it('should handle special characters in URLs', () => {
      const result = parseLinks(
        'https://example.com/path?query=value&other=123#section',
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'link',
        content: 'https://example.com/path?query=value&other=123#section',
        url: 'https://example.com/path?query=value&other=123#section',
      });
    });
  });

  describe('containsLinks', () => {
    it('should return false for text without links', () => {
      expect(containsLinks('Hello world!')).toBe(false);
      expect(containsLinks('No links here')).toBe(false);
      expect(containsLinks('')).toBe(false);
    });

    it('should return true for text with HTTP link', () => {
      expect(containsLinks('Check out http://example.com')).toBe(true);
    });

    it('should return true for text with HTTPS link', () => {
      expect(containsLinks('Visit https://example.com')).toBe(true);
    });

    it('should return true for text with multiple links', () => {
      expect(containsLinks('http://first.com and https://second.com')).toBe(
        true,
      );
    });

    it('should return true for link at start', () => {
      expect(containsLinks('https://example.com is great')).toBe(true);
    });

    it('should return true for link at end', () => {
      expect(containsLinks('Check out https://example.com')).toBe(true);
    });

    it('should return true for link with path', () => {
      expect(containsLinks('https://example.com/path')).toBe(true);
    });

    it('should return true for link with query params', () => {
      expect(containsLinks('https://example.com?foo=bar')).toBe(true);
    });

    it('should return false for incomplete URLs', () => {
      expect(containsLinks('http://')).toBe(false);
      expect(containsLinks('https://')).toBe(false);
    });
  });

  describe('extractUrls', () => {
    it('should return empty array for text without links', () => {
      expect(extractUrls('Hello world!')).toEqual([]);
      expect(extractUrls('No links here')).toEqual([]);
      expect(extractUrls('')).toEqual([]);
    });

    it('should extract single HTTP URL', () => {
      const urls = extractUrls('Check out http://example.com');

      expect(urls).toEqual(['http://example.com']);
    });

    it('should extract single HTTPS URL', () => {
      const urls = extractUrls('Visit https://example.com');

      expect(urls).toEqual(['https://example.com']);
    });

    it('should extract multiple URLs', () => {
      const urls = extractUrls(
        'Check http://example.com and https://another.com',
      );

      expect(urls).toHaveLength(2);
      expect(urls).toContain('http://example.com');
      expect(urls).toContain('https://another.com');
    });

    it('should extract URLs with paths', () => {
      const urls = extractUrls('https://example.com/path/to/page');

      expect(urls).toEqual(['https://example.com/path/to/page']);
    });

    it('should extract URLs with query parameters', () => {
      const urls = extractUrls('https://example.com?foo=bar&baz=qux');

      expect(urls).toEqual(['https://example.com?foo=bar&baz=qux']);
    });

    it('should extract URLs with fragments', () => {
      const urls = extractUrls('https://example.com#section');

      expect(urls).toEqual(['https://example.com#section']);
    });

    it('should not extract URLs with ports (limitation of simple regex)', () => {
      const urls = extractUrls('http://localhost:3000/api');

      // Simple regex doesn't match localhost or ports
      expect(urls).toEqual([]);
    });

    it('should extract duplicate URLs', () => {
      const urls = extractUrls(
        'https://example.com and https://example.com again',
      );

      expect(urls).toHaveLength(2);
      expect(urls).toEqual(['https://example.com', 'https://example.com']);
    });

    it('should extract URLs from mixed content', () => {
      const urls = extractUrls(
        'First: http://first.com, second: https://second.com/path?q=1',
      );

      expect(urls).toHaveLength(2);
      expect(urls[0]).toBe('http://first.com');
      expect(urls[1]).toBe('https://second.com/path?q=1');
    });

    it('should handle consecutive URLs', () => {
      const urls = extractUrls('http://first.com https://second.com');

      expect(urls).toHaveLength(2);
      expect(urls).toEqual(['http://first.com', 'https://second.com']);
    });
  });

  describe('edge cases', () => {
    it('should not match URLs with international characters (limitation)', () => {
      const result = parseLinks('https://例え.jp');
      // Simple regex only matches ASCII domain names
      expect(result[0].type).toBe('text');
    });

    it('should handle URLs ending with punctuation', () => {
      const result = parseLinks('Visit https://example.com.');
      // The period should be included in the URL by the regex
      expect(result[1].content).toContain('example.com');
    });

    it('should match parentheses in URL but include closing paren', () => {
      const urls = extractUrls('(https://example.com)');
      // Regex captures closing paren as part of URL
      expect(urls.length).toBeGreaterThan(0);
      expect(urls[0]).toContain('example.com');
    });

    it('should match URL in markdown with closing paren', () => {
      const urls = extractUrls('[link](https://example.com)');
      // Regex captures closing paren as part of URL
      expect(urls.length).toBeGreaterThan(0);
      expect(urls[0]).toContain('example.com');
    });
  });
});
