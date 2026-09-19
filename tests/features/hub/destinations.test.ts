import { describe, expect, it } from 'vitest';
import {
  HUB_DESTINATIONS,
  hubDestinationsFor,
} from '@/features/hub/lib/destinations';

describe('hub destinations', () => {
  it('offers the six domains the hub is meant to cover', () => {
    expect(HUB_DESTINATIONS.map((d) => d.id)).toEqual([
      'live',
      'movies',
      'music',
      'manga',
      'ask-ai',
      'games',
    ]);
  });

  it('points every destination at a real route', () => {
    expect(HUB_DESTINATIONS.map((d) => [d.id, d.href])).toEqual([
      ['live', '/live'],
      ['movies', '/search'],
      ['music', '/music'],
      ['manga', '/manga'],
      ['ask-ai', '/ask-ai'],
      ['games', '/games'],
    ]);
  });

  it('gives each destination a distinct accent so tiles are tellable apart', () => {
    const accents = HUB_DESTINATIONS.map((d) => d.accent);
    expect(new Set(accents).size).toBe(accents.length);
  });

  it('resolves labels against keys that exist in the common namespace', async () => {
    const common = (
      await import('@/i18n/messages/en/common.json', { with: { type: 'json' } })
    ).default as unknown as Record<string, Record<string, unknown>>;

    for (const { id, labelKey } of HUB_DESTINATIONS) {
      const [group, key] = labelKey.split('.');
      expect(common[group]?.[key], `${id} → ${labelKey}`).toBeTruthy();
    }
  });

  describe('platform filtering', () => {
    it('offers everything on web', () => {
      expect(hubDestinationsFor('web')).toHaveLength(HUB_DESTINATIONS.length);
    });

    /**
     * Games is embedded HTML5 built for a pointer or keyboard. There is no TvGames
     * page and it is absent from TvNavbar, so a D-pad user who opened one would be
     * stranded inside it with no way back.
     */
    it('withholds games on TV', () => {
      const ids = hubDestinationsFor('tv').map((d) => d.id);

      expect(ids).not.toContain('games');
      expect(ids).toEqual(['live', 'movies', 'music', 'manga', 'ask-ai']);
    });

    it('keeps the web and TV lists in the same order', () => {
      const web = hubDestinationsFor('web')
        .filter((d) => d.onTv)
        .map((d) => d.id);

      expect(hubDestinationsFor('tv').map((d) => d.id)).toEqual(web);
    });
  });
});
