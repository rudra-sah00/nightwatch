import { describe, expect, it } from 'vitest';

describe('Array Helpers', () => {
  it('chunks array into smaller arrays', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const chunk = (arr: number[], size: number) => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    const result = chunk(arr, 3);
    expect(result).toEqual([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8],
    ]);
  });

  it('removes duplicates from array', () => {
    const arr = [1, 2, 2, 3, 3, 4, 5, 5];
    const unique = [...new Set(arr)];
    expect(unique).toEqual([1, 2, 3, 4, 5]);
  });

  it('filters falsy values', () => {
    const arr = [0, 1, false, 2, '', 3, null, undefined, 4];
    const filtered = arr.filter(Boolean);
    expect(filtered).toEqual([1, 2, 3, 4]);
  });

  it('shuffles array randomly', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = [...arr].sort(() => Math.random() - 0.5);

    expect(shuffled).toHaveLength(arr.length);
    expect(shuffled).toEqual(expect.arrayContaining(arr));
  });
});

describe('Object Helpers', () => {
  it('picks specific keys from object', () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    const pick = <T extends object, K extends keyof T>(
      obj: T,
      keys: K[],
    ): Pick<T, K> => {
      const result = {} as Pick<T, K>;
      keys.forEach((key) => {
        if (key in obj) result[key] = obj[key];
      });
      return result;
    };

    const result = pick(obj, ['a', 'c']);
    expect(result).toEqual({ a: 1, c: 3 });
  });

  it('omits specific keys from object', () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    const omit = <T extends object, K extends keyof T>(
      obj: T,
      keys: K[],
    ): Omit<T, K> => {
      const result = { ...obj };
      for (const key of keys) {
        delete result[key];
      }
      return result;
    };

    const result = omit(obj, ['b', 'd']);
    expect(result).toEqual({ a: 1, c: 3 });
  });

  it('deep clones object', () => {
    const obj = { a: 1, b: { c: 2, d: { e: 3 } } };
    const cloned = JSON.parse(JSON.stringify(obj));

    cloned.b.c = 999;
    expect(obj.b.c).toBe(2); // Original unchanged
    expect(cloned.b.c).toBe(999);
  });
});

describe('String Helpers', () => {
  it('capitalizes first letter', () => {
    const capitalize = (str: string) =>
      str.charAt(0).toUpperCase() + str.slice(1);

    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('world')).toBe('World');
  });

  it('converts to kebab-case', () => {
    const toKebab = (str: string) =>
      str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

    expect(toKebab('helloWorld')).toBe('hello-world');
    expect(toKebab('testCase')).toBe('test-case');
  });

  it('converts to camelCase', () => {
    const toCamel = (str: string) =>
      str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

    expect(toCamel('hello-world')).toBe('helloWorld');
    expect(toCamel('test-case')).toBe('testCase');
  });
});

describe('Number Helpers', () => {
  it('clamps number between min and max', () => {
    const clamp = (num: number, min: number, max: number) =>
      Math.min(Math.max(num, min), max);

    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('formats number with commas', () => {
    const formatNumber = (num: number) => num.toLocaleString('en-US');

    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('converts bytes to human readable', () => {
    const formatBytes = (bytes: number) => {
      const sizes = ['B', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 B';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / 1024 ** i).toFixed(2)} ${sizes[i]}`;
    };

    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(1048576)).toBe('1.00 MB');
  });
});

describe('Date Helpers', () => {
  it('formats relative time', () => {
    const relativeTime = (date: Date) => {
      const diff = Date.now() - date.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days}d ago`;
      if (hours > 0) return `${hours}h ago`;
      if (minutes > 0) return `${minutes}m ago`;
      return 'just now';
    };

    const now = new Date();
    expect(relativeTime(now)).toBe('just now');

    const oneHourAgo = new Date(Date.now() - 3600000);
    expect(relativeTime(oneHourAgo)).toBe('1h ago');
  });

  it('checks if date is today', () => {
    const isToday = (date: Date) => {
      const today = new Date();
      return (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      );
    };

    expect(isToday(new Date())).toBe(true);
    expect(isToday(new Date('2020-01-01'))).toBe(false);
  });
});
