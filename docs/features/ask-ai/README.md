# Ask AI — Voice Assistant

Voice-to-voice AI assistant powered by AWS Bedrock Nova Sonic. Users speak naturally and the AI responds with speech, with tool calling capabilities to search content, manage watchlists, start playback, and check live streams.

**Source:** `src/features/ask-ai/`, `src/app/(protected)/(main)/ask-ai/`

## Architecture

```
src/features/ask-ai/
├── types.ts                    # AskAiState, AskAiMessage, AskAiError, AskAiErrorCode
├── lib/
│   ├── audio-capture.ts        # Mic capture: AudioWorklet preferred, ScriptProcessor fallback
│   ├── audio-playback.ts       # Assistant playback: AudioWorklet ring buffer with barge-in flush
│   ├── pcm.ts                  # PCM ↔ base64 conversion (16-bit LE LPCM)
│   └── conversation.ts         # Pure turn history logic: upsert, dedup SPECULATIVE/FINAL
├── hooks/
│   └── use-ask-ai.ts           # Core hook: mic capture, playback, socket protocol, tool events
└── components/
    └── AskAiView.tsx            # UI: orb button, status, scrollable conversation transcript
```

### Backend Module (not part of this repo)

The backend handles the Bedrock session lifecycle, tool schemas, and tool execution. Communication between frontend and backend is entirely via Socket.IO events — no REST endpoints.

### Integration Points

