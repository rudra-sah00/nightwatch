import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { COOKIE_NAME, defaultLocale, locales } from '@/i18n/config';

const MESSAGES_DIR = join(process.cwd(), 'src/i18n/messages');
const NAMESPACES = [
  'common',
  'auth',
  'search',
  'live',
  'watch',
  'party',
  'profile',
] as const;

type NestedRecord = { [key: string]: string | NestedRecord };

function getLeafKeys(obj: NestedRecord, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'object' && value !== null
      ? getLeafKeys(value as NestedRecord, path)
      : [path];
  });
}

function getLeafEntries(obj: NestedRecord, prefix = ''): [string, string][] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'object' && value !== null
      ? getLeafEntries(value as NestedRecord, path)
      : [[path, value as string] as [string, string]];
  });
}

function extractPlaceholders(value: string): string[] {
  // Match top-level ICU placeholders: {name} or {name, plural/select, ...}
  // Skip content nested inside plural/select branches (e.g. `one {item}`)
  const placeholders: string[] = [];
  let depth = 0;
  let i = 0;
  while (i < value.length) {
    if (value[i] === '{') {
      if (depth === 0) {
        const close = value.indexOf('}', i);
        if (close === -1) break;
        // Check if this is a simple {name} (no nested braces between i and close)
        const inner = value.slice(i + 1, close);
        if (/^\w+$/.test(inner)) {
          placeholders.push(inner);
        } else {
          // ICU expression like {count, plural, ...} — extract the variable name
          const match = inner.match(/^(\w+)\s*,/);
          if (match) placeholders.push(match[1]);
        }
      }
      depth++;
    } else if (value[i] === '}') {
      depth--;
    }
    i++;
  }
  return [...new Set(placeholders)].sort();
}

function loadJSON(locale: string, namespace: string): NestedRecord {
  const filePath = join(MESSAGES_DIR, locale, `${namespace}.json`);
  return JSON.parse(readFileSync(filePath, 'utf-8'));
}

describe('i18n Translation Integrity', () => {
  describe('Config exports', () => {
    it('exports 14 locales', () => {
      expect(locales).toHaveLength(14);
    });

    it('has defaultLocale set to "en"', () => {
      expect(defaultLocale).toBe('en');
    });

    it('has COOKIE_NAME set to "NEXT_LOCALE"', () => {
      expect(COOKIE_NAME).toBe('NEXT_LOCALE');
    });
  });

  describe('Locale directories exist', () => {
    it.each([...locales])('"%s" directory exists', (locale) => {
      expect(existsSync(join(MESSAGES_DIR, locale))).toBe(true);
    });
  });

  describe('Namespace files exist', () => {
    it.each([...locales])('"%s" has all 7 namespace files', (locale) => {
      const files = readdirSync(join(MESSAGES_DIR, locale));
      for (const ns of NAMESPACES) {
        expect(files).toContain(`${ns}.json`);
      }
    });
  });

  describe('JSON validity', () => {
    it.each(
      [...locales].flatMap((l) => NAMESPACES.map((ns) => [l, ns] as const)),
    )('%s/%s.json is valid JSON', (locale, namespace) => {
      expect(() => loadJSON(locale, namespace)).not.toThrow();
    });
  });

  describe('Key parity with English', () => {
    const enKeys = Object.fromEntries(
      NAMESPACES.map((ns) => [ns, getLeafKeys(loadJSON('en', ns)).sort()]),
    );

    const nonEnLocales = [...locales].filter((l) => l !== 'en');

    it.each(
      nonEnLocales.flatMap((l) => NAMESPACES.map((ns) => [l, ns] as const)),
    )('%s/%s.json has same keys as English', (locale, namespace) => {
      const keys = getLeafKeys(loadJSON(locale, namespace)).sort();
      expect(keys).toEqual(enKeys[namespace]);
    });
  });

  describe('No empty values', () => {
    it.each(
      [...locales].flatMap((l) => NAMESPACES.map((ns) => [l, ns] as const)),
    )('%s/%s.json has no empty string values', (locale, namespace) => {
      const entries = getLeafEntries(loadJSON(locale, namespace));
      const empties = entries.filter(([, v]) => v === '').map(([k]) => k);
      expect(empties, `Empty keys: ${empties.join(', ')}`).toHaveLength(0);
    });
  });

  describe('ICU placeholders preserved', () => {
    const nonEnLocales = [...locales].filter((l) => l !== 'en');

    it.each(
      nonEnLocales.flatMap((l) => NAMESPACES.map((ns) => [l, ns] as const)),
    )('%s/%s.json preserves all ICU placeholders from English', (locale, namespace) => {
      const enEntries = getLeafEntries(loadJSON('en', namespace));
      const localeData = loadJSON(locale, namespace);
      const localeEntries = new Map(getLeafEntries(localeData));

      for (const [key, enValue] of enEntries) {
        const enPlaceholders = extractPlaceholders(enValue);
        if (enPlaceholders.length === 0) continue;

        const localeValue = localeEntries.get(key);
        expect(
          localeValue,
          `Missing key "${key}" in ${locale}/${namespace}`,
        ).toBeDefined();
        expect(
          extractPlaceholders(localeValue!),
          `Placeholder mismatch in ${locale}/${namespace} key "${key}"`,
        ).toEqual(enPlaceholders);
      }
    });
  });
});
