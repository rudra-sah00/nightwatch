import { describe, expect, it } from 'vitest';
import { parseLinks } from '@/lib/linkify';

describe('linkify utility', () => {
  describe('parseLinks', () => {
    it('should return text segment for plain text without links', () => {
      const result = parseLinks('Hello world!');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          type: 'text',
          content: 'Hello world!',
        }),
      );
    });

    it('should parse a single HTTP link', () => {
      const result = parseLinks('Check out http://example.com');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          type: 'text',
          content: 'Check out ',
        }),
      );
      expect(result[1]).toEqual(
        expect.objectContaining({
          type: 'link',
          content: 'http://example.com',
          url: 'http://example.com',
        }),
      );
    });

    it('should parse a single HTTPS link', () => {
      const result = parseLinks('Visit https://example.com for more info');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(
        expect.objectContaining({
          type: 'text',
          content: 'Visit ',
        }),
      );
      expect(result[1]).toEqual(
        expect.objectContaining({
          type: 'link',
          content: 'https://example.com',
          url: 'https://example.com',
        }),
      );
      expect(result[2]).toEqual(
        expect.objectContaining({
          type: 'text',
          content: ' for more info',
        }),
      );
    });

    it('should parse multiple links in text', () => {
      const result = parseLinks(
        'Check http://example.com and https://another.com',
      );

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual(
        expect.objectContaining({ type: 'text', content: 'Check ' }),
      );
      expect(result[1]).toEqual(
        expect.objectContaining({
          type: 'link',
          content: 'http://example.com',
          url: 'http://example.com',
        }),
      );
      expect(result[2]).toEqual(
        expect.objectContaining({ type: 'text', content: ' and ' }),
      );
      expect(result[3]).toEqual(
        expect.objectContaining({
          type: 'link',
          content: 'https://another.com',
          url: 'https://another.com',
        }),
      );
    });

    it('should handle links with paths', () => {
      const result = parseLinks('Visit https://example.com/path/to/page');

      expect(result).toHaveLength(2);
      expect(result[1]).toEqual(
        expect.objectContaining({
          type: 'link',
          content: 'https://example.com/path/to/page',
          url: 'https://example.com/path/to/page',
        }),
      );
    });

    it('should handle links with query parameters', () => {
      const result = parseLinks('https://example.com?foo=bar&baz=qux');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          type: 'link',
          content: 'https://example.com?foo=bar&baz=qux',
          url: 'https://example.com?foo=bar&baz=qux',
        }),
      );
    });

    it('should handle links with fragments', () => {
      const result = parseLinks('https://example.com#section');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          type: 'link',
          content: 'https://example.com#section',
          url: 'https://example.com#section',
        }),
      );
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
      expect(result[0]).toEqual(
        expect.objectContaining({
          type: 'link',
          content: 'https://example.com',
          url: 'https://example.com',
        }),
      );
      expect(result[1]).toEqual(
        expect.objectContaining({
          type: 'text',
          content: ' is a good site',
        }),
      );
    });

    it('should handle links at the end of text', () => {
      const result = parseLinks('Visit https://example.com');

      expect(result).toHaveLength(2);
      expect(result[1]).toEqual(
        expect.objectContaining({
          type: 'link',
          content: 'https://example.com',
          url: 'https://example.com',
        }),
      );
    });

    it('should handle consecutive links', () => {
      const result = parseLinks('http://first.com https://second.com');

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('link');
      expect(result[1]).toEqual(
        expect.objectContaining({ type: 'text', content: ' ' }),
      );
      expect(result[2].type).toBe('link');
    });

    it('should handle empty string', () => {
      const result = parseLinks('');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          type: 'text',
          content: '',
        }),
      );
    });

    it('should handle links with subdomains', () => {
      const result = parseLinks('https://sub.domain.example.com');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          type: 'link',
          content: 'https://sub.domain.example.com',
          url: 'https://sub.domain.example.com',
        }),
      );
    });

    it('should handle links with hyphens in domain', () => {
      const result = parseLinks('https://my-example-site.com');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          type: 'link',
          content: 'https://my-example-site.com',
          url: 'https://my-example-site.com',
        }),
      );
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
      expect(result[0]).toEqual(
        expect.objectContaining({
          type: 'link',
          content: 'https://example.com/path?query=value&other=123#section',
          url: 'https://example.com/path?query=value&other=123#section',
        }),
      );
    });
  });
});
