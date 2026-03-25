import { beforeEach, describe, expect, it } from 'vitest';
import {
  applySubtitleSettings,
  BACKGROUND_COLORS,
  defaultSubtitleSettings,
  loadSubtitleSettings,
  SUBTITLE_FONT_SIZES,
  SUBTITLE_FONTS,
  saveSubtitleSettings,
  TEXT_COLORS,
  TEXT_SHADOWS,
} from '@/features/watch/player/ui/controls/subtitle-settings';
import { clearStorageCache } from '@/lib/storage-cache';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

global.localStorage = localStorageMock as unknown as Storage;

describe('Subtitle Settings', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    clearStorageCache(); // Clear the in-memory cache
    // Reset CSS variables
    document.documentElement.style.cssText = '';
  });

  describe('Constants', () => {
    it('should export SUBTITLE_FONTS array', () => {
      expect(SUBTITLE_FONTS).toHaveLength(15);
      expect(SUBTITLE_FONTS[0]).toEqual({
        label: 'Roboto',
        value: "'Roboto', sans-serif",
      });
      expect(SUBTITLE_FONTS[1]).toEqual({
        label: 'Open Sans',
        value: "'Open Sans', sans-serif",
      });
    });

    it('should export SUBTITLE_FONT_SIZES array', () => {
      expect(SUBTITLE_FONT_SIZES).toHaveLength(4);
      expect(SUBTITLE_FONT_SIZES[0]).toEqual({ label: 'Small', value: '1rem' });
      expect(SUBTITLE_FONT_SIZES[1]).toEqual({
        label: 'Medium',
        value: '1.25rem',
      });
    });

    it('should export BACKGROUND_COLORS array', () => {
      expect(BACKGROUND_COLORS).toHaveLength(4);
      expect(BACKGROUND_COLORS[0]).toEqual({
        label: 'Black',
        value: 'rgba(0, 0, 0, 0.75)',
      });
    });

    it('should export TEXT_COLORS array', () => {
      expect(TEXT_COLORS).toHaveLength(4);
      expect(TEXT_COLORS[0]).toEqual({ label: 'White', value: 'white' });
      expect(TEXT_COLORS[1]).toEqual({ label: 'Yellow', value: '#ffff00' });
    });

    it('should export TEXT_SHADOWS array', () => {
      expect(TEXT_SHADOWS).toHaveLength(4);
      expect(TEXT_SHADOWS[0]).toEqual({ label: 'None', value: 'none' });
    });
  });

  describe('defaultSubtitleSettings', () => {
    it('should have default values', () => {
      expect(defaultSubtitleSettings).toEqual({
        fontSize: '1.25rem',
        fontFamily: "'Roboto', sans-serif",
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        textColor: 'white',
        textShadow: 'none',
        opacity: 1,
      });
    });
  });

  describe('loadSubtitleSettings', () => {
    it('should return default settings when localStorage is empty', () => {
      const settings = loadSubtitleSettings();
      expect(settings).toEqual(defaultSubtitleSettings);
    });

    it('should load saved settings from localStorage', () => {
      // Storage is versioned — data must include _v: 'v1' to be trusted
      const customSettings = {
        _v: 'v1',
        fontSize: '1.5rem',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: 'rgba(40, 40, 40, 0.85)',
        textColor: '#ffff00',
        textShadow: 'none',
        opacity: 0.8,
      };

      localStorage.setItem(
        'watch-subtitle-settings',
        JSON.stringify(customSettings),
      );

      const settings = loadSubtitleSettings();
      // _v is an internal field; the returned settings object spreads defaults
      // then parsed data on top, so _v will be present — compare only user fields
      expect(settings.fontSize).toBe('1.5rem');
      expect(settings.fontFamily).toBe('Arial, sans-serif');
      expect(settings.backgroundColor).toBe('rgba(40, 40, 40, 0.85)');
      expect(settings.textColor).toBe('#ffff00');
      expect(settings.textShadow).toBe('none');
      expect(settings.opacity).toBe(0.8);
    });

    it('should return default settings on JSON parse error', () => {
      localStorage.setItem('watch-subtitle-settings', 'invalid-json');

      const settings = loadSubtitleSettings();
      expect(settings).toEqual(defaultSubtitleSettings);
    });

    it('should merge partial settings with defaults', () => {
      // Must include _v otherwise version check returns defaults
      const partialSettings = {
        _v: 'v1',
        fontSize: '2rem',
        textColor: '#ffff00',
      };

      localStorage.setItem(
        'watch-subtitle-settings',
        JSON.stringify(partialSettings),
      );

      const settings = loadSubtitleSettings();
      expect(settings.fontSize).toBe('2rem');
      expect(settings.textColor).toBe('#ffff00');
      // Other values should come from defaults
      expect(settings.fontFamily).toBe(defaultSubtitleSettings.fontFamily);
      expect(settings.backgroundColor).toBe(
        defaultSubtitleSettings.backgroundColor,
      );
    });
  });

  describe('saveSubtitleSettings', () => {
    it('should save settings to localStorage', () => {
      const settings = {
        fontSize: '1.75rem',
        fontFamily: 'Verdana, sans-serif',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        textColor: '#00ffff',
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
        opacity: 0.95,
      };

      saveSubtitleSettings(settings);

      const saved = localStorage.getItem('watch-subtitle-settings');
      expect(saved).toBeTruthy();
      // saveSubtitleSettings appends _v for versioned storage
      const parsed = JSON.parse(saved!);
      expect(parsed._v).toBe('v1');
      expect(parsed.fontSize).toBe(settings.fontSize);
      expect(parsed.fontFamily).toBe(settings.fontFamily);
      expect(parsed.backgroundColor).toBe(settings.backgroundColor);
      expect(parsed.textColor).toBe(settings.textColor);
      expect(parsed.textShadow).toBe(settings.textShadow);
      expect(parsed.opacity).toBe(settings.opacity);
    });
  });

  describe('applySubtitleSettings', () => {
    it('should set CSS custom properties', () => {
      const settings = {
        fontSize: '2rem',
        fontFamily: 'Courier New, monospace',
        backgroundColor: 'rgba(255, 0, 0, 0.5)',
        textColor: '#00FF00',
        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
        opacity: 0.75,
      };

      applySubtitleSettings(settings);

      const style = document.documentElement.style;
      expect(style.getPropertyValue('--subtitle-font-size')).toBe('2rem');
      expect(style.getPropertyValue('--subtitle-font-family')).toBe(
        'Courier New, monospace',
      );
      expect(style.getPropertyValue('--subtitle-bg-color')).toBe(
        'rgba(255, 0, 0, 0.5)',
      );
      expect(style.getPropertyValue('--subtitle-text-color')).toBe('#00FF00');
      expect(style.getPropertyValue('--subtitle-opacity')).toBe('0.75');
    });

    it('should apply default settings', () => {
      applySubtitleSettings(defaultSubtitleSettings);

      const style = document.documentElement.style;
      expect(style.getPropertyValue('--subtitle-font-size')).toBe('1.25rem');
      expect(style.getPropertyValue('--subtitle-font-family')).toBe(
        "'Roboto', sans-serif",
      );
      expect(style.getPropertyValue('--subtitle-bg-color')).toBe(
        'rgba(0, 0, 0, 0.75)',
      );
      expect(style.getPropertyValue('--subtitle-text-color')).toBe('white');
      expect(style.getPropertyValue('--subtitle-opacity')).toBe('1');
    });

    it('should handle zero opacity', () => {
      const settings = {
        ...defaultSubtitleSettings,
        opacity: 0,
      };

      applySubtitleSettings(settings);

      expect(
        document.documentElement.style.getPropertyValue('--subtitle-opacity'),
      ).toBe('0');
    });

    it('should handle maximum opacity', () => {
      const settings = {
        ...defaultSubtitleSettings,
        opacity: 1,
      };

      applySubtitleSettings(settings);

      expect(
        document.documentElement.style.getPropertyValue('--subtitle-opacity'),
      ).toBe('1');
    });
  });

  describe('Integration', () => {
    it('should save, load, and apply settings in sequence', () => {
      const customSettings = {
        fontSize: '1.75rem',
        fontFamily: 'Georgia, serif',
        backgroundColor: 'rgba(100, 100, 100, 0.7)',
        textColor: '#FFFF00',
        textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
        opacity: 0.9,
      };

      // Save settings
      saveSubtitleSettings(customSettings);

      // Clear CSS
      document.documentElement.style.cssText = '';

      // Load settings — loadSubtitleSettings spreads defaults then parsed data,
      // so _v from storage will be present in the returned object.
      // Compare individual user-facing fields rather than the full object.
      const loaded = loadSubtitleSettings();
      expect(loaded.fontSize).toBe(customSettings.fontSize);
      expect(loaded.fontFamily).toBe(customSettings.fontFamily);
      expect(loaded.backgroundColor).toBe(customSettings.backgroundColor);
      expect(loaded.textColor).toBe(customSettings.textColor);
      expect(loaded.textShadow).toBe(customSettings.textShadow);
      expect(loaded.opacity).toBe(customSettings.opacity);

      // Apply loaded settings
      applySubtitleSettings(loaded);

      // Verify CSS variables are set
      const style = document.documentElement.style;
      expect(style.getPropertyValue('--subtitle-font-size')).toBe('1.75rem');
      expect(style.getPropertyValue('--subtitle-font-family')).toBe(
        'Georgia, serif',
      );
      expect(style.getPropertyValue('--subtitle-text-color')).toBe('#FFFF00');
    });
  });
});
