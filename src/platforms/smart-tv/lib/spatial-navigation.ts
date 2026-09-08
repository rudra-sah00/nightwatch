'use client';

import {
  GetBoundingClientRectAdapter,
  init,
  setKeyMap,
} from '@noriginmedia/norigin-spatial-navigation';

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
    // core 4 deprecated the `useGetBoundingClientRect: true` flag in favour of
    // the layoutAdapter API. GetBoundingClientRectAdapter is the shipped
    // equivalent: it extends BaseWebAdapter and measures via
    // element.getBoundingClientRect(), which is what we relied on before.
    // Passing the class (not an instance) — core accepts a constructor.
    layoutAdapter: GetBoundingClientRectAdapter,
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
