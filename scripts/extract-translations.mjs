#!/usr/bin/env node

/**
 * Translation extraction & validation script for TMS integration.
 *
 * Usage:
 *   node scripts/extract-translations.mjs [--format flat|nested] [--locale en]
 *
 * Outputs a single JSON file per locale suitable for import into
 * Crowdin, Lokalise, Phrase, or similar TMS platforms.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const MESSAGES_DIR = join(process.cwd(), 'src/i18n/messages');
const OUTPUT_DIR = join(process.cwd(), 'translations-export');
const NAMESPACES = [
  'common',
  'auth',
  'profile',
  'search',
  'watch',
  'live',
  'party',
];

const args = process.argv.slice(2);
const formatIdx = args.indexOf('--format');
const outputFormat = formatIdx !== -1 ? args[formatIdx + 1] : 'flat';
const localeIdx = args.indexOf('--locale');
const targetLocale = localeIdx !== -1 ? args[localeIdx + 1] : null;

function flattenKeys(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      Object.assign(result, flattenKeys(value, path));
    } else {
      result[path] = value;
    }
  }
  return result;
}

function extractLocale(locale) {
  const merged = {};
  for (const ns of NAMESPACES) {
    const filePath = join(MESSAGES_DIR, locale, `${ns}.json`);
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    if (outputFormat === 'flat') {
      const flat = flattenKeys(data, ns);
      Object.assign(merged, flat);
    } else {
      merged[ns] = data;
    }
  }
  return merged;
}

// Ensure output directory exists
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

const locales = targetLocale
  ? [targetLocale]
  : readdirSync(MESSAGES_DIR).filter((d) =>
      existsSync(join(MESSAGES_DIR, d, 'common.json')),
    );

let totalKeys = 0;
for (const locale of locales) {
  const data = extractLocale(locale);
  const keyCount =
    outputFormat === 'flat' ? Object.keys(data).length : '(nested)';
  const outPath = join(OUTPUT_DIR, `${locale}.json`);
  writeFileSync(outPath, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`  ✓ ${locale}.json — ${keyCount} keys`);
  if (typeof keyCount === 'number') totalKeys = keyCount;
}

console.log(`\nExported ${locales.length} locale(s) to ${OUTPUT_DIR}/`);
if (totalKeys) console.log(`Keys per locale: ${totalKeys}`);
console.log(`Format: ${outputFormat}`);
