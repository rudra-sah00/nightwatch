// @ts-check
import { serwist } from '@serwist/next/config';

export default serwist({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  additionalPrecacheEntries: [{ url: '/', revision: 'launch-v1' }],
});
