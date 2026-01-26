# Changelog

## 1.0.0 (2026-01-26)


### Features

* Add Vercel Analytics with custom events ([9371bf6](https://github.com/rudra-sah00/watch-rudra/commit/9371bf66b829189235987cd4b845f125f69b9002))
* Configure LiveKit client with external Coturn ICE servers ([f0bc964](https://github.com/rudra-sah00/watch-rudra/commit/f0bc964664b91d25e8aec8d39d8ab3bee22af5c6))
* enforce invite-only signup on frontend and fix biome issues ([0d42f40](https://github.com/rudra-sah00/watch-rudra/commit/0d42f4005be044c6bfe367e62722c3f99efc1a6c))
* Enhance Continue Watching list view and strictly enforce Biome CI ([a2adfb0](https://github.com/rudra-sah00/watch-rudra/commit/a2adfb0bce598ff32922e1593c9382d51a5f1326))
* enhance watch party components and search UI ([c16ed2d](https://github.com/rudra-sah00/watch-rudra/commit/c16ed2d1465cdffcdf6b05843e30be94f9b96a84))
* enhanced video player with sprite sheets, subtitles and UI improvements ([4f8f43d](https://github.com/rudra-sah00/watch-rudra/commit/4f8f43da00b61b1d637402679fc20cb08a2db5ca))
* frontend guest session handling ([8c41b5f](https://github.com/rudra-sah00/watch-rudra/commit/8c41b5f463d5a3f95d1b22183277438b4c93c95a))
* Mobile UI fixes, Captcha integration, Profile sync fixes, and Security hardening ([367c5fb](https://github.com/rudra-sah00/watch-rudra/commit/367c5fb00f08e8c8dba1d8d02efa615a1ce42cae))
* Netflix-style next episode feature with smart caching ([47be82f](https://github.com/rudra-sah00/watch-rudra/commit/47be82f925bca5746e494c19c24d0e9792be5a05))
* **profile:** revamp profile UI and add avatar upload with MinIO ([25d5a8e](https://github.com/rudra-sah00/watch-rudra/commit/25d5a8e03f3545769ce5a467d6b7fda1cf1e1717))
* refactor ContentDetailModal and add URL-based search ([936b649](https://github.com/rudra-sah00/watch-rudra/commit/936b64929c9ceec0ee1ada885959c94eb143de2b))
* Refine analytics with user events (login, logout, profile update) ([e92f3c5](https://github.com/rudra-sah00/watch-rudra/commit/e92f3c524987cad4c5a231e9eec47e4bf54ed13a))
* scale sprite preview for large screens, fix seek bar positioning ([bb7288d](https://github.com/rudra-sah00/watch-rudra/commit/bb7288dd8c01be918fb870547c3360dc84cd4d9f))
* setup frontend with login flow and WebSocket session management ([9ae34dc](https://github.com/rudra-sah00/watch-rudra/commit/9ae34dcb1623f19942ba2a8b01bb84e1da8b11f0))
* **user:** add profile, watch activity tracking, and password change ([d99160d](https://github.com/rudra-sah00/watch-rudra/commit/d99160d95605da12c26b5f109c66365b61ebf1b8))


### Bug Fixes

* Add CSP headers to allow inline scripts and video streaming ([71c7c6e](https://github.com/rudra-sah00/watch-rudra/commit/71c7c6e6764517b3a0f9ddfd797578a147dea017))
* Add vercel.json with proper CSP headers ([cf54890](https://github.com/rudra-sah00/watch-rudra/commit/cf5489012059abd58e44eb1e4f51fd067e6904ea))
* align biome formatting with prettier (use spaces) ([e09eebc](https://github.com/rudra-sah00/watch-rudra/commit/e09eebc6020973586c99e90591547fdda570c8a7))
* Allow all HTTPS/WSS connections in CSP for multiple CDN domains ([a36f450](https://github.com/rudra-sah00/watch-rudra/commit/a36f450b8203b5ae052e4e5c16fb3733dc80390d))
* biome lint warnings and code cleanup ([d3f7224](https://github.com/rudra-sah00/watch-rudra/commit/d3f72247a70d3159683ddfe2569e3aecf27be561))
* Change env variable from NEXT_PUBLIC_BACKEND_URL to BACKEND_URL ([49a735e](https://github.com/rudra-sah00/watch-rudra/commit/49a735eec24d3a0f4301dedc77658f549f884905))
* **deploy:** use github secrets for all environment variables ([5ef5cca](https://github.com/rudra-sah00/watch-rudra/commit/5ef5ccafeebfea791211eca35f323af45c423435))
* improve csp headers configuration ([7cab154](https://github.com/rudra-sah00/watch-rudra/commit/7cab154bcc181345ee87ddf752dded662b903ce7))
* **lint:** Resolve Biome errors in auth and video components ([fe1e2e5](https://github.com/rudra-sah00/watch-rudra/commit/fe1e2e5a471390f3d0520dafbaabfcac679f0562))
* persistence in search bar and remove movie tags from ui ([fea8ddc](https://github.com/rudra-sah00/watch-rudra/commit/fea8ddcd0255fdeaf0ed3b14cd72f61c1da45a74))
* Remove duplicate CSP headers from next.config.ts, keep only in vercel.json ([fc8d14c](https://github.com/rudra-sah00/watch-rudra/commit/fc8d14cb0905e8c9586f710f60c3f801e854af42))
* remove unused invalidatedWatchActivityCache call ([867c28c](https://github.com/rudra-sah00/watch-rudra/commit/867c28c15eb56a1f7220e46ae47acfb14b42a7a9))
* resolve all biome lint warnings and typescript errors ([e20fa99](https://github.com/rudra-sah00/watch-rudra/commit/e20fa9937c66e56eeed078e5b8f974a24a4cbb3c))
* resolve all linting issues, remove biome-ignore, enable tailwind support ([26115eb](https://github.com/rudra-sah00/watch-rudra/commit/26115eb7f9c33ea2ecb8584cfe849dd7fd1c9406))
* resolve remaining linting and accessibility issues ([1e2e2af](https://github.com/rudra-sah00/watch-rudra/commit/1e2e2af2d1875dcea39890b23d0350e41f566b2d))
* Update CSP to allow Vercel analytics and WebSocket connections ([4d2a1ea](https://github.com/rudra-sah00/watch-rudra/commit/4d2a1ea0ae90bb1eaa4d5a1441060f8751c57dd7))
* update LiveKit token hook to use backend-provided URL ([db6d1f7](https://github.com/rudra-sah00/watch-rudra/commit/db6d1f71b7244e97796040a57c0d7a69094f1ad1))
* Update next.config.ts to use BACKEND_URL ([6005001](https://github.com/rudra-sah00/watch-rudra/commit/600500197fbd82867524d18b3cbb5f2743e9691a))
* Update production CSP to allow Next.js inline scripts and Vercel domains ([d21a401](https://github.com/rudra-sah00/watch-rudra/commit/d21a4013e22de899ba4e47b12f5daa4736e11095))
* use resolved email for otp verification ([0ef4922](https://github.com/rudra-sah00/watch-rudra/commit/0ef4922cf62bc926340bd83fa9ce2165d8fdef9e))
