# Changelog

## [2.5.0](https://github.com/rudra-sah00/nightwatch/compare/v2.4.0...v2.5.0) (2026-04-24)


### Features

* activity hover card with thumbnail on friend row ([39069d7](https://github.com/rudra-sah00/nightwatch/commit/39069d70f7d6e56a8c077b6f78bd24160fc96680))
* add JS obfuscation and Electron fuse hardening to desktop build ([78b9ac7](https://github.com/rudra-sah00/nightwatch/commit/78b9ac76a443d89a5b1be709ed51fab1104431e0))
* friend activity status - show what friends are watching ([1bfb086](https://github.com/rudra-sah00/nightwatch/commit/1bfb0867b256dd78c2dac61f340e50de7d759e60))


### Bug Fixes

* activity hover card only triggers on name area, not entire row ([b665fc5](https://github.com/rudra-sah00/nightwatch/commit/b665fc50604d54827195c475038d56d628ac7435))
* add icon.ico for NSIS installer/uninstaller icons ([c949634](https://github.com/rudra-sah00/nightwatch/commit/c949634127bfa217ac57637f97e2de083d591c77))
* calls not received during watch/live - move CallProvider to protected layout ([3c39964](https://github.com/rudra-sah00/nightwatch/commit/3c399641ee794bcc46c01fe11ea349e1ca8c1bd1))
* correct ASAR extract/repack path for obfuscation on all platforms ([cc6c607](https://github.com/rudra-sah00/nightwatch/commit/cc6c607ff02ef50e83a2cab9d0a0b68b797cc4a7))
* deep-link was stripping ?f= param causing chat to close ([92990bc](https://github.com/rudra-sah00/nightwatch/commit/92990bcae626e3a18df2cea66622d578c42b3271))
* destroy Discord RPC when window hides to tray on macOS ([8ec1f77](https://github.com/rudra-sah00/nightwatch/commit/8ec1f77ccd1104a63100d86dcd265b4cdde1950e))
* disable sidebars when content modal is open ([3f065b8](https://github.com/rudra-sah00/nightwatch/commit/3f065b8bcd9fc6f7353a8a09989eb308d94f9b19))
* live page dropdowns hidden behind hero - remove overflow-hidden ([0b3ffb6](https://github.com/rudra-sah00/nightwatch/commit/0b3ffb6a796ec642d4e22b5a128060f942b9f530))
* remove dynamic import with ssr:false from server component ([261a391](https://github.com/rudra-sah00/nightwatch/commit/261a391fdb6d06b8edea60830e42e3880c52d6e4))
* remove NSIS icon fields - PNG not supported, use defaults ([2b041b3](https://github.com/rudra-sah00/nightwatch/commit/2b041b31c52c0dbdd38d5e2108457561eba6a0d0))
* reset captcha token on login/forgot-password errors to prevent stale token reuse ([9ab407e](https://github.com/rudra-sah00/nightwatch/commit/9ab407e7a51f574971012d36b9e4d8266e7cdda8))
* sent messages appearing on wrong side - optimistic senderId was empty ([414bbdf](https://github.com/rudra-sah00/nightwatch/commit/414bbdf18713a72b3683a59db99e2917270d4bc3))
* update URL when selecting conversation in messages page ([9f1fcc7](https://github.com/rudra-sah00/nightwatch/commit/9f1fcc77bef82288aeb093515c9267a3c54f0e13))

## [2.4.0](https://github.com/rudra-sah00/nightwatch/compare/v2.3.0...v2.4.0) (2026-04-23)


### Features

* direct download in sidebar, What's New for all platforms ([1d3df80](https://github.com/rudra-sah00/nightwatch/commit/1d3df80ea91945af7ae927ce4e42556d38a54020))


### Bug Fixes

* video not showing in call overlay and popup ([cab09d7](https://github.com/rudra-sah00/nightwatch/commit/cab09d74a935f67b471d8d3f6300bc595649d6d9))

## [2.3.0](https://github.com/rudra-sah00/nightwatch/compare/v2.2.0...v2.3.0) (2026-04-23)


### Features

* landing page, splash screen, onboarding tour, legal pages & UI … ([5a6528d](https://github.com/rudra-sah00/nightwatch/commit/5a6528d7da584f54b65208d7051e06b3810d6ae1))
* landing page, splash screen, onboarding tour, legal pages & UI fixes ([4f12463](https://github.com/rudra-sah00/nightwatch/commit/4f12463a0073434e024d08c7697cef0bd8c9f6ab))
* landing page, splash screen, onboarding tour, legal pages & UI fixes ([3855e1b](https://github.com/rudra-sah00/nightwatch/commit/3855e1bd8e095db43c53b50cf9b35b2d8dfd0344))

## [2.2.0](https://github.com/rudra-sah00/nightwatch/compare/v2.1.5...v2.2.0) (2026-04-23)


### Features

* add sidebar navigation, friends panel, and home layout redesign ([d773ccd](https://github.com/rudra-sah00/nightwatch/commit/d773ccd9896e4e0cb96d82b481ed850453236201))
* friends, messaging, voice calls & online presence UI ([a63308d](https://github.com/rudra-sah00/nightwatch/commit/a63308d38b2f7f0a4328b723f8bc5e8709abcbed))
* **friends:** add call overlay, DM calling, i18n, and refactor friends module ([1ad5df5](https://github.com/rudra-sah00/nightwatch/commit/1ad5df56e55d13a9453c29d55ceb448f1118cf3b))
* **friends:** call overlay, DM calling, i18n & refactor ([8887d0a](https://github.com/rudra-sah00/nightwatch/commit/8887d0a93f6b13738bde05482d66d79727e825a4))
* reply-to-message, blocked users, search filter, call UI, unread fix ([df00970](https://github.com/rudra-sah00/nightwatch/commit/df00970a852b0ba63990085609bee420b2e5c34b))


### Bug Fixes

* **ci:** add retry logic to smoke test for transient 429 errors ([2b98ff7](https://github.com/rudra-sah00/nightwatch/commit/2b98ff7c65bc7c9f56184a5ecf14e527dea9f646))
* **ci:** production-grade CI/CD pipeline overhaul ([18e361b](https://github.com/rudra-sah00/nightwatch/commit/18e361b4fd8d9dd78b730bec1dcdc6769e232147))
* **ci:** remove macos-13 Intel build (runners deprecated, queue forever) ([20d356e](https://github.com/rudra-sah00/nightwatch/commit/20d356ece2a164c5f6bf83fd37fda0c170a97bf5))
* **ci:** treat HTTP 429 as smoke test pass (Cloudflare rate-limit) ([995f192](https://github.com/rudra-sah00/nightwatch/commit/995f1922da4e0b38b63ba0f8037b190f956c4438))
* **electron:** pnpm-compatible dep tracing + exclude build artifacts from tsc ([2b7f4c1](https://github.com/rudra-sah00/nightwatch/commit/2b7f4c15717ca41539a46fdf1001898fa4d50950))
* open target=_blank links in default browser instead of new Electron window ([c160af5](https://github.com/rudra-sah00/nightwatch/commit/c160af56d561cb9570616aec87ab974f3e551420))
* open target=_blank links in default browser instead of new Electron window ([3f84122](https://github.com/rudra-sah00/nightwatch/commit/3f841229e891fe4da4654bb24bc507153113b65c))
* search error flash on server 2/3 and remove redundant bg-background ([46ca892](https://github.com/rudra-sah00/nightwatch/commit/46ca892590a12c4de063aa8c30d744bde75342b0))
* **watch-party:** update MediaControls component ([efa011c](https://github.com/rudra-sah00/nightwatch/commit/efa011c237a712c2d7bfb4b9362e1e34891cf0d7))

## [2.1.1](https://github.com/rudra-sah00/watch-rudra/compare/v2.1.0...v2.1.1) (2026-04-22)


### Bug Fixes

* **electron:** add fast-uri as explicit dep for electron-store/ajv ([09d441e](https://github.com/rudra-sah00/watch-rudra/commit/09d441e304cf253144acbaac9474e0d4dbfff0e8))
* **electron:** add missing transitive deps for asar bundle ([67628f9](https://github.com/rudra-sah00/watch-rudra/commit/67628f9020250468e8af63d9dedeed51018ed73f))
* **i18n:** add missing watch.player.liveStreamSeekBar key to all locales ([0b32984](https://github.com/rudra-sah00/watch-rudra/commit/0b32984d97ae53e12bd9a90d66afcdfdef3a93f0))
* **live-bridge:** reduce racers from 6 to 2 to avoid Cloudflare block ([68c0ab9](https://github.com/rudra-sah00/watch-rudra/commit/68c0ab97cd8f599141c9f94b8d3ff35cccd6e5fb))
* **live-bridge:** update domains - dlstreams.top→.com, daddylive.mp→.stream ([cf7734b](https://github.com/rudra-sah00/watch-rudra/commit/cf7734b089469a22c972ab440ee62e4ca45c22dd))
* **live:** pass channel icon as team1.avatar for Server 1 channels ([b9b4129](https://github.com/rudra-sah00/watch-rudra/commit/b9b41296746611ed841638a65ad2deb0ac179759))

## [2.1.0](https://github.com/rudra-sah00/watch-rudra/compare/v2.0.2...v2.1.0) (2026-04-21)


### Features

* add Help menu with website, GitHub, report bug, updates, shortcuts ([75244dc](https://github.com/rudra-sah00/watch-rudra/commit/75244dce76388e927b7fca2224d43685abde9c9c))
* add i18n infrastructure with next-intl (English + Hindi) ([233e610](https://github.com/rudra-sah00/watch-rudra/commit/233e61055ccffba170987eab6a402268e01cfa50))
* add language selector to profile preferences with 8 languages ([98ab954](https://github.com/rudra-sah00/watch-rudra/commit/98ab954cac9f0b1e13fc8e72ad439904e6dbed2a))
* add macOS app menu with Cmd+Q, Cmd+R, About, Edit, Window menus ([26a2c65](https://github.com/rudra-sah00/watch-rudra/commit/26a2c65227d2ed340f45fcc549896322c7fea91f))
* **dev:** add live bridge logging + dev launch script ([bb0170b](https://github.com/rudra-sah00/watch-rudra/commit/bb0170bfb984ebd633714a66da376490c338ad8d))
* **i18n:** add 8 more languages — German, Portuguese, Arabic, Russian, Chinese, Italian, Turkish, Thai ([d1bdfe0](https://github.com/rudra-sah00/watch-rudra/commit/d1bdfe055f9d21c0a367ab8fcd53f2b1f564d38a))
* **i18n:** add translations for all 8 languages (Tamil, Telugu, Spanish, French, Japanese, Korean) ([3d0b22c](https://github.com/rudra-sah00/watch-rudra/commit/3d0b22cc34e862c26fed0823dd988e8968c78b57))
* **i18n:** complete 16-language support, fix language dialog scroll + Cancel buttons ([8f9efb1](https://github.com/rudra-sah00/watch-rudra/commit/8f9efb1ad45a5ed53f847dd30f0bf70600fe3aa6))
* **i18n:** complete internationalization coverage across all modules ([6932b1f](https://github.com/rudra-sah00/watch-rudra/commit/6932b1f4e4165fe4dd343a0331c1f7456294cfb7))
* **i18n:** translate all 56 hardcoded toast messages + fix dependency arrays ([31755e0](https://github.com/rudra-sah00/watch-rudra/commit/31755e0c0176fdec91b60c8d30927df754263a0c))
* **i18n:** translate entire profile module in all 8 languages ([afddfc4](https://github.com/rudra-sah00/watch-rudra/commit/afddfc4c3edfe82df191a7d8c2ef510a6c38f1ae))
* **i18n:** translate livestream and watch-party modules (all 8 languages) ([c19117a](https://github.com/rudra-sah00/watch-rudra/commit/c19117ac9e97c4febaf9411534ea701f4312b78c))
* **i18n:** translate login page + auth forms in all 8 languages ([652e402](https://github.com/rudra-sah00/watch-rudra/commit/652e40264d7503bdb8e6bf672a017a5615d75cc1))
* **i18n:** translate navbar - first component using translations ([79ae222](https://github.com/rudra-sah00/watch-rudra/commit/79ae222119033c58e2c838924abc9453d7413ff1))
* **i18n:** translate remaining edge cases - signup, forgot-password, toasts, global tour ([efb4c28](https://github.com/rudra-sah00/watch-rudra/commit/efb4c284173f33078c6fd99cdb47cf0450969c32))
* **i18n:** translate remaining UI edge cases - creator footer, password info, dialog, sketch ([6ab8928](https://github.com/rudra-sah00/watch-rudra/commit/6ab892872f0cb7b64e5c048fa836e179758faa8c))
* **i18n:** translate search/home, watch/player, downloads, watchlist modules ([eb77fb3](https://github.com/rudra-sah00/watch-rudra/commit/eb77fb38b4d286002da56d738f0977937a542804))
* migrate from Tauri to Electron (keep all i18n/biome/test improvements) ([0bb8090](https://github.com/rudra-sah00/watch-rudra/commit/0bb80905e4d22785a7f69015d5e71807b59e5eb7))
* redesign app preferences - theme as dialog, custom download inputs ([94077b9](https://github.com/rudra-sah00/watch-rudra/commit/94077b9d877aa0fda36527c148896618a04585d0))
* redesign download settings as full-screen dialogs matching theme/language style ([ee12fd7](https://github.com/rudra-sah00/watch-rudra/commit/ee12fd77330a2787f5a62305e0bf1263856e0011))
* redesign language selector as full-screen dialog (like download menu) ([23c7364](https://github.com/rudra-sah00/watch-rudra/commit/23c7364594d33d14ecdf96281c9c253a58a0225a))
* **tauri:** implement parallel racer live bridge (port from Electron) ([dd84469](https://github.com/rudra-sah00/watch-rudra/commit/dd84469964fa3ea4885dbcde12c09d48dd9cf407))
* **tauri:** two-proxy live bridge with sniffer for stream capture ([7b5a5e3](https://github.com/rudra-sah00/watch-rudra/commit/7b5a5e39b6381b528dfb6c098b1b8e308a599589))


### Bug Fixes

* add Cancel button to concurrent downloads and speed limit dialogs ([49071c5](https://github.com/rudra-sah00/watch-rudra/commit/49071c5bf34a0c6ae67dfbf33ae8e0cf954092e3))
* add ipc: and http://ipc.localhost to CSP connect-src in next.config.ts ([c86ed18](https://github.com/rudra-sah00/watch-rudra/commit/c86ed18b64f8a2c099c838cd84ddd0e878909ec3))
* add next-intl back, regenerate lockfile, fix electron type conflict ([488f82e](https://github.com/rudra-sah00/watch-rudra/commit/488f82e48e0b837da82f23afdb664014c8bce6f3))
* **i18n:** nest common namespace properly, revert metadata to static ([1eee239](https://github.com/rudra-sah00/watch-rudra/commit/1eee239b51f4d1006827a32ee11ccb29f313ebe2))
* **i18n:** use static import map for Vercel compatibility ([b7ae06c](https://github.com/rudra-sah00/watch-rudra/commit/b7ae06c357bedd37ce5804e0aeecfa33e84b1fa6))
* keep language title fixed, only language list scrolls ([fd36449](https://github.com/rudra-sah00/watch-rudra/commit/fd3644981b1beb62d4997c080aa4fbb138b79c31))
* language dialog auto-closes on selection, add close button ([565ee3f](https://github.com/rudra-sah00/watch-rudra/commit/565ee3f7cdd7bb11f7853bb1fca138f108a3c168))
* live bridge emits hlsUrl (matching frontend), clean up warnings ([968fe1a](https://github.com/rudra-sah00/watch-rudra/commit/968fe1a10d2ce86af7d91a7b734152c0dc11c5e9))
* match dialog background transparency with download menu (bg-white/80 dark:bg-black/60) ([834cb90](https://github.com/rudra-sah00/watch-rudra/commit/834cb90464c53a8f2228050aad46e335a4bf6ba3))
* prevent blank page by adding error handling to IntlProvider ([96ff046](https://github.com/rudra-sah00/watch-rudra/commit/96ff0468bd82edcf40815b9575ea910d7c59a529))
* prevent send button jumping up on first message in watch party chat ([d85e81b](https://github.com/rudra-sah00/watch-rudra/commit/d85e81b6d24d3d983d10bacc7968a1f1aea45975))
* redesign preference triggers as cards (matching server selection style), add Cancel to all dialogs ([2ff7dee](https://github.com/rudra-sah00/watch-rudra/commit/2ff7deebab75d129d23d9b2a94112682c66c0965))
* remove flags from language selector, show only language names ([3df656a](https://github.com/rudra-sah00/watch-rudra/commit/3df656a4d731204804319107eb2c8ea51bfde872))
* remove middleware causing 404 on all routes ([7f04182](https://github.com/rudra-sah00/watch-rudra/commit/7f041822c5fc76826dc2099d133027a2dc6c0701))
* replace deprecated tauri-plugin-shell open with tauri-plugin-opener ([321326c](https://github.com/rudra-sah00/watch-rudra/commit/321326c33b8ee9270c486ac2ce56968b19b7d51e))
* resolve biome warnings in offline.html (arrow fn + optional chain) ([7531f2d](https://github.com/rudra-sah00/watch-rudra/commit/7531f2d64e665d9f6088a3040c4ff817cde30d1a))
* resolve blocking route error by adding middleware + force-dynamic layout ([af39d04](https://github.com/rudra-sah00/watch-rudra/commit/af39d04e5b4ec301c76a6dd9a2f9e7e67fb85be0))
* resolve blocking route error by removing cookies() from root layout ([21b98c2](https://github.com/rudra-sah00/watch-rudra/commit/21b98c24a2c539e17d42600c2c8980e88daf6dd0))
* resolve cacheComponents conflict by moving i18n into Suspense-wrapped IntlProvider ([183ad98](https://github.com/rudra-sah00/watch-rudra/commit/183ad989666dd8dab5b4c84692e1c100720223c4))
* resolve navbar hydration mismatch by using isMounted guard ([1ae85fb](https://github.com/rudra-sah00/watch-rudra/commit/1ae85fbefad4bb7037ce85c80ed275c054a4d8ea))
* resolve nested button hydration error in ContinueWatching ([112e0e5](https://github.com/rudra-sah00/watch-rudra/commit/112e0e5efdcd7f37e2f7f8afb0514d3e91fd222b))
* show preference buttons in one line (icon + text horizontal) ([669da65](https://github.com/rudra-sah00/watch-rudra/commit/669da65f47b37d4888b4d9302177781e48aea62d))
* **tauri:** add ipc: and tauri: to CSP connect-src ([c70bbf9](https://github.com/rudra-sah00/watch-rudra/commit/c70bbf9d3dc5a5773f3fdef05bc301b0a3e4d382))
* **tauri:** rewrite live bridge with proper HLS proxy + devtools ([eeb3ed9](https://github.com/rudra-sah00/watch-rudra/commit/eeb3ed94a7a3eecdd79b5c3c3b9fdd1fa993c59a))
* **tauri:** show racer windows in 3x2 grid in dev mode with always-on-top ([9407401](https://github.com/rudra-sah00/watch-rudra/commit/940740105aca6c03574289ec90c253ae186dcbd7))
* **tauri:** use initialization_script for stream capture like Electron ([a6f95c0](https://github.com/rudra-sah00/watch-rudra/commit/a6f95c01518f4d27fe5bbf6afa772677a11d035c))
* **tauri:** use object CSP format with http://ipc.localhost per official docs ([78a0bfe](https://github.com/rudra-sah00/watch-rudra/commit/78a0bfe63336a1ca385efba4e63d14bf58d47c25))
* **tauri:** use wildcard CSP to allow all ipc:// connections ([c4de41b](https://github.com/rudra-sah00/watch-rudra/commit/c4de41b2a1ce31550568542feb4b94602b4e7d11))
* **ui:** match concurrent/speed modals to password input style ([7c9542d](https://github.com/rudra-sah00/watch-rudra/commit/7c9542d670da47188245b2f4eb1d27210ef22138))
* **ui:** remove max-w-2xl from app preferences to align buttons to card edge ([fe01739](https://github.com/rudra-sah00/watch-rudra/commit/fe01739531b44bb6412cc0e995359897fea34c98))
* **ui:** subtle glow for active theme/language selection instead of heavy button ([7f1d510](https://github.com/rudra-sah00/watch-rudra/commit/7f1d510f1b350ae2fa1759ef12762e05f3312be0))
* update download menu close button to ✕ matching language dialog ([e047152](https://github.com/rudra-sah00/watch-rudra/commit/e0471522b2629ac51897934e07ac2d9ba7b45d88))
* use devUrl for dev mode, frontendDist for production remote URL ([140164b](https://github.com/rudra-sah00/watch-rudra/commit/140164bac370eea49d06cb8a50a96061696cdbc8))
* use empty div as Suspense fallback instead of children ([f857418](https://github.com/rudra-sah00/watch-rudra/commit/f857418beeaae024d3be938a08daa30af63586ad))
* wrap IntlProvider in Suspense with children as fallback ([415ff8c](https://github.com/rudra-sah00/watch-rudra/commit/415ff8c39a82e8406cefb082a76a2b2a8d4c78a3))

## [2.0.1](https://github.com/rudra-sah00/watch-rudra/compare/v2.0.0...v2.0.1) (2026-04-20)


### Bug Fixes

* correct discord.rs path in CI, add Android and iOS mobile builds ([a22dffd](https://github.com/rudra-sah00/watch-rudra/commit/a22dffda5acbac207231c14672cc0ef17cd9bdcc))

## [2.0.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.32.0...v2.0.0) (2026-04-20)


### ⚠ BREAKING CHANGES

* Electron has been completely removed and replaced with Tauri v2.

### Features

* migrate desktop app from Electron to Tauri v2 with iOS/Android support ([0e1feba](https://github.com/rudra-sah00/watch-rudra/commit/0e1febabbcc2dd3888b1df53c7cfc9ee7533cd1b))


### Bug Fixes

* add .vercelignore to exclude src-tauri/ from Vercel deploys ([25cf08c](https://github.com/rudra-sah00/watch-rudra/commit/25cf08c2899376ba78ff16ed87458b5daa4a9aae))
* add retry logic to Vercel deploy step for transient API failures ([d3cc8dd](https://github.com/rudra-sah00/watch-rudra/commit/d3cc8dd43319ce72fcbf405abc55e858b0235416))
* capture only deploy URL from vercel output, suppress stderr ([d0f2b51](https://github.com/rudra-sah00/watch-rudra/commit/d0f2b51ec2f0ed23784f547b97d9b802a3489a2a))
* discord presence for livestreams, biome lint cleanup, emoji picker dark theme ([c627514](https://github.com/rudra-sah00/watch-rudra/commit/c627514e0ffa8cf1110c1fbbfc596ef019e9ecf8))
* **discord:** reduce reconnect cooldown, reset timer on route change ([ad7197b](https://github.com/rudra-sah00/watch-rudra/commit/ad7197b1e5047dd7c6c72ad00f1570a27f0b6fb2))
* **offline:** keep cache storage for offline, reduce network timeout ([aa55953](https://github.com/rudra-sah00/watch-rudra/commit/aa55953a907f45e7a5a14be59b61cb100ece2095))
* **offline:** use NetworkOnly for pages so offline.html fallback shows ([aca8f98](https://github.com/rudra-sah00/watch-rudra/commit/aca8f98c2e9a011e8104af361c29edcfb81b6a0e))
* **player:** prevent error overlay flash during HLS auto-recovery ([ec63cbb](https://github.com/rudra-sah00/watch-rudra/commit/ec63cbbb72c2e0579cbe5a8703880ab17b8a46e2))
* show full vercel deploy output for debugging ([a608311](https://github.com/rudra-sah00/watch-rudra/commit/a608311a4ea32af4a1ffd97a3e29cf86c5f466d2))
* **ui:** show actual app version instead of 0.0.0 ([c4a0ad4](https://github.com/rudra-sah00/watch-rudra/commit/c4a0ad49b8759e8d204117a284f2ac3a74d3ef13))
* update release workflow to reference build-tauri.yml ([0873f39](https://github.com/rudra-sah00/watch-rudra/commit/0873f3914231b2acb22d5e19bf948ef68e184efa))

## [1.32.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.31.0...v1.32.0) (2026-04-20)


### Features

* **ui:** unify empty states across continue watching, watchlist, downloads ([48bb014](https://github.com/rudra-sah00/watch-rudra/commit/48bb014caf9ad120da8f712b9f4af8862c5327df))


### Bug Fixes

* **downloads:** fix store.get crash - providers were passing undefined store ([e07ac06](https://github.com/rudra-sah00/watch-rudra/commit/e07ac0679fe3b854ab68e9f67a98cdfbae415e7c))
* **downloads:** guard store.get call to prevent crash on app close ([f012291](https://github.com/rudra-sah00/watch-rudra/commit/f012291e9fc6b4b7324d5c9a98558b9b07e880dd))
* **player:** add gap between subtitle/audio buttons, fix hover ([0b426f7](https://github.com/rudra-sah00/watch-rudra/commit/0b426f73fb694acf6abb98fe9539e95215b9678f))
* **ui:** align empty state spacing across all pages ([dc54dbe](https://github.com/rudra-sah00/watch-rudra/commit/dc54dbe50ba2cfae63afbb0fc5ee059e62630ea7))
* **watch-party:** fix End Party button not working ([d8f31f2](https://github.com/rudra-sah00/watch-rudra/commit/d8f31f21d32575362bdf90e17a9daa2be56eddf9))
* **watch-party:** memory leaks, sync issues, and edge cases ([567413c](https://github.com/rudra-sah00/watch-rudra/commit/567413cdc4c3e777418f983255b75d3c78de729c))

## [1.31.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.30.0...v1.31.0) (2026-04-19)


### Features

* **live:** show racer windows in dev mode for debugging ([946f6a0](https://github.com/rudra-sah00/watch-rudra/commit/946f6a0f2582cc009953b853fb837cf034dcb330))
* **ui:** per-page loading skeletons matching actual layouts ([a560cf6](https://github.com/rudra-sah00/watch-rudra/commit/a560cf610c13dd345e3b257c976dd75f94f89539))


### Bug Fixes

* **ci:** skip PR preview deploy for release-please PRs ([55cb7d5](https://github.com/rudra-sah00/watch-rudra/commit/55cb7d5c5563251f5bf1d8607a18404192e87f0d))
* **electron:** clear stale SW cache on app version change ([f86ef4c](https://github.com/rudra-sah00/watch-rudra/commit/f86ef4cf0aa6fd1e323559c3642a875d1c3975ae))
* **live+pip:** restore simple mono.css winner, add iframe headers, fix traffic light blink ([84727a6](https://github.com/rudra-sah00/watch-rudra/commit/84727a6337d654857cd45aa8157bc9516d8bda30))
* **live:** detect actual .m3u8 URL instead of mono.css as winner signal ([2b019c7](https://github.com/rudra-sah00/watch-rudra/commit/2b019c7a57d53c4d52a5d59790dc7a677752e2ec))
* **live:** remove strict domain allowlist blocking CDN streams ([b9b45d5](https://github.com/rudra-sah00/watch-rudra/commit/b9b45d5523f587f9b442284a340a3bfb801d011a))
* **live:** revert to simple mono.css winner detection ([b80b955](https://github.com/rudra-sah00/watch-rudra/commit/b80b95529dcc362f1b2c9e7ebab9e6fc7e96235b))
* **live:** verify video element exists before declaring racer winner ([82ef805](https://github.com/rudra-sah00/watch-rudra/commit/82ef805c064d79a9397a2380bfa75f0b73b2afa7))
* **nav:** delay NProgress.done() by one frame to guarantee paint ([6d5e4ec](https://github.com/rudra-sah00/watch-rudra/commit/6d5e4ec2e83d25037a58668042b515c622912403))
* **nav:** remove active underline from navbar buttons ([f277109](https://github.com/rudra-sah00/watch-rudra/commit/f2771096f22726bec662c3de7fb70ba320304a60))
* **nav:** remove NProgress peg glow effect ([6ee2311](https://github.com/rudra-sah00/watch-rudra/commit/6ee2311765e4da070009db26f25f7ee1b11b73a7))
* **nav:** trigger progress bar on programmatic router.push ([5fa321f](https://github.com/rudra-sah00/watch-rudra/commit/5fa321f06a07e5fcd140d6afcb3621af54be61c9))
* **pip:** prevent zoom in/out loop on window switch ([5f376ad](https://github.com/rudra-sah00/watch-rudra/commit/5f376ad2c01c35d2803a80e91a63847550e8cde4))
* **pwa:** use NetworkFirst for pages to prevent stale cache ([0ed008d](https://github.com/rudra-sah00/watch-rudra/commit/0ed008d3b0069d19d1b83877284d17e38ed36beb))
* **search:** match skeleton to actual layout, prevent error flash ([d11f4d0](https://github.com/rudra-sah00/watch-rudra/commit/d11f4d078d770785990fd9309389df87f88fd8cb))
* **ui:** match continue-watching skeleton to exact card layout ([ac3fa1c](https://github.com/rudra-sah00/watch-rudra/commit/ac3fa1cec0ae679797b7ddb4607ea2c5fa750c76))
* **ui:** match watchlist and profile skeletons to exact page layouts ([1285519](https://github.com/rudra-sah00/watch-rudra/commit/12855190ba74aceda3e8eaa7fbe75ca2cd0c32d6))

## [1.30.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.29.5...v1.30.0) (2026-04-19)


### Features

* **nav:** replace custom progress bar with next-nprogress-bar ([57e0450](https://github.com/rudra-sah00/watch-rudra/commit/57e0450f0cbecbcfb8a9302267b09869714afba0))


### Bug Fixes

* **live:** hide bridge windows from taskbar and prevent error flash ([650fb49](https://github.com/rudra-sah00/watch-rudra/commit/650fb49036ef8db684f54d29b9101ba3e852ae92))
* **nav:** ensure progress bar shows on instant navigations ([1c94d0a](https://github.com/rudra-sah00/watch-rudra/commit/1c94d0afd78f6ce57ca8c8da685b6bce539338ee))
* **nav:** position progress bar at navbar bottom with theme colors ([475b950](https://github.com/rudra-sah00/watch-rudra/commit/475b9507dd83691c776498bc7c3cd2fea5d2109d))
* **nav:** raise progress bar z-index above navbar, use skeleton loading ([820bd08](https://github.com/rudra-sah00/watch-rudra/commit/820bd08375cb29a58d7465ad7292db27aea693c6))
* **nav:** restore navbar bottom border, simplify progress bar config ([f16f9ba](https://github.com/rudra-sah00/watch-rudra/commit/f16f9ba9dc5a0fbd4d30c8f07bbdf6bc74e8242a))
* **nav:** restore static border line at navbar bottom ([4a49917](https://github.com/rudra-sah00/watch-rudra/commit/4a499173c5319ed596ed2c5aa4b2eb0fa8715d5b))
* **nav:** use Next.js onRouterTransitionStart for progress bar ([7c20977](https://github.com/rudra-sah00/watch-rudra/commit/7c2097745a1445a3e88f99649d5b1f11999424f4))
* **nav:** use raw NProgress with history.pushState monkey-patch ([33481da](https://github.com/rudra-sah00/watch-rudra/commit/33481da9db6ed075cb052974b3b4cecfb9792151))
* **pwa:** force service worker update checks in Electron ([d8c4a6a](https://github.com/rudra-sah00/watch-rudra/commit/d8c4a6a604ce2d5aa0f7d777b0a7b18b40e25b6e))
* **pwa:** use focus/online events for SW updates instead of polling ([8a16066](https://github.com/rudra-sah00/watch-rudra/commit/8a16066b6546f0d9fe5ae6494c91ca401070ef2c))
* **search:** prevent 'No results' flash before search completes ([ae71d3b](https://github.com/rudra-sah00/watch-rudra/commit/ae71d3bb080b139b22dcad8a307df2dc408709ad))

## [1.29.5](https://github.com/rudra-sah00/watch-rudra/compare/v1.29.4...v1.29.5) (2026-04-19)


### Bug Fixes

* **electron:** use pre-built flat node_modules for asar bundling ([dfa2a53](https://github.com/rudra-sah00/watch-rudra/commit/dfa2a53823c02a818fe227d527ac46f87493a4d1))

## [1.29.4](https://github.com/rudra-sah00/watch-rudra/compare/v1.29.3...v1.29.4) (2026-04-19)


### Bug Fixes

* **electron:** switch to allowlist build.files with full dependency tracing ([fa55b0e](https://github.com/rudra-sah00/watch-rudra/commit/fa55b0e3060bd838e0a39280934ee3761e1277a1))

## [1.29.3](https://github.com/rudra-sah00/watch-rudra/compare/v1.29.2...v1.29.3) (2026-04-19)


### Bug Fixes

* **electron:** add ms as direct dependency for asar inclusion ([1eb66cc](https://github.com/rudra-sah00/watch-rudra/commit/1eb66ccf63f2b50e79742c66377426b72245d1eb))

## [1.29.2](https://github.com/rudra-sah00/watch-rudra/compare/v1.29.1...v1.29.2) (2026-04-19)


### Bug Fixes

* **dev:** allow electron postinstall script in pnpm ([58766b0](https://github.com/rudra-sah00/watch-rudra/commit/58766b09a44c04548d622356971e1e13f86124c5))
* silence Turbopack HMR Sentry crash and AbortError console spam ([19c2ec9](https://github.com/rudra-sah00/watch-rudra/commit/19c2ec9df73b694ad24f8f1429e2b29cbe1b0f72))

## [1.29.1](https://github.com/rudra-sah00/watch-rudra/compare/v1.29.0...v1.29.1) (2026-04-19)


### Bug Fixes

* **ci:** prevent parallel upload race conditions in desktop builds ([426bc8b](https://github.com/rudra-sah00/watch-rudra/commit/426bc8b3464dbba62bb3c6eca9ba2eb979ca1d8d))
* **ci:** resolve CRLF line ending failures on Windows desktop builds ([2b248a0](https://github.com/rudra-sah00/watch-rudra/commit/2b248a0fe76a3ba8b1580d347e326d7eb96ae351))
* **electron:** resolve missing 'ms' module crash in production asar ([2a85955](https://github.com/rudra-sah00/watch-rudra/commit/2a85955e83cbac8c443de26e14a498ebe969765f))

## [1.29.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.28.0...v1.29.0) (2026-04-19)


### Features

* **electron:** Phase I — Check for Updates, taskbar icons, macOS permissions, download progress ([2604fcf](https://github.com/rudra-sah00/watch-rudra/commit/2604fcf21259f00504bfbfefb5f441d315f04c87))
* Phase C — navbar active routes, search UX, accessibility ([3db7a98](https://github.com/rudra-sah00/watch-rudra/commit/3db7a98310aa3258be4e2d753bf6493ac46d1644))
* **player:** Phase B — keyboard shortcuts, accessibility, live player ([ad7cc72](https://github.com/rudra-sah00/watch-rudra/commit/ad7cc729a600dcaba38a76ed9e759b7182ab1f6d))
* **profile:** Phase E — accessibility, System theme, password UX ([8b91cf4](https://github.com/rudra-sah00/watch-rudra/commit/8b91cf413798313e1eb0ab18516caa13dcf118fd))


### Bug Fixes

* **electron:** Phase 4 — stability fixes, architecture cleanup, missing features ([391e03a](https://github.com/rudra-sah00/watch-rudra/commit/391e03aeb40800b85e23d3c069a999005bafbd0d))
* **livestream:** Phase F — Escape key handlers, aria-live scores ([03f1776](https://github.com/rudra-sah00/watch-rudra/commit/03f17766a84943be0de3c38c807b9cbacf991fe8))
* navbar progress bar, offline video playback, auto-updater hang, logout-on-deploy ([449bb3d](https://github.com/rudra-sah00/watch-rudra/commit/449bb3deea691f80d416f42979f8612751951a88))
* Phase 7 — lib fixes, provider cleanup, dependency removal ([985deab](https://github.com/rudra-sah00/watch-rudra/commit/985deab3a9459e9f25ce0cd16e0f9064d1a3331c))
* Phase A — security fixes, remove artificial delays, dead code cleanup ([796714e](https://github.com/rudra-sah00/watch-rudra/commit/796714e9950828b8368d67d103e19c975e20f829))
* **watch-party:** Phase D — emoji theme, accessibility, stability ([3af667a](https://github.com/rudra-sah00/watch-rudra/commit/3af667a3d12cf730ccaa02f8a7327ecbfdbfc412))


### Performance Improvements

* Phase H — caching, loading skeletons, search error handling ([08d59ab](https://github.com/rudra-sah00/watch-rudra/commit/08d59ab982f17c7ba3c49dae4ab4efc2a667a97a))

## [1.28.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.27.0...v1.28.0) (2026-04-19)


### Features

* implement forced loading delays and refine navigation feedback ([37658bb](https://github.com/rudra-sah00/watch-rudra/commit/37658bb9ca235a801f4206cd227bc3433d32f06f))
* **player:** add PiP draggability and fix navigation loop ([25705c6](https://github.com/rudra-sah00/watch-rudra/commit/25705c69d255bd24dc68649513107fc53171bf97))
* refine navigation loading UX with deterministic progress bar and theme-aware feedback ([7e4bdbe](https://github.com/rudra-sah00/watch-rudra/commit/7e4bdbef40cb4bae618fb4387edcf5c8837f9e62))


### Bug Fixes

* **pip:** resolve loop issue and improve draggability and visibility ([f4d819b](https://github.com/rudra-sah00/watch-rudra/commit/f4d819bf94fee494d025a72f3ee9192cff3b8f47))
* **player:** fix syntax error in PlayerHeader tag mismatch ([cb0dcda](https://github.com/rudra-sah00/watch-rudra/commit/cb0dcda275f7650538f3b0d4d2031fb6cfa54cf7))
* **player:** stabilize all button hover states and improve download menu scrolling ([19c8d42](https://github.com/rudra-sah00/watch-rudra/commit/19c8d42cc0b63786e00614b0b3bf1c952aa9da94))
* **player:** stabilize slider hover and resolve biome a11y lint errors ([15fc402](https://github.com/rudra-sah00/watch-rudra/commit/15fc402f852446bfa8eb78f779ef12a511ae69d7))
* resolve offline playback mismatch and enable navigation fallback ([a07e5e0](https://github.com/rudra-sah00/watch-rudra/commit/a07e5e0c03ec7c9cd16b447618b23a0aff73ed4f))
* **updater:** prevent rapid-launch timers from interrupting download ([9f16865](https://github.com/rudra-sah00/watch-rudra/commit/9f168658533a85aa29465229a81839d60ec34d24))

## [1.27.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.26.0...v1.27.0) (2026-04-18)


### Features

* add missing loading boundary for main routes ([4368180](https://github.com/rudra-sah00/watch-rudra/commit/4368180ddec86219f72dfc087399e2a838c7b0d0))


### Bug Fixes

* allow local bridge file loading to bypass offline security policy ([e8d05fd](https://github.com/rudra-sah00/watch-rudra/commit/e8d05fdf1b1dd864b87f0af2b75709d17ee66f15))
* **desktop:** bypass service worker for offline protocol, preserve local subtitles ([cec643f](https://github.com/rudra-sah00/watch-rudra/commit/cec643f0d3d86ac5f96c62f5c784e82a3b55e488))
* **electron:** stability and robustness improvements ([a1202e4](https://github.com/rudra-sah00/watch-rudra/commit/a1202e45299f151a3ad1cdbf598382c44266fc30))
* gracefully handle missing service worker cache by capturing secondary navigation failure ([0d180ae](https://github.com/rudra-sah00/watch-rudra/commit/0d180ae6ea15625a5ac52f0ddf99303d65880b71))
* instantly skip updater when offline using net.isOnline() ([e8bb77b](https://github.com/rudra-sah00/watch-rudra/commit/e8bb77beac02e223a0000b5bcd25cf3d50c8bda6))
* make offline bridge dynamically support local testing overriding Vercel firewall rules ([d382cb4](https://github.com/rudra-sah00/watch-rudra/commit/d382cb40792c142aaa7b696cda104d4d93394ae9))
* migrate to @serwist/cli for turbopack compat, add SerwistProvider to layout ([9d61eb9](https://github.com/rudra-sah00/watch-rudra/commit/9d61eb9fc95740f03da280bf0d1172127a76398c))
* **offline:** resolve blank video player issue by fixing ID matching and localizing HLS encryption keys ([0935ddd](https://github.com/rudra-sah00/watch-rudra/commit/0935ddd39df983aee467e8803b81974c55386c35))

## [1.26.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.25.0...v1.26.0) (2026-04-18)


### Features

* **desktop:** stabilize download manager and enhance platform resilience ([544f09e](https://github.com/rudra-sah00/watch-rudra/commit/544f09ecb6caf1254038f134dea67fe0f0c3d941))
* **desktop:** stabilize electron architecture and enhance media bridge ([f4a2ca0](https://github.com/rudra-sah00/watch-rudra/commit/f4a2ca0f6beb457b7083a893a5a8c6e0c3eeaab2))
* implement offline mode with serwist pwa ([69cde4a](https://github.com/rudra-sah00/watch-rudra/commit/69cde4abe68eb226517719ba75c2b03a09a794a2))
* implement parallel racer for daddylive & fix hydration mismatch ([0b32cab](https://github.com/rudra-sah00/watch-rudra/commit/0b32caba3f620bf5a903ef2079016458230c7da2))


### Bug Fixes

* **tests:** resolve TS error caused by webworker lib ([e93272e](https://github.com/rudra-sah00/watch-rudra/commit/e93272e1ce178a840db9d1082994751730686242))

## [1.25.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.24.1...v1.25.0) (2026-04-17)


### Features

* add global download quality setting, fix electron IPC typings, and resolve download errors ([32af034](https://github.com/rudra-sah00/watch-rudra/commit/32af03402d91aebfb43f363565a8e3f65a18ac40))


### Bug Fixes

* allow S1 and S3 to show download menu and correctly parse server prefix ([45b6d74](https://github.com/rudra-sah00/watch-rudra/commit/45b6d74122d9d144c278b49611ecbfa6f6c4319c))
* **downloads:** allow replacing downloads with different quality, fix poster saving for MP4 downloads ([818d439](https://github.com/rudra-sah00/watch-rudra/commit/818d43934cccd981ef4e5c053f5af2ae0b065458))
* **electron:** bypass Prod 403 Forbidden with net.fetch ([a69b48f](https://github.com/rudra-sah00/watch-rudra/commit/a69b48f2303ad4c99cbe9f99f7def766bbc4b1d9))
* **live:** migrate s1 router paths to live-server1 prefix to prevent cloudflare 403 blocks ([f106a37](https://github.com/rudra-sah00/watch-rudra/commit/f106a37c5c41aaf55657f87bf21b7ba2c8ec896c))
* **ui:** flatten offline vault ui and fix navbar rendering ([a7dd17f](https://github.com/rudra-sah00/watch-rudra/commit/a7dd17fab26f8dca406853ff5bd2f8357e792bc5))
* **ui:** match Offline Vault hero and Downloads nav styling exactly ([998655d](https://github.com/rudra-sah00/watch-rudra/commit/998655d9e7565a0f2e4da4c627ac937e3d0ba6eb))
* **ui:** update profile, downloads, whats-new design and disable prod devtools ([dad6146](https://github.com/rudra-sah00/watch-rudra/commit/dad6146e210b941bd69d49076cb582e3d6dd69c8))

## [1.24.1](https://github.com/rudra-sah00/watch-rudra/compare/v1.24.0...v1.24.1) (2026-04-16)


### Bug Fixes

* **desktop:** disable auto-open devtools in production build ([12c8607](https://github.com/rudra-sah00/watch-rudra/commit/12c86076fcb91e78da80b518795bc4569a483795))
* **styles:** bundle google fonts locally via material-symbols to bypass CORS & silence Turnstile XR warnings ([1ca477d](https://github.com/rudra-sah00/watch-rudra/commit/1ca477dd3e5c08708cbbd809d885e9e574a78662))

## [1.24.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.23.0...v1.24.0) (2026-04-16)


### Features

* add livestreaming components, tests, and docs, fix types/linting ([c278fa3](https://github.com/rudra-sah00/watch-rudra/commit/c278fa3308c4857032d1baffd09d7609d7c2529a))
* **electron:** implement speed tracking, pause resume skipping, and chunk concurrency pooling ([d50722f](https://github.com/rudra-sah00/watch-rudra/commit/d50722f0f8dd3e37b5af6e6844363596ab3e44d0))
* enable universal downloads for all servers on desktop app ([50ce3d5](https://github.com/rudra-sah00/watch-rudra/commit/50ce3d5f9923c7b547e2a70217ae832c87335978))
* implement Offline HLS Downloader logic using Custom internal file protocol ([bfb8c56](https://github.com/rudra-sah00/watch-rudra/commit/bfb8c56c897a100d29723b2963f8ffeb578f2cfc))
* **livestream:** implement Desktop-Only restriction and LiveBridge for Server 1 ([5e41092](https://github.com/rudra-sah00/watch-rudra/commit/5e4109216573b18757c877ce40a07a8421799a04))
* redesign offline library to detailed horizontal list stack and add precision sizes ([f08fdb9](https://github.com/rudra-sah00/watch-rudra/commit/f08fdb9c3cad1aba46c52b3dcc07d9dabcc2a6f7))
* **ui:** replace brutalist square loaders with simple elegant circular spinners and add back button to loading overlay ([9d4b8c8](https://github.com/rudra-sah00/watch-rudra/commit/9d4b8c8d95f248cb86682db786a7da3bfe6c9330))


### Bug Fixes

* correct use client directive placement in watch/[id]/page.tsx ([d22af4b](https://github.com/rudra-sah00/watch-rudra/commit/d22af4ba186792afc7d21f5630d445fcfe4f0a50))
* **desktop:** implement native downloads and fix tests ([959a2c9](https://github.com/rudra-sah00/watch-rudra/commit/959a2c9b3eb7662a0ad14c96946b3d593ff3bf38))
* mute incoming chat sound when chat UI is visible ([be9545f](https://github.com/rudra-sah00/watch-rudra/commit/be9545f28b449545496ce52489f581bc5423e609))
* resolve biome and typescript issues for deployment ([adb4d42](https://github.com/rudra-sah00/watch-rudra/commit/adb4d422427bcdd0b6b0f4bc180525a7e767a0ff))
* resolve infinite loops, useCallback dependencies and live paths ([06c9321](https://github.com/rudra-sah00/watch-rudra/commit/06c9321db23a66a7c983268fe573c9f728891034))
* resolve watch party sync issues, dark mode theming, and electron deep linking ([46eeb34](https://github.com/rudra-sah00/watch-rudra/commit/46eeb3426553eee8d5fd784753d0b21cadf45906))
* **ui:** watch party and player UI enhancements ([677c706](https://github.com/rudra-sah00/watch-rudra/commit/677c706f587138cefdcf94d10b9ac346e8571957))

## [1.23.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.22.0...v1.23.0) (2026-04-13)


### Features

* **desktop:** implement native electron integrations ([b530117](https://github.com/rudra-sah00/watch-rudra/commit/b530117eecad4050bb4dc2ce956c6a6d989363c3))


### Bug Fixes

* **electron:** remove 3d shadow effects from splash screen components ([097573f](https://github.com/rudra-sah00/watch-rudra/commit/097573f6a571fdd0795f0b36b690a38bd9f4d8c8))
* **electron:** resolve macos CMD+Q zombie process lag during splash screen ([cfe6f25](https://github.com/rudra-sah00/watch-rudra/commit/cfe6f25875e68e78792ba5572dccd99b56051349))
* **electron:** update splash screen dark mode colors and icon visibility ([f5259de](https://github.com/rudra-sah00/watch-rudra/commit/f5259de515b16789c7941ca6fa6ee729e818c035))


### Performance Improvements

* **ui:** migrate raw img tags to Next.js optimized Image components ([4edeea5](https://github.com/rudra-sah00/watch-rudra/commit/4edeea5171483474dd258871a7c4f3c86c650ed5))

## [1.22.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.21.0...v1.22.0) (2026-04-13)


### Features

* add what's new page and integrate links across public and private views ([6eda3ad](https://github.com/rudra-sah00/watch-rudra/commit/6eda3adfcfee5df098e144a48844d07dd8e1d37e))

## [1.21.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.20.0...v1.21.0) (2026-04-13)


### Features

* **desktop:** make splash screen respect system dark theme and remove logo blink ([2a32b25](https://github.com/rudra-sah00/watch-rudra/commit/2a32b258a8115dc6d7ae02f19b6bd1de07b84520))


### Bug Fixes

* **desktop:** remove invalid app.releaseMemory call crashing the app after 10 minutes ([0b20fa3](https://github.com/rudra-sah00/watch-rudra/commit/0b20fa3f8c89c8302a1efd8e6bb987352ee554cf))
* **profile:** update danger zone styling for dark mode and fix biome errors ([0cdfc2a](https://github.com/rudra-sah00/watch-rudra/commit/0cdfc2aa36e6d53d4e6698c1f1d156878c1bed4d))
* **theme:** complete global refactor of hardcoded colors for dark mode support ([f112f5d](https://github.com/rudra-sah00/watch-rudra/commit/f112f5d3dfb3bb0fc07b7a3f56ebe78269907473))
* **ui:** dynamic theme coloring for activity graph and tooltip ([b155f47](https://github.com/rudra-sah00/watch-rudra/commit/b155f4728e852fafe4f1af9b123f4080d5c6d3f8))
* **ui:** remove hardcoded colors in public profile stats ([f7bbead](https://github.com/rudra-sah00/watch-rudra/commit/f7bbeadf63d93f353898e45c4a99891acd0b131b))
* **ui:** update content info modal with dark theme compatible colors for resume progress, description, and action buttons ([93a379e](https://github.com/rudra-sah00/watch-rudra/commit/93a379ecc0532510fb6f735f2b46c5efab3bdfa9))
* **ui:** update download modal and content details modal for complete dark theme compatibility ([bee1f0c](https://github.com/rudra-sah00/watch-rudra/commit/bee1f0cbe344c901fa90e57f085524c9e798719b))
* **ui:** update public profile return base button and user id tag for dark theme ([8336e41](https://github.com/rudra-sah00/watch-rudra/commit/8336e41089efacdd109bdf1e5685a6aefe240800))

## [1.20.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.19.0...v1.20.0) (2026-04-13)


### Features

* **electron:** macOS Touch Bar API, expanded system tray, global PTT ([985cbe1](https://github.com/rudra-sah00/watch-rudra/commit/985cbe1ea9796e2f5b171710c55616974ff91ac1))

## [1.19.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.18.0...v1.19.0) (2026-04-13)


### Features

* **desktop:** add app installation heuristic fallback for deep links ([72137a4](https://github.com/rudra-sah00/watch-rudra/commit/72137a4768de9db0f232c828a8cbef5c549ef0c0))
* **electron:** Auto-Picture-in-Picture on window blur ([de47956](https://github.com/rudra-sah00/watch-rudra/commit/de47956f190df34b1bbe6967e251f6dafd7a8daa))
* implement macOS hiddenInset native title bar and custom application menus ([60758b4](https://github.com/rudra-sah00/watch-rudra/commit/60758b4a161add0eb7b30319e782a3d3aceb7574))
* implement native actionable desktop notifications and global media key shortcuts ([002e92c](https://github.com/rudra-sah00/watch-rudra/commit/002e92c43bd881682850ee357d4472e575f8b2ae))
* show app version in creator footer ([69e5e31](https://github.com/rudra-sah00/watch-rudra/commit/69e5e31ac96f0bdadfe303fdd0bea0937450a489))
* splash screen logo update texts and native optim ([808255d](https://github.com/rudra-sah00/watch-rudra/commit/808255d8f287350433b710f39766cd126b31dc41))


### Bug Fixes

* **desktop:** restore native title bar window dragging region for Electron traffic lights ([60f5b30](https://github.com/rudra-sah00/watch-rudra/commit/60f5b3093dd3e6286af314ece4e0fea82ee4668f))
* **docs:** resolve 404 navigation errors on proxy by replacing Next.js Link with vanilla anchor tags ([0eeae4d](https://github.com/rudra-sah00/watch-rudra/commit/0eeae4d2c6815c11254b4b48b54e4195c492fb04))
* **docs:** resolve API_LAYER documentation 404 proxy overlap and rewrite API architecture documentation to match codebase exactly ([eeb8543](https://github.com/rudra-sah00/watch-rudra/commit/eeb8543992fcfaf4bf658e119c69b88b98cb212b))
* **docs:** resolve mermaid chart unrenderable syntax error and expose parser error in UI ([c30d723](https://github.com/rudra-sah00/watch-rudra/commit/c30d723aa3cee72e0cc379ea0441c4edcd6addb5))
* ensure dynamic Next.js routes sync with Discord Rich Presence natively without invalidating image keys ([758d3cd](https://github.com/rudra-sah00/watch-rudra/commit/758d3cdaa6406a0e5f134272a41a00b2705d5d54))
* ensure live streams in Watch Party correctly format Discord status and add missing Discord presence sync for solo Live Streams ([6875731](https://github.com/rudra-sah00/watch-rudra/commit/68757313e94f1572bd7a88b12ba8be4660131453))
* **layout:** add Suspense boundary for DiscordPresenceSync to fix build ([9a87dd4](https://github.com/rudra-sah00/watch-rudra/commit/9a87dd4b7d25cbdce478e20cba50ecc2d48cac91))
* login and signup footer color scheme inverted correctly for black theme ([1435d72](https://github.com/rudra-sah00/watch-rudra/commit/1435d723f4c6f42982be195a05c606bc69909fa7))
* track missing DiscordPresenceSync component and github templates ([fa51427](https://github.com/rudra-sah00/watch-rudra/commit/fa514278955c54f3fc8927f2a54a2a3ca3a20b08))

## [1.18.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.17.0...v1.18.0) (2026-04-12)


### Features

* **docs:** add mermaid.js diagram rendering support to docs markdown ([e695517](https://github.com/rudra-sah00/watch-rudra/commit/e695517ac7c662403e06e4ecdeb0aa25eae2014c))


### Bug Fixes

* **docs:** remove invalid background config from MermaidDiagram ([76da449](https://github.com/rudra-sah00/watch-rudra/commit/76da449af595c79097a71c29b0946eced2a040c7))

## [1.17.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.16.1...v1.17.0) (2026-04-12)


### Features

* **desktop:** enhance Discord Rich Presence to show detailed movie/series metadata dynamically ([9c27f6d](https://github.com/rudra-sah00/watch-rudra/commit/9c27f6d7075708c7b538f2186fac2aff17bd449c))
* **docs:** add embedded markdown documentation portal with tailwind typography ([3f80887](https://github.com/rudra-sah00/watch-rudra/commit/3f808871f07bc761163a47991f281ee6a008c7f0))


### Bug Fixes

* **build:** move use client directive to top line in useStreamUrls to fix Vercel deploy ([6e3a411](https://github.com/rudra-sah00/watch-rudra/commit/6e3a411e14bc05f03c590bc5709cbb43162e9180))
* **build:** rename middleware function export to proxy ([e96bddd](https://github.com/rudra-sah00/watch-rudra/commit/e96bddd01d6e818014401a6f4fcab14492603363))

## [1.16.1](https://github.com/rudra-sah00/watch-rudra/compare/v1.16.0...v1.16.1) (2026-04-12)


### Bug Fixes

* **ci:** trigger desktop builds directly from release pipeline ([1405ebe](https://github.com/rudra-sah00/watch-rudra/commit/1405ebe1c70aa5046902a81069ece1c0fe493e37))

## [1.16.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.15.19...v1.16.0) (2026-04-12)


### Features

* add electron-asar-hot-updater for over-the-air hotfixes ([76f7038](https://github.com/rudra-sah00/watch-rudra/commit/76f7038839398c9de1de4ce76ec680928fe52c8f))
* implement deafen button in the Watch Party Media Controls and shrink username display ([65e0e23](https://github.com/rudra-sah00/watch-rudra/commit/65e0e236e3b9ddf3ee4c5fd2c3af454965ccdc71))
* integrate updater splash screen into app launch lifecycle ([52413ea](https://github.com/rudra-sah00/watch-rudra/commit/52413ea216f44b6884eb056c149b509b244c18ed))
* linking deafen logic to auto-mute mic locally to match standard voice communication behaviour ([e74fa80](https://github.com/rudra-sah00/watch-rudra/commit/e74fa80f2c7e8807c147a86334c86ce00964ac9e))
* replace deafen icon with custom SVG ([98791b0](https://github.com/rudra-sah00/watch-rudra/commit/98791b0755aac7ba225a6c41b036ef4c80edcfa2))


### Bug Fixes

* **electron:** disable custom WatchRudraDesktop UserAgent suffix because Cloudflare Turnstile flags it as bot traffic ([60a6fb1](https://github.com/rudra-sah00/watch-rudra/commit/60a6fb159d76e9394d2e2742fdfe69a143bf0052))
* position absolute overlay properly on deafen button ([12a1015](https://github.com/rudra-sah00/watch-rudra/commit/12a10159c9136a2035d470523df375388feaa255))
* standardize button hover styles for consistency ([872bcb5](https://github.com/rudra-sah00/watch-rudra/commit/872bcb5744a39962d47e80e0f507e49ba2e18da7))

## [1.15.16](https://github.com/rudra-sah00/watch-rudra/compare/v1.15.15...v1.15.16) (2026-04-12)


### Bug Fixes

* update sentry import path for electron 41 compatibility ([c0c4e81](https://github.com/rudra-sah00/watch-rudra/commit/c0c4e81e20dcd8aae5310acd623a3ef37ce057b5))

## [1.12.1](https://github.com/rudra-sah00/watch-rudra/compare/v1.12.0...v1.12.1) (2026-04-09)


### Bug Fixes

* **player:** clear stale playback overlay after successful load ([5e71137](https://github.com/rudra-sah00/watch-rudra/commit/5e71137f30e276871c77c3478f0f7ba4485fa92b))
* **player:** fully optimize error overlay layout to fit dynamically on narrow vertical mobile screens and break long words ([ca90702](https://github.com/rudra-sah00/watch-rudra/commit/ca907026d2bd03900b1f097a4a50d4232291cf1b))
* **player:** guard non-finite seek times ([0d65245](https://github.com/rudra-sah00/watch-rudra/commit/0d65245c84df3a3f63d6590ffb16bfa504bd5e70))
* **player:** make mobile detection hydration safe ([0461652](https://github.com/rudra-sah00/watch-rudra/commit/046165210414802fbb2834cb7e69e07016b93e45))
* resolve race condition causing unknown participant grid and broken kick feature ([26e61fc](https://github.com/rudra-sah00/watch-rudra/commit/26e61fcbabf454d999d483285f162b4819a9f11c))
* **watch-party:** aggressively enforce play state to prevent browsers from auto-pausing inactive monitors/tabs ([4d8ae14](https://github.com/rudra-sah00/watch-rudra/commit/4d8ae1423b0015a9718724e8907cf6dace1f08e4))
* **watch-party:** hide duplicate 'You' name badge in bottom-left for current user overlay ([c86e0e8](https://github.com/rudra-sah00/watch-rudra/commit/c86e0e88c929d01b16ee10fdb13d759e0946b913))
* **watch-party:** optimistically update host local state for permission toggles ([105fed8](https://github.com/rudra-sah00/watch-rudra/commit/105fed8453b40639f9f37ead3237a1b7155cb606))

## [1.12.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.11.0...v1.12.0) (2026-04-06)


### Features

* **auth:** standardize signup/login UI, add username validation, fix mobile footer, and resolve all auth tests ([d2e0169](https://github.com/rudra-sah00/watch-rudra/commit/d2e01695deaebd8ec163bd2860461f8fe790d517))
* implemented brutalist Danger Zone and Account Deletion logic connecting to backend ([17da624](https://github.com/rudra-sah00/watch-rudra/commit/17da624e472ed70ed7523e47b51d35e7693d663c))
* implemented global tour for first-time users via driver.js linked to signup routing ([a66c5bd](https://github.com/rudra-sah00/watch-rudra/commit/a66c5bdab48dccb2da2f947866032755ee9b9b70))
* login/signup UI refinements and layout stability fixes ([0369e9d](https://github.com/rudra-sah00/watch-rudra/commit/0369e9dbd8e16b98fe61889795cfd57bc3ca455c))
* **profile:** implement public profile sharing via UUID with activity heatmap and sharing UI ([46cde3f](https://github.com/rudra-sah00/watch-rudra/commit/46cde3f9d68e3c07b3b3175b7905f94fca9e18bf))
* **profile:** modularize public profile into feature component, harden backend URLs, and add premium neobrutalist 404 ([d6e07fc](https://github.com/rudra-sah00/watch-rudra/commit/d6e07fcb0fbedc5e306fc1a63b49c1568b2d0b28))
* **security:** activate devtools protection in production ([5e0aa45](https://github.com/rudra-sah00/watch-rudra/commit/5e0aa45cdf75ed2b0b21e2b93b2269498b9e8b6c))
* standardizing creator identity and auth UI refinements ([2347039](https://github.com/rudra-sah00/watch-rudra/commit/23470399647aea8a7b2571ddff1f8715e8e6fddb))
* **ui:** unify neo-brutalist interaction physics across all card grids ([73e59d4](https://github.com/rudra-sah00/watch-rudra/commit/73e59d41d9c2208708f014d7465b27e3c271223b))


### Bug Fixes

* **agora:** silence SDK logs in production via NEXT_PUBLIC_AGORA_DEBUG ([73a3959](https://github.com/rudra-sah00/watch-rudra/commit/73a39590d691ed30b7a6b46e1952dd3482be6c5f))
* **auth:** align REVERT button hover with neo-outline standard ([e93c19e](https://github.com/rudra-sah00/watch-rudra/commit/e93c19eb655a3b4b6b936d13fa5d000428236ec5))
* **auth:** align signup schema, enforce mandatory invite code, and fix tests ([2ac46ab](https://github.com/rudra-sah00/watch-rudra/commit/2ac46ab2c4ff0e0dc168dd1b867c349112b61eaf))
* **auth:** improve signup errors and captcha recovery ([0b73fa7](https://github.com/rudra-sah00/watch-rudra/commit/0b73fa789cc84deccf25be459a5163646f08ae4b))
* **auth:** prevent accidental signup form submission on Enter key ([b5ffba3](https://github.com/rudra-sah00/watch-rudra/commit/b5ffba301959c6292318dc58f9f388e521f9c6d2))
* CSP headers for Cloudflare Turnstile explicitly allowing challenges.cloudflare.com and about: frames ([14e534c](https://github.com/rudra-sah00/watch-rudra/commit/14e534cc025b6d3953f27e5455df93ec2e415337))
* handle AbortError in video.play() during navigation ([84ea950](https://github.com/rudra-sah00/watch-rudra/commit/84ea9505b525166d9fb8e15e46516057e729b950))
* **home:** refine mobile search bar and button sizing ([734ea86](https://github.com/rudra-sah00/watch-rudra/commit/734ea86dd5f8d951fa170a6a54a7abbee1cbc19e))
* **live:** prevent livestream progress states from saving to database ([d9634e0](https://github.com/rudra-sah00/watch-rudra/commit/d9634e06e86d0634e6147c36c34292eecc4f2c06))
* **live:** resolve server 2 stream titles and bypass upcoming blocker ([7f60f2b](https://github.com/rudra-sah00/watch-rudra/commit/7f60f2bec9167fe197a6d7325f607388dbb7e4bb))
* **livestream:** stop polling match details after stream URL is found to prevent rate limits ([4321197](https://github.com/rudra-sah00/watch-rudra/commit/432119720d78686ee3193da3a265f8824c1f464d))
* prevent hydration mismatch on public profile page ([682515b](https://github.com/rudra-sah00/watch-rudra/commit/682515b85d55576408855f0b08c3e202e1c2aebe))
* **profile:** redesign mobile card and stabilize profile tests ([0200126](https://github.com/rudra-sah00/watch-rudra/commit/0200126ea3a659483eac28548aeda482a6cb027f))
* **test:** update login page redirect assertion to /home ([8423126](https://github.com/rudra-sah00/watch-rudra/commit/84231267642a9b98c0dae3a5e87055905935f825))
* **watch-party:** resolve audio ducking lingering after muting and stabilize participant speaker state mapping ([6ae43a4](https://github.com/rudra-sah00/watch-rudra/commit/6ae43a4cd0008aa12c06e6ae39472fa447554004))
* **watch-party:** resolve guest join approval notification bug ([b9fd97d](https://github.com/rudra-sah00/watch-rudra/commit/b9fd97d441234d18ef0817901fb2d6b97a5cb8c6))

## [1.11.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.10.0...v1.11.0) (2026-03-28)


### Features

* **auth:** add captcha verification to forgot password form ([10b57f3](https://github.com/rudra-sah00/watch-rudra/commit/10b57f35f5632d126e8fa2a408b8a0efdb6a92e0))
* **auth:** add password reset link and modernize forgot password flow ([4b7927c](https://github.com/rudra-sah00/watch-rudra/commit/4b7927c47e91e5f479663174fd21f4a461b1e466))
* **auth:** refactor signup to multi-step UI and fix player auto-hide with keyboard shortcuts ([0171a05](https://github.com/rudra-sah00/watch-rudra/commit/0171a0529776d8838903f941dfbc742f5f708cb2))
* improve watch party tests coverage and sync fullscreen toggle ([d01ed77](https://github.com/rudra-sah00/watch-rudra/commit/d01ed77b7eb3a493611d43bd13927d086998f866))
* **sketch:** implement automatic cursor ghosting for inactive participants 🌬️ ([a80daa2](https://github.com/rudra-sah00/watch-rudra/commit/a80daa2de5910d40377faaac09577fcfa9c253ee))
* **sketch:** unify premium collaborative board with 100% passing tests & zero biome warnings 💎🚀 ([6968a4a](https://github.com/rudra-sah00/watch-rudra/commit/6968a4a1332b877030cc7dc507721ac7cb22acb5))


### Bug Fixes

* **auth:** fix security verification failure during signup by hardening captcha handling and validation error mapping ([a71a975](https://github.com/rudra-sah00/watch-rudra/commit/a71a975e3570386b7bfbbda7270e76302693bf1b))
* chat message flicker, remove unread badge, and add jumbomoji support ([7304bf6](https://github.com/rudra-sah00/watch-rudra/commit/7304bf600788e134adb70df8056cba1783521a1c))
* resolve 9 Biome warnings in watch tests ([1a6e490](https://github.com/rudra-sah00/watch-rudra/commit/1a6e490ea29c2d1a728ba8734699ce994bd67269))
* resolve all frontend test failures after HTTP migration ([6b6c19e](https://github.com/rudra-sah00/watch-rudra/commit/6b6c19e945a4d4821f5eef4b9f138ef8f9724485))
* resolve test failures and migrate to HTTP ([2b1d67e](https://github.com/rudra-sah00/watch-rudra/commit/2b1d67e6dde7e86291d1fb099fa110292a8a1213))
* **sketch:** ensure capture scene includes both video and drawings 📸🎬 ([bd7f9c5](https://github.com/rudra-sah00/watch-rudra/commit/bd7f9c5cca79e610c269c32b86220e94079339bc))
* **watch-party:** finalize test suites, resolve biome lints and stale closures ([b0c851e](https://github.com/rudra-sah00/watch-rudra/commit/b0c851ef2a618a965fa225b94ad0f7838d9f7d37))

## [1.10.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.9.1...v1.10.0) (2026-03-25)


### Features

* add chat sound effects ([9222f61](https://github.com/rudra-sah00/watch-rudra/commit/9222f6153f7d2904c30fc22dc1b35ef43f599dbf))
* **auth:** aggressively optimize LoginForm spacing for 500px cards ([4677ce6](https://github.com/rudra-sah00/watch-rudra/commit/4677ce6d4a26ba8831c516746be70507e3a8ffba))
* **auth:** refine authentication UI branding and stabilize responsive layouts ([aa1d0e9](https://github.com/rudra-sah00/watch-rudra/commit/aa1d0e964ab9a19bf3ce4eaf2ad2c6501ba69382))
* **auth:** restore original layout while keeping new branding ([53e2c10](https://github.com/rudra-sah00/watch-rudra/commit/53e2c10e8c58c909efdd1097918e00b007bdcb3e))
* **auth:** synchronize grid layouts for login and signup pages ([67d4d23](https://github.com/rudra-sah00/watch-rudra/commit/67d4d2303b9327d1630b0886a9b7c03bda92c7d3))
* dynamic sidebar toggle icon ([7815326](https://github.com/rudra-sah00/watch-rudra/commit/7815326570af420657f535240e6a0f800fd9188b))
* **search:** optimize content modal actions with sticky grid layout for mobile ([5ad7632](https://github.com/rudra-sah00/watch-rudra/commit/5ad763292251306f8b0185e5ff5adda241bd436f))
* **search:** refactor content info and actions with fixed tests and sticky mobile layout ([99318cb](https://github.com/rudra-sah00/watch-rudra/commit/99318cbb45e79870bd89efb4e5ed93aaa19e223b))
* **search:** standardize content modal action buttons ([aca6981](https://github.com/rudra-sah00/watch-rudra/commit/aca698185261876cd123d5fd8b358acc5b858700))
* **watch-party:** neo-brutalist redesign for chat and access settings ([df54d38](https://github.com/rudra-sah00/watch-rudra/commit/df54d38a987dccb6e4e692c3b5510040122cf157))
* **watch-party:** neo-brutalist UI standardization and robust permission synchronization ([a45872e](https://github.com/rudra-sah00/watch-rudra/commit/a45872eb93f622da8686afacafb9e553506b02fa))


### Bug Fixes

* **ci:** robust vercel deployment retry logic and env synchronization ([fd50eea](https://github.com/rudra-sah00/watch-rudra/commit/fd50eeae42d36ae33aeb36dc513e59792ce19f19))
* **ci:** use vercel archive for stable uploads ([e5fe40a](https://github.com/rudra-sah00/watch-rudra/commit/e5fe40afac32b74abff7c8d69050018ea950ba69))
* **player:** use router.replace for episode navigation to prevent history clutter ([c6a8044](https://github.com/rudra-sah00/watch-rudra/commit/c6a80446d35ee0fad05fd4a0de1a60526dd457a9))
* **watch:** trigger stream refetch on episode/season change ([1590032](https://github.com/rudra-sah00/watch-rudra/commit/1590032202efffd027347b929ff05a098f3fd8c2))

## [1.9.1](https://github.com/rudra-sah00/watch-rudra/compare/v1.9.0...v1.9.1) (2026-03-25)


### Bug Fixes

* **search:** fix text clipping, add blur on enter, and fix failing tests ([081a660](https://github.com/rudra-sah00/watch-rudra/commit/081a660a4eca320e9bce596e8894493895557945))

## [1.9.0](https://github.com/rudra-sah00/watch-rudra/compare/v1.8.0...v1.9.0) (2026-03-25)


### Features

* **auth:** support mobile callback redirect on web otp verify ([a767935](https://github.com/rudra-sah00/watch-rudra/commit/a7679353eb8fa4847b314c555111f97ec9f46d05))
* **search:** show skeleton instantly on Enter key press ([0493afd](https://github.com/rudra-sah00/watch-rudra/commit/0493afd0778b5f3565c040057a08d0d14b6cf343))
* **sketch:** replace browser prompt() with custom inline text input ([0ed6282](https://github.com/rudra-sah00/watch-rudra/commit/0ed628289028768b3c0a0add52a861f8b243e7c5))
* **ui:** rename servers to more user-friendly labels ([fb90e59](https://github.com/rudra-sah00/watch-rudra/commit/fb90e59f006b5b0a30d079ac00866b37bdf83fdd))


### Bug Fixes

* abort signal support for fetch hooks, remove dead /health call ([e83fd3c](https://github.com/rudra-sah00/watch-rudra/commit/e83fd3c5a08f4e9df6ae645a382df58af570bdfa))
* append CSRF token to sendBeacon URL for /api/video/stop ([5a4d39c](https://github.com/rudra-sah00/watch-rudra/commit/5a4d39c7b3f66b167936528ae0418940d4176cb4))
* **auth:** match signup button to login design and rename to 'Begin Story' ([c6cc275](https://github.com/rudra-sah00/watch-rudra/commit/c6cc275f90f086e610e45041a97b38009bdc1c1f))
* encode S2 content IDs in watch URLs to handle slashes in path segments ([2fd2285](https://github.com/rudra-sah00/watch-rudra/commit/2fd22855d796584061e49abec5282c6b8648e4b0))
* **frontend:** render profile photo correctly on profile-overview ([1c3bace](https://github.com/rudra-sah00/watch-rudra/commit/1c3bace4535dbeaa449f53eb4e4156c843e0f341))
* **frontend:** update frontend integrations and components ([22fd968](https://github.com/rudra-sah00/watch-rudra/commit/22fd968290232a8abe7acf93589b59a20a5023df))
* **loading:** single white spinner on initial page load ([f90d803](https://github.com/rudra-sah00/watch-rudra/commit/f90d803dcc7bb311af2dc9e411e28f28427d2a46))
* **player:** pass explicit providerId to watch party player root to prevent fallback to mp4 engine for server 3 streams ([78b8ed2](https://github.com/rudra-sah00/watch-rudra/commit/78b8ed2dfbd6f8ac7f4f35a91dd8b43814775e60))
* profile error toast, modal close-before-nav, watch party inline mode, continue watching fixes ([ab8d883](https://github.com/rudra-sah00/watch-rudra/commit/ab8d883016bbb5cbef48e472ea9b63a3ba199bb9))
* remove duplicate error toast and stale toast on settings tab switch ([bfbce58](https://github.com/rudra-sah00/watch-rudra/commit/bfbce58f4fa1921b6420576aea187b3fb839c491))
* S2 playback, video fit, live page colors, continue watching reset ([9729f81](https://github.com/rudra-sah00/watch-rudra/commit/9729f8129982d2a5374116feb94e08df6075659d))
* **search:** remove duplicate old skeleton on first navigation ([c4ed5ff](https://github.com/rudra-sah00/watch-rudra/commit/c4ed5ff4be4da0b3a2e64d43eab481afba7dd61b))
* **signup:** fit entire form in one screen without scrolling ([9490e87](https://github.com/rudra-sah00/watch-rudra/commit/9490e877cec47634cb2d4985c17c2c1fec2a20c0))
* **signup:** match button design to login and rename to 'Begin Story' ([916bf25](https://github.com/rudra-sah00/watch-rudra/commit/916bf256449a5d6b00cfa759533c841c616c2da7))
* **signup:** match header size to login, left cards stretch to match form height ([9a0368c](https://github.com/rudra-sah00/watch-rudra/commit/9a0368c0972a8819130c5b7b40078f9018d9e9c0))
* **signup:** restore Watch Rudra brand heading, just smaller (text-4xl) ([aaa028f](https://github.com/rudra-sah00/watch-rudra/commit/aaa028fd9b57d79e9fae05f090e3781a5113ae93))
* stream session cleanup and video fit on ultrawide screens ([5adf9ae](https://github.com/rudra-sah00/watch-rudra/commit/5adf9ae7b458ee2bbf96797e56a1f3b5d0762b85))
* **tests:** resolve Biome warnings and TS errors in watch-party test suite ([bd36943](https://github.com/rudra-sah00/watch-rudra/commit/bd369431c16d44677677b88137853a6fad4a326c))

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
