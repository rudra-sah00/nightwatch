'use client';

import { init, setKeyMap } from '@noriginmedia/norigin-spatial-navigation';

let initialized = false;

/**
 * Initialize the norigin spatial navigation engine.
 * Safe to call multiple times — only runs once.
 */
export function initSpatialNavigation() {
  if (initialized) return;
  initialized = true;

  init({
    debug: false,
    visualDebug: false,
    throttle: 150,
    throttleKeypresses: true,
    useGetBoundingClientRect: true,
    shouldFocusDOMNode: true,
    domNodeFocusOptions: { preventScroll: true },
    distanceCalculationMethod: 'center',
  });

  setKeyMap({
    left: 37,
    right: 39,
    up: 38,
    down: 40,
    enter: 13,
  });
}
