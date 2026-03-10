# Changelog

## [1.8.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.7.0...v1.8.0) (2026-03-10)


### Features

* add home button to navbar; remove watchlist server subtitle ([bf1247a](https://github.com/rudra-sah00/watch-rudra/commit/bf1247a4c1490a9b1100bf57a8e1f7a4bbe006f8))
* add YouTube-style DVR seek bar for livestream player ([1bea68f](https://github.com/rudra-sah00/watch-rudra/commit/1bea68f5d0d011df1a897026a174412095037f5c))
* **download:** per-episode quality downloads via CF Worker ([741d4d9](https://github.com/rudra-sah00/watch-rudra/commit/741d4d951785cd38d974357e256665d69ad4c63c))
* implement debounced search and fix sidebar device modal UI ([c01d9e1](https://github.com/rudra-sah00/watch-rudra/commit/c01d9e1ab8cc46d5d87545c45cc839bd3345293d))
* **livestream:** update live page, card UI, types and API ([3d6b4c1](https://github.com/rudra-sah00/watch-rudra/commit/3d6b4c10fb0e03d6756b69c1830085efc73aee3c))
* **player:** glass effect on right column, open/close animation, tests ([a640a42](https://github.com/rudra-sah00/watch-rudra/commit/a640a420cdc42b7ba82ae26072f453b756bce3c3))
* **player:** Netflix-style episode panel for series playback ([fa13801](https://github.com/rudra-sah00/watch-rudra/commit/fa13801146e4e79491518354ce0872dd013bb834))
* **player:** separate episode panel from controls + bigger thumbnails ([5f034c3](https://github.com/rudra-sah00/watch-rudra/commit/5f034c3aa11ac3f36023c847da0c7276f4b7c782))
* **player:** YouTube-style DVR seekbar for live streams ([573f295](https://github.com/rudra-sah00/watch-rudra/commit/573f29504e1ab69ccfbe835f4fa6462b82dae6dd))
* remove AI assistant feature entirely ([c92d06c](https://github.com/rudra-sah00/watch-rudra/commit/c92d06c848f401cbcbabf6921848396029519822))
* remove stats banner, add episode loading state, fix S2 highest quality playback ([2a1a38c](https://github.com/rudra-sah00/watch-rudra/commit/2a1a38cc9c53a457011be4ce1ac00e46c17e3ce9))
* S2 provider, Biome fixes, test updates, and all frontend improvements ([59dc757](https://github.com/rudra-sah00/watch-rudra/commit/59dc757b3ba5720f3ef02b40b6db774591479689))
* watch party mobile disable, live match modal redesign ([43b4c06](https://github.com/rudra-sah00/watch-rudra/commit/43b4c06f5224ec627bf07ea8ff437f7500d9609b))
* watch-party sidebar theming, remove CloudFront, fix tests & biome ([27045b5](https://github.com/rudra-sah00/watch-rudra/commit/27045b53b41dc5d5b19a7c0b3df79a6342f0e7a0))
* **watch-party:** floating chat overlay toggle inside settings dialog ([4c8c8e0](https://github.com/rudra-sah00/watch-rudra/commit/4c8c8e04b0aa0a655cfc047d997cf701124cf9ec))
* **watch-party:** overhaul UX — loading states, lobby, grid, kick confirm ([ee566c5](https://github.com/rudra-sah00/watch-rudra/commit/ee566c5ff0c0bdc7151d83e68bea2cfba9fc3a68))


### Bug Fixes

* **ai-assistant:** remove duplicate isProcessing assignment ([8188cc4](https://github.com/rudra-sah00/watch-rudra/commit/8188cc467fb3a7a6c042506004fc1c55b47a1419))
* **continue-watching:** prevent server content mixing and infinite loading ([e7e972b](https://github.com/rudra-sah00/watch-rudra/commit/e7e972b179767586b79b0f7a0c02dede067bf160))
* episode change infinite loop, pause overlay in watch party, sketch undo isolation ([5cd4876](https://github.com/rudra-sah00/watch-rudra/commit/5cd48765d651c25e3224fd2e647856e33fd2c505))
* force HLS engine for livestream watch party guests ([8468587](https://github.com/rudra-sah00/watch-rudra/commit/846858786b56aaaf67e6a706332b99ab409d89a4))
* **frontend:** next config warning and content modal loading reset ([2910773](https://github.com/rudra-sah00/watch-rudra/commit/291077343b6798f2e6edc47309ea5f081dfbc280))
* improve search loading feedback and align sidebar backgrounds ([8fc438b](https://github.com/rudra-sah00/watch-rudra/commit/8fc438b07f2e79a06ff08fb143925a8ca6c5124b))
* **livestream:** add paused overlay and fix seekbar initial flash ([fa1c92c](https://github.com/rudra-sah00/watch-rudra/commit/fa1c92c6862445c48007825aab220b6ca38da287))
* mobile UX and player improvements ([2a138f9](https://github.com/rudra-sah00/watch-rudra/commit/2a138f9df2c5ddccbb9048ff8235ecc3b9df3f59))
* pass isLive to watch party player for livestream rooms, contain objectFit, add containerStyle prop ([1807918](https://github.com/rudra-sah00/watch-rudra/commit/180791893a70562710539021501ed00f589160e6))
* **player:** episode panel re-open scroll, error flash, mobile fullscreen ([e30a612](https://github.com/rudra-sah00/watch-rudra/commit/e30a612acef61ccdda0046eb7711880ae9c0a4d8))
* **player:** fill full viewport on all screen sizes ([897b765](https://github.com/rudra-sah00/watch-rudra/commit/897b76550d928d89c6ee0ad44ae3b5eff2b94b9a))
* **player:** hide controls when episode panel is open ([8730913](https://github.com/rudra-sah00/watch-rudra/commit/8730913830cc220dfc1eb6b2283fdef84fd41886))
* **player:** pin live seekbar to 100% at live edge to prevent jitter ([ef74b34](https://github.com/rudra-sah00/watch-rudra/commit/ef74b349165e8eeac4d471ce49d0237b62de8110))
* **profile:** remove duplicate inline success messages, use toast only ([81ef226](https://github.com/rudra-sah00/watch-rudra/commit/81ef226c1d22478013588a64cc15711f866712fb))
* remove premature onClose() before navigation in watch party and auto-play ([9416c32](https://github.com/rudra-sah00/watch-rudra/commit/9416c32d950d6d69583801e71f5875d83c26986a))
* reset captcha token on error and add expire handler for signup ([bf43e11](https://github.com/rudra-sah00/watch-rudra/commit/bf43e114ed4d189b9f7b33355d3c0fc0c44c695e))
* **search:** prevent URL sync overwriting typed input; disable browser autocomplete; fix unused param ([5b3e3ce](https://github.com/rudra-sah00/watch-rudra/commit/5b3e3ce634a93d4568e2810b94eac74ebeccca8e))
* **stream+audio+wp:** S2 audio tracks in watch party + solo active track highlight ([d05e18b](https://github.com/rudra-sah00/watch-rudra/commit/d05e18ba4b74fff230d9080adfc98e86b62f3d4d))
* **watch-party:** align emoji reactions with player controls row ([3e36e0b](https://github.com/rudra-sah00/watch-rudra/commit/3e36e0bd1e58588cf33d5cf1797f3d9ce025707b))
* **watch-party:** blur sidebar when episode panel opens ([d7b12bc](https://github.com/rudra-sah00/watch-rudra/commit/d7b12bc4ee8832f1598d702512d6b49f8c7a2087))
* **watch-party:** center emoji reactions in controls row ([5dc623d](https://github.com/rudra-sah00/watch-rudra/commit/5dc623d7c09d78542269f86ea4fb0f9a9c653b9f))
* **watch-party:** S2 audio tracks, lifecycle bugs, missing test coverage ([9e3e07e](https://github.com/rudra-sah00/watch-rudra/commit/9e3e07ee5272291d9b5b716ef886b0dc5ff1acfd))
* **watch-party:** use hostId to identify creator, skip lobby pending state ([d497920](https://github.com/rudra-sah00/watch-rudra/commit/d4979201d399859f9674a683742754b42f04f905))
* **watch:** correct midnight activity attribution and durationSeconds=0 guard ([041a796](https://github.com/rudra-sah00/watch-rudra/commit/041a7967802876b7670b0186aa059f487577051e))


### Performance Improvements

* apply React best practices from AGENTS.md skill file ([6362a56](https://github.com/rudra-sah00/watch-rudra/commit/6362a5663ed2487f9b1b04f852e26d2d9473eb25))
* hoist inline defaults and formatTime in download-menu and video-player hook ([314464b](https://github.com/rudra-sah00/watch-rudra/commit/314464b8a450f6d22c37ec0804afe1167e071e18))

## [1.7.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.6.1...v1.7.0) (2026-02-25)


### Features

* Add facial smile detection, update gesture delegate, fix UI tests ([764afff](https://github.com/rudra-sah00/watch-rudra/commit/764afff18133fbb4339f5e75295de1faf1bccc8c))
* **ai-assistant:** remove lottie, implement css loading, and refine navbar layout ([b6dd6fc](https://github.com/rudra-sah00/watch-rudra/commit/b6dd6fc159cab528e28a662da8f01f6d44082ebc))
* centralize watchlist logic and fix test regressions ([5d475f3](https://github.com/rudra-sah00/watch-rudra/commit/5d475f3a3657ea0342a144e708e2bdeab7659d74))
* complete global API standardization and architectural cleanup ([b6065de](https://github.com/rudra-sah00/watch-rudra/commit/b6065de9b58a3a6b942527bb4f1f1bdf6fd93d17))
* **frontend:** optimize AI performance, perceived latency, and UI stability ([6d2b4b4](https://github.com/rudra-sah00/watch-rudra/commit/6d2b4b4d2d47c9c9f807be880cabc715f17bedb5))
* **frontend:** quality assurance house - biome cleanup, soundboard & emoji interaction tests ([e83db2e](https://github.com/rudra-sah00/watch-rudra/commit/e83db2e43593d2769377382cbf19b85eaf599883))
* Implement AI Assistant trailer playback logic and fix frontend quality issues ([608d657](https://github.com/rudra-sah00/watch-rudra/commit/608d657409b879e5281c054f7b950048c718264a))
* implement frontend CSRF protection and fix provider regressions ([f334c23](https://github.com/rudra-sah00/watch-rudra/commit/f334c23b3a051051a0fe59c5c55dbe7b704bd688))
* Reactivate DevTools protection in frontend ([23d2f20](https://github.com/rudra-sah00/watch-rudra/commit/23d2f2098d539f8cedb778311da96709d06d2f97))
* Sync watch party stream resolution with backend and temporarily disable DevTools protection ([8e2c4eb](https://github.com/rudra-sah00/watch-rudra/commit/8e2c4eb34fd9125bab10da2c2ce54e7e81fdd6c1))


### Bug Fixes

* **auth:** handle expired sessions globally and refresh guest tokens ([3473b20](https://github.com/rudra-sah00/watch-rudra/commit/3473b20c908ef353cb7cfb825a45afc24793f5a3))
* **ci:** synchronize pnpm-lock.yaml with package.json ([28d1b3b](https://github.com/rudra-sah00/watch-rudra/commit/28d1b3ba3ba326bffdef712e4b25fad3ee2a87af))
* **frontend:** remove console.logs, biome overrides, and strict types ([481cdaf](https://github.com/rudra-sah00/watch-rudra/commit/481cdaf4aab268cd8340c47ffb972872fe6b30fd))
* standardize AI Assistant UI, cleanup globals.css, and resolve biome issues ([235d057](https://github.com/rudra-sah00/watch-rudra/commit/235d057e49e1370eca4dc56ee3ef47c3fc65236a))
* **ui:** suppress noisy mediapipe wasm console logs ([b3c45df](https://github.com/rudra-sah00/watch-rudra/commit/b3c45dfef2da46403765c7f4cfbddd8bcdc39e64))

## [1.6.1](https://github.com/rudra-sah00/watch-rudra/compare/v1.6.0...v1.6.1) (2026-02-13)


### Bug Fixes

* Agora video sync, name/avatar mapping, and test coverage ([55c8989](https://github.com/rudra-sah00/watch-rudra/commit/55c8989fb8ceb5e82ca5d17e12131c373be7bcc9))
* biome cleanup, remove all biome-ignore, fix TS errors, LiveKit→Agora migration in tests ([a48f76f](https://github.com/rudra-sah00/watch-rudra/commit/a48f76f7a24000e8a002125e864b3e5a6927440b))
* **frontend:** resolve redirect loop and standardize API proxying with passing tests ([70a5c6a](https://github.com/rudra-sah00/watch-rudra/commit/70a5c6a47499aa754ea55ba8b4cdc6d2143c0428))
* **frontend:** standardize NEXT_PUBLIC_BACKEND_URL for proxy and fetch ([26fef34](https://github.com/rudra-sah00/watch-rudra/commit/26fef3405b6512eea5c141b3668d77b5f660daeb))
* watch party participant visibility in sidebar ([0f0f40c](https://github.com/rudra-sah00/watch-rudra/commit/0f0f40c9ce777b3b39eb3ce1e2846a347c27db31))

## [1.6.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.5.0...v1.6.0) (2026-02-07)


### Features

* simplify password requirements and add predictive sync ([319367b](https://github.com/rudra-sah00/watch-rudra/commit/319367b6749992c57170df56251a00520c8f8c73))


### Bug Fixes

* **watch-party:** smooth drift correction to prevent audio cutting ([b2d56a1](https://github.com/rudra-sah00/watch-rudra/commit/b2d56a104371e1b65addee2dbd7ffcc66d74e710))

## [1.5.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.4.3...v1.5.0) (2026-02-04)


### Features

* add stats banner to login page ([be63ce1](https://github.com/rudra-sah00/watch-rudra/commit/be63ce10fe7532fb570d5e6316d9ade807217eb5))

## [1.4.3](https://github.com/rudra-sah00/watch-rudra/compare/v1.4.2...v1.4.3) (2026-02-04)


### Bug Fixes

* activity graph tooltip vertical positioning for top rows ([98f3b21](https://github.com/rudra-sah00/watch-rudra/commit/98f3b216cc415abc6012a4868cc44b4a1faf209e))
* normalize subtitle URLs in watch party for CORS compliance ([8a028f8](https://github.com/rudra-sah00/watch-rudra/commit/8a028f8521fd6534ea05007f248019ad6e2cd842))

## [1.4.2](https://github.com/rudra-sah00/watch-rudra/compare/v1.4.1...v1.4.2) (2026-02-04)


### Performance Improvements

* apply React best practices from AGENTS.md ([c6ca9d5](https://github.com/rudra-sah00/watch-rudra/commit/c6ca9d5d2b868ecdea1fba26d2a08c14cfe072c9))

## [1.4.1](https://github.com/rudra-sah00/watch-rudra/compare/v1.4.0...v1.4.1) (2026-02-04)


### Bug Fixes

* activity graph tooltip positioning to prevent right-side overflow ([b7bdd66](https://github.com/rudra-sah00/watch-rudra/commit/b7bdd663d6281a4c5d5a104e6666782dc1114c0f))

## [1.4.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.3.0...v1.4.0) (2026-02-04)


### Features

* add GitHub deployment status tracking ([25cb5c0](https://github.com/rudra-sah00/watch-rudra/commit/25cb5c009b1cfdf81b0156680e8de212ada33498))


### Bug Fixes

* improve activity graph, password modal, and profile form ([08942d4](https://github.com/rudra-sah00/watch-rudra/commit/08942d430d620d66dba50f03897f988a708ff6ae))
* prevent double deployment on release-please version bump ([ad57aa0](https://github.com/rudra-sah00/watch-rudra/commit/ad57aa02933acc5742d43187d183566dd65fa4ca))
* skip both release-please and deploy on version bump commits ([8627e92](https://github.com/rudra-sah00/watch-rudra/commit/8627e928e50c6ea3fa0b30663c934e36a8b7621e))

## [1.3.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.2.0...v1.3.0) (2026-02-04)


### Features

* improve test coverage to meet all thresholds ([cb38b12](https://github.com/rudra-sah00/watch-rudra/commit/cb38b1286acd82a71ac6c16a81661e73c7e509ec))
* redesign profile page UI with enhanced aesthetics ([b28cc35](https://github.com/rudra-sah00/watch-rudra/commit/b28cc356ea5ee47dc02c2429b44d18a422c9701d))


### Bug Fixes

* device selection dropdown now clickable with proper z-index ([091f92b](https://github.com/rudra-sah00/watch-rudra/commit/091f92b8b4ddebc0edc5065bb4b3179d2c9b69e9))
* mirror local video preview for natural self-view experience ([af0c1ad](https://github.com/rudra-sah00/watch-rudra/commit/af0c1ade97a01a5df2abb6f599788afa4ec7d5fb))
* properly extract Vercel deployment URL in CI/CD workflow ([2de3826](https://github.com/rudra-sah00/watch-rudra/commit/2de3826dbae62b35f6982f01b2ccd03b6c70df5f))

## [1.2.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.1.0...v1.2.0) (2026-02-03)


### Features

* add clickable links and typing indicators to watch party chat ([8ed86bc](https://github.com/rudra-sah00/watch-rudra/commit/8ed86bc507b388732c7532e754c92c35c2516667))


### Bug Fixes

* improve deployment verification in release workflow ([8e14cd4](https://github.com/rudra-sah00/watch-rudra/commit/8e14cd4959a8f4f3da1e321e8ff7a82a364c427e))

## [1.1.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.0.0...v1.1.0) (2026-02-02)


### Features

* add bitrate-aware quality labels and bypass devtools protection in dev ([f88d433](https://github.com/rudra-sah00/watch-rudra/commit/f88d4337d83675a6caf950d757f15434d1637aec))
* add comprehensive console logging to LiveKit for debugging ([9a7eda0](https://github.com/rudra-sah00/watch-rudra/commit/9a7eda0c77a0bb7b6343e2419a07e398519d2ca2))
* add release-please automation and improve deployment workflow ([85e9aa8](https://github.com/rudra-sah00/watch-rudra/commit/85e9aa891962366ead54bce51147981af90e56b1))
* **auth:** implement forgot and reset password functionality ([22ba39a](https://github.com/rudra-sah00/watch-rudra/commit/22ba39adf315784f83c2ff5795598fcacb447cb2))
* **auth:** implement proactive token refresh ([76beb0d](https://github.com/rudra-sah00/watch-rudra/commit/76beb0defca20806d35e027129df815cbfaa8507))
* bitrate-aware quality labels and devtools bypass ([e866d7e](https://github.com/rudra-sah00/watch-rudra/commit/e866d7ed3c5196074ec16483be033068723c0239))
* finalize red cinema loading theme with perfect centering and simple aesthetic ([b9bbe3c](https://github.com/rudra-sah00/watch-rudra/commit/b9bbe3c4eda3bb35454929017fa5a64fff311a65))
* improve loading aesthetic and refine caption matching ([afdd807](https://github.com/rudra-sah00/watch-rudra/commit/afdd807f3718755591f593f9e7972ed747026f9c))
* security policy UI and watch party reliability improvements ([ee99bd0](https://github.com/rudra-sah00/watch-rudra/commit/ee99bd0be6b4cbfaa6b28c79b94afb9c31f2db06))
* **watch-party:** support multiple subtitle tracks and fix token injection for guests ([db95e5a](https://github.com/rudra-sah00/watch-rudra/commit/db95e5ae991b823cf83b08c512375058c48819fa))


### Bug Fixes

* Captions ID mismatch, restore video events, activity graph timezone fix, and mobile player improvements ([05167cb](https://github.com/rudra-sah00/watch-rudra/commit/05167cb1952ebaf8066117b18501d5c472af70b6))
* clean up debug logs and restore DevTools protection ([a2a7df5](https://github.com/rudra-sah00/watch-rudra/commit/a2a7df5c5d834eb855cbcb1edbee60b32d1c8cb9))
* deploy workflow syntax and vercel environment ([01e568f](https://github.com/rudra-sah00/watch-rudra/commit/01e568f61f77c11dd8eeaa8dcf3371efe64863fa))
* properly track watch activity for authenticated watch party members ([cf80a3f](https://github.com/rudra-sah00/watch-rudra/commit/cf80a3fc4274bb6681e6aa5aaeabc13b6e5e8320))
* proxy subtitle tracks and improve None track handling ([5b62176](https://github.com/rudra-sah00/watch-rudra/commit/5b621769969807aaef8c29aaf177e0aa55f18715))
* resolve Button component asChild error with loading state ([2499927](https://github.com/rudra-sah00/watch-rudra/commit/2499927bb18fd799f69352a510bd3be9fc135478))
* **tests:** resolve TypeScript errors in useAudioStream tests ([3a4d717](https://github.com/rudra-sah00/watch-rudra/commit/3a4d71766618ca193a663976f5972afc2e92072b))
* **video:** force disable local video mirroring ([f1a1ea6](https://github.com/rudra-sah00/watch-rudra/commit/f1a1ea6163e14ba86851ac70ee79240ba50f36b8))
* **watch-party:** add null checks for audioTracks and videoTracks ([beb013a](https://github.com/rudra-sah00/watch-rudra/commit/beb013a54f0e60c1bef49f5d59072ec575b7f83c))


### Performance Improvements

* **hls:** implement aggressive 2-minute buffering ([fca3e6b](https://github.com/rudra-sah00/watch-rudra/commit/fca3e6bdab5361e3a21c20254aa8c685ce58d1f0))
* **watch:** increase hls buffer limits for smooth 1080p ([e19a29f](https://github.com/rudra-sah00/watch-rudra/commit/e19a29fe2d11309e4054569ec3bf668edb7add72))
