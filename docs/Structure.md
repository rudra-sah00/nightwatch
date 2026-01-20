src/
├── app/
│ ├── layout.tsx
│ ├── globals.css
│ ├── loading.tsx
│ ├── error.tsx
│ ├── not-found.tsx
│
│ ├── (public)/
│ │ └── login/
│ │ └── page.tsx
│
│ ├── (protected)/
│ │ ├── layout.tsx # SERVER auth guard
│ │
│ │ ├── search/
│ │ │ └── page.tsx # /search?q=
│ │
│ │ ├── watch/
│ │ │ └── [id]/
│ │ │ └── page.tsx # Netflix player page
│ │
│ │ └── profile/
│ │ ├── page.tsx
│ │ └── settings/
│ │ └── page.tsx
│
├── features/
│ ├── auth/
│ │ ├── api.ts
│ │ ├── schema.ts
│ │ ├── components/
│ │ │ └── login-form.tsx
│ │ └── types.ts
│
│ ├── search/
│ │ ├── api.ts
│ │ ├── components/
│ │ │ ├── search-input.tsx
│ │ │ └── search-results.tsx
│ │ ├── schema.ts
│ │ └── types.ts
│
│ ├── profile/
│ │ ├── api.ts
│ │ ├── components/
│ │ │ ├── profile-card.tsx
│ │ │ └── settings-form.tsx
│ │ ├── schema.ts
│ │ └── types.ts
│
│ └── watch/ # ⭐ MOST IMPORTANT FEATURE
│ ├── page/ # Page composition only
│ │ └── WatchPage.tsx
│ │
│ ├── player/ # VIDEO ENGINE (NO UI)
│ │ ├── VideoElement.tsx # <video> ONLY (never re-render)
│ │ ├── useHls.ts # HLS.js setup
│ │ ├── usePlayerState.ts # Zustand store
│ │ ├── useMediaSession.ts # Lock screen controls
│ │ ├── useKeyboard.ts # Space, arrows, F
│ │ ├── useFullscreen.ts
│ │ ├── useWatchHeartbeat.ts # WS progress sync
│ │ └── types.ts
│ │
│ ├── controls/ # PLAYER UI
│ │ ├── ControlBar.tsx
│ │ ├── PlayPause.tsx
│ │ ├── SeekBar.tsx
│ │ ├── Volume.tsx
│ │ ├── QualitySelector.tsx
│ │ ├── PlaybackSpeed.tsx
│ │ └── Fullscreen.tsx
│ │
│ ├── overlays/ # NETFLIX-STYLE OVERLAYS
│ │ ├── LoadingOverlay.tsx
│ │ ├── BufferingOverlay.tsx
│ │ ├── ErrorOverlay.tsx
│ │ └── AutoNextOverlay.tsx
│ │
│ ├── api.ts # Backend watch APIs
│ └── types.ts
│
├── components/
│ ├── ui/ # shadcn / radix UI
│ │ ├── button.tsx
│ │ ├── input.tsx
│ │ └── label.tsx
│ │
│ ├── layout/
│ │ ├── navbar.tsx
│ │ └── footer.tsx
│ │
│ └── feedback/
│ └── toast.tsx
│
├── lib/
│ ├── fetch.ts
│ ├── auth.ts
│ ├── ws.ts # WebSocket client
│ ├── media.ts # Media helpers (PiP, fullscreen)
│ ├── env.ts
│ └── constants.ts
│
├── providers/
│ ├── auth-provider.tsx
│ ├── query-provider.tsx
│ └── theme-provider.tsx
│
├── hooks/
│ └── use-debounce.ts
│
├── styles/
│ └── tailwind.css
│
├── types/
│ └── index.ts
│
└── utils/
└── index.ts
