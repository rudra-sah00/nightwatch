'use client';

import { AppProgressBar } from 'next-nprogress-bar';

export function ProgressBar() {
  return (
    <AppProgressBar
      height="3px"
      color="#facc15"
      options={{ showSpinner: false }}
      shallowRouting
      style={`
        #nprogress {
          z-index: 99999 !important;
        }
        #nprogress .bar {
          z-index: 99999 !important;
        }
        #nprogress .peg {
          box-shadow: 0 0 10px #facc15, 0 0 5px #facc15 !important;
        }
      `}
    />
  );
}
