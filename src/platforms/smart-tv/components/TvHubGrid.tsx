'use client';

import {
  FocusContext,
  setFocus,
  useFocusable,
} from '@noriginmedia/norigin-spatial-navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { hubDestinationsFor } from '@/features/hub/lib/destinations';
import { FOCUS_KEYS } from '../lib/focus-keys';
import { TvHubTile } from './TvHubTile';

const GATE_FOCUS_KEY = 'TV_HUB_GATE';
const FIRST_TILE_FOCUS_KEY = 'TV_HUB_TILE_0';

/**
 * D-pad navigable hub tile grid for Android TV.
 *
 * Used both by the home page and the entry gate. The web `HubGrid` is anchor-based and
 * invisible to the spatial navigation manager, so a TV user faced with it would have
 * nothing to focus — hence a separate grid rather than a restyle.
 *
 * @param trapFocus - Gate mode. Makes the grid a focus boundary so the D-pad cannot
 *   reach the navbar behind the overlay, and pulls focus in on mount.
 * @param registerContentKey - Page mode. Points `FOCUS_KEYS.CONTENT` at the first tile
 *   so `useTvFocus` has a real target; nothing else in the app registers that key.
 */
export function TvHubGrid({
  onPick,
  onContinue,
  trapFocus = false,
  registerContentKey = false,
}: {
  onPick?: () => void;
  onContinue?: () => void;
  trapFocus?: boolean;
  registerContentKey?: boolean;
}) {
  const t = useTranslations('common');
  const destinations = hubDestinationsFor('tv');

  const { ref, focusKey } = useFocusable({
    focusKey: trapFocus ? GATE_FOCUS_KEY : undefined,
    isFocusBoundary: trapFocus,
    trackChildren: true,
  });

  useEffect(() => {
    if (trapFocus) setFocus(FIRST_TILE_FOCUS_KEY);
  }, [trapFocus]);

  return (
    <FocusContext.Provider value={focusKey}>
      <div ref={ref} className="w-full">
        <div className="grid grid-cols-5 gap-6">
          {destinations.map(({ id, href, icon, labelKey, accent }, i) => (
            <TvHubTile
              key={id}
              href={href}
              label={t(labelKey)}
              icon={icon}
              accent={accent}
              onPick={onPick}
              focusKey={
                i === 0
                  ? trapFocus
                    ? FIRST_TILE_FOCUS_KEY
                    : registerContentKey
                      ? FOCUS_KEYS.CONTENT
                      : undefined
                  : undefined
              }
            />
          ))}
        </div>

        {onContinue && (
          <div className="mt-10 flex justify-center">
            <TvHubContinue label={t('hub.continue')} onPress={onContinue} />
          </div>
        )}
      </div>
    </FocusContext.Provider>
  );
}

/** Focusable escape hatch to the route that was already loaded. */
function TvHubContinue({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onPress });

  return (
    <p
      ref={ref}
      className={`tv-focusable font-headline font-bold uppercase tracking-widest text-lg px-6 py-3 border-4 ${
        focused
          ? 'tv-focusable--focused border-neo-blue text-foreground'
          : 'border-transparent text-muted-foreground'
      }`}
    >
      {label}
    </p>
  );
}
