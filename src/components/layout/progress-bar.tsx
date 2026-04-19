'use client';

import { AppProgressBar } from 'next-nprogress-bar';

export function ProgressBar() {
  return (
    <AppProgressBar
      height="3px"
      color="#facc15"
      options={{ showSpinner: false }}
      shallowRouting
    />
  );
}