- **Socket.IO**: All communication via namespaced `ask-ai:*` events on the main app socket (via `SocketProvider`)
- **AWS Bedrock**: Backend uses `InvokeModelWithBidirectionalStreamCommand` over HTTP/2
- **Model**: `amazon.nova-sonic-v1:0` (not "Nova 2 Sonic" — see [Session Limits](#session-limits))

## Frontend Socket Events

The frontend emits and listens to these Socket.IO events:

### Emitted by Frontend

| Event | When | Payload |
|-------|------|---------|
| `ask-ai:init` | Session start | Callback `({ success, error? })` |
| `ask-ai:promptStart` | After init succeeds | — |
| `ask-ai:systemPrompt` | After promptStart | — |
| `ask-ai:audioStart` | After systemPrompt | — |
| `ask-ai:audioInput` | Continuous mic stream | base64 PCM string |
| `ask-ai:stop` | Session end / cleanup | — |

### Received by Frontend

| Event | Handler |
|-------|---------|
| `ask-ai:contentStart` | Detects text vs audio turn start; mutes/unmutes based on assistant speech |
| `ask-ai:textOutput` | Appends/updates transcript (handles barge-in interruption sentinel) |
| `ask-ai:audioOutput` | Enqueues base64 PCM chunks to playback buffer |
| `ask-ai:contentEnd` | Detects turn end or interruption; unmutes after assistant finishes |
| `ask-ai:error` | Sets error state with server detail |
| `ask-ai:streamComplete` | Resets to idle |
| `ask-ai:sessionClosed` | Resets to idle |
| `ask-ai:navigate` | Closes session → `router.push(url)` for video playback |
| `ask-ai:playMusic` | Dispatches `ask-ai:play-music` window event → closes session |
| `ask-ai:playPlaylist` | Dispatches `ask-ai:play-playlist` window event → closes session |
| `ask-ai:musicControl` | Dispatches `ask-ai:music-control` window event (no session close) |
| `ask-ai:openManga` | Closes session → navigates to manga title or chapter |
| `ask-ai:endSession` | Closes session |

## Audio Format

| Direction | Sample Rate | Format | Encoding |
|-----------|------------|--------|----------|
| Input (mic → backend) | 16 kHz | PCM 16-bit mono | base64 |
| Output (backend → speaker) | 24 kHz | PCM 16-bit mono | base64 |

The frontend captures at the browser's native sample rate and resamples to 16 kHz. If the browser honours the 16 kHz `sampleRate` request on `AudioContext`, no resampling is needed.

## Audio Capture (`lib/audio-capture.ts`)

Prefers **AudioWorklet** (`/audio-capture-processor.js`) for off-main-thread processing. Falls back to **ScriptProcessorNode** when the worklet is unavailable (Capacitor WebViews, Android TV).

- Mono channel with `echoCancellation`, `noiseSuppression`, `autoGainControl` enabled
- Echo cancellation is critical — without it the assistant hears its own output through the speakers
- Resampling uses linear interpolation when the native rate ≠ 16 kHz
- Provides `setMuted(boolean)` to pause sending without tearing down the graph

## Audio Playback (`lib/audio-playback.ts`)

Prefers **AudioWorklet** (`/audio-player-processor.js`) with a ring buffer for smooth delivery. Falls back to manually scheduled `AudioBufferSourceNode`s.

- Output at 24 kHz
- Initial buffer of 4800 frames (0.2s) before playback starts for jitter resistance
- `flush()` discards all queued audio instantly — used for barge-in interruption
- The worklet receives `{ type: 'barge-in' }` messages; the fallback path retains source references and calls `stop()` + `disconnect()` on each

## Conversation History (`lib/conversation.ts`)

Pure functions for managing the transcript:

- **`upsertTurn`**: Appends when the turn key is new; replaces the tail when it matches (streaming updates and SPECULATIVE → FINAL transitions are idempotent)
- **`nextTurn`**: Builds a turn key; consecutive blocks from the same speaker share a key
- **`isSpeculative`**: Parses `additionalModelFields` JSON for `generationStage === 'SPECULATIVE'`
- **`isInterruption`**: Detects barge-in via `stopReason: 'INTERRUPTED'` or sentinel JSON `{ interrupted: true }`
- **`MAX_HISTORY`**: 100 turns retained

## Barge-In and Mic Behaviour

The mic stays open while the assistant speaks — this lets the service detect an interruption (echo cancellation prevents it from hearing itself). When the assistant is interrupted:

1. Queued audio is flushed via `playbackRef.current.flush()`
2. State returns to `'listening'`
3. The backend receives the overlapping audio and sends a barge-in signal

## Music Ducking

- `ask-ai:music-suspend` / `ask-ai:music-resume` window events pause/resume background music around a session
- Music is suspended before the mic opens to prevent the service from reading it as speech
- Hand-off actions (`play_content`, `play_music`, `play_user_playlist`) close the session entirely
- Transport controls (`music_control`) do not close the session — the user may keep talking

## Text Output Handling

Nova Sonic sends multiple text events per turn:

- **SPECULATIVE** (`generationStage === 'SPECULATIVE'` in `additionalModelFields`): Draft of what AI will say — displayed to user, replaced in place as it updates
- **FINAL**: Settled transcript — overwrites the speculative draft via the shared turn key
- **USER**: ASR transcription of what user said — displayed as a user bubble

## Tool Calling (Backend)

> Tool schemas, execution, and the system prompt are defined in the backend. The frontend only receives navigation/playback events as a result of tool calls.

The backend defines 19 tools. When a tool produces a navigation or playback action, the backend emits one of the `ask-ai:navigate`, `ask-ai:playMusic`, `ask-ai:playPlaylist`, `ask-ai:musicControl`, `ask-ai:openManga`, or `ask-ai:endSession` events, which the frontend handles as described in the [events table](#received-by-frontend) above.

## AskAiView Component

`src/features/ask-ai/components/AskAiView.tsx`

The `/ask-ai` route renders this component:

- **Orb button** — toggles between idle (Play icon), listening (yellow pulse rings), and speaking (blue pulse ring). Tapping starts/stops the session.
- **Status line** — `role="status" aria-live="polite"` announces state changes for screen readers
- **Conversation transcript** — `role="log" aria-live="polite" aria-relevant="additions text"` scrollback region with auto-scroll (pauses if user scrolled up)
- **Clear history** button — resets transcript
- **Error display** — translatable error codes via `t('askAi.errors.${code}')`
- **Accessibility**: live regions ensure the voice-only feature is usable with assistive tech

## Error Handling

| Code | Trigger |
|------|---------|
| `micDenied` | Microphone permission refused or blocked |
| `micUnavailable` | No mic device, or `getUserMedia` unsupported (e.g. some Capacitor WebViews) |
| `notConnected` | Socket not connected when session is started |
| `startFailed` | Init callback failed or other startup error |
| `serverError` | Backend error relayed via `ask-ai:error` event |

## Session Limits

- **Connection limit**: 8 minutes per session (AWS Bedrock limit)
- **Model**: `amazon.nova-sonic-v1:0`
- **Region**: `us-east-1` (configurable via `AWS_BEDROCK_REGION`)

## Related Docs

- [Watch](../watch/README.md) — video playback navigated to by `play_content` tool
- [Music](../music/README.md) — music playback triggered by `play_music` / `play_user_playlist` tools
- [Manga](../manga/README.md) — manga navigation triggered by `open_manga` tool
- [State Management](../../architecture/STATE_MANAGEMENT.md) — Socket.IO provider details
