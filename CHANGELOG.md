# Changelog

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
