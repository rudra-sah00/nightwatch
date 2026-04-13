# Changelog

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
