# Ask AI — Voice Assistant

## Overview

Ask AI is a voice-to-voice AI assistant powered by AWS Bedrock Nova 2 Sonic. Users speak naturally and the AI responds with speech, with tool calling capabilities to search content, manage watchlists, start playback, and check live streams.

## Architecture

```
src/features/ask-ai/
├── hooks/
│   └── use-ask-ai.ts          # Core hook: mic capture, playback, socket protocol
└── components/
    └── AskAiView.tsx           # UI: play button, status, transcripts
```

### Backend Module

```
src/modules/ask-ai/
├── nova-sonic.client.ts        # Bedrock bidirectional stream client (ported from official AWS sample)
├── tools.config.ts             # Tool schemas (JSON stringified inputSchema)
└── tools.executor.ts           # Tool execution — calls existing backend services

src/websocket/handlers/
└── ask-ai.handler.ts           # Socket.IO handler — session lifecycle + event routing
```

### Integration Points

- **Socket.IO**: All communication via WebSocket events (no REST endpoints)
- **AWS Bedrock**: `InvokeModelWithBidirectionalStreamCommand` over HTTP/2
- **Backend Services**: Tools call ContentService, WatchlistService, WatchService, LivestreamService, FriendsService

## Protocol

Follows the official AWS Nova Sonic Node.js sample exactly. The frontend sends separate events for each lifecycle step:

```
Frontend                    Backend                     Nova Sonic
   │                           │                           │
   │── ask-ai:init ──────────►│── createSession ─────────►│
   │◄─ callback({success}) ───│◄─ stream established ─────│
   │── ask-ai:promptStart ───►│── sessionStart + ─────────►│
   │                           │   promptStart (with tools) │
   │── ask-ai:systemPrompt ──►│── system prompt events ───►│
   │── ask-ai:audioStart ────►│── audio contentStart ─────►│
   │◄─ ask-ai:audioReady ────│                             │
   │                           │                           │
   │── ask-ai:audioInput ────►│── audioInput chunk ───────►│  (continuous mic stream)
   │── ask-ai:audioInput ────►│── audioInput chunk ───────►│
   │                           │                           │
   │                           │◄─ contentStart (AUDIO) ───│  (AI responds)
   │◄─ ask-ai:audioOutput ───│◄─ audioOutput chunks ──────│
   │◄─ ask-ai:textOutput ────│◄─ textOutput ──────────────│
   │◄─ ask-ai:contentEnd ────│◄─ contentEnd ──────────────│
   │                           │                           │
   │── ask-ai:stop ──────────►│── contentEnd + promptEnd ─►│
   │◄─ ask-ai:sessionClosed ─│── sessionEnd ──────────────►│
```

## Audio Format

| Direction | Sample Rate | Format | Encoding |
|-----------|------------|--------|----------|
| Input (mic → Nova Sonic) | 16 kHz | PCM 16-bit mono | base64 |
| Output (Nova Sonic → speaker) | 24 kHz | PCM 16-bit mono | base64 |

The frontend captures at the browser's native sample rate and downsamples to 16kHz before sending.

## Mic Muting During AI Speech

The mic stops sending audio while the AI is speaking (matching AWS playground behavior). This prevents echo and accidental interruptions:

- `contentStart` with `role: ASSISTANT, type: AUDIO` → mute mic
- `contentEnd` → unmute mic

## Tool Calling

Nova 2 Sonic supports native tool calling. Tools are defined with `JSON.stringify()`'d input schemas (required by the API).

### Available Tools

| Tool | Service | Description |
|------|---------|-------------|
| `search_content` | ContentService | Search movies/shows across all 3 servers (parallel, deduped) |
| `get_content_details` | ContentService | Get description, cast, rating, seasons for a specific title |
| `get_watchlist` | WatchlistService | User's saved watchlist items |
| `get_continue_watching` | WatchService | Unfinished content with progress percentage |
| `get_live_streams` | LivestreamService | Currently live sports and TV channels |
| `get_friends_activity` | FriendsService | Online friends list |
| `play_content` | — | Emits `ask-ai:navigate` → frontend navigates to `/watch/...` |
| `add_to_watchlist` | WatchlistService | Adds content to user's watchlist |
| `search_manga` | MangaService | Search manga titles by name |
| `get_manga_details` | MangaService | Get manga overview, chapters, tags, rating |
| `get_manga_progress` | MangaService | User's in-progress manga with chapter and page position |
| `get_manga_favorites` | MangaService | User's saved/favorited manga titles |
| `open_manga` | — | Emits `ask-ai:openManga` → frontend navigates to manga title or chapter |

### Tool Flow

1. Model decides to call a tool → sends `toolUse` event
2. `contentEnd` with `type: TOOL` triggers execution
3. Backend calls the appropriate service
4. Result sent back via `toolResult` event

### System Prompt Behavior

The system prompt instructs the AI to:

1. **Disambiguate content type** — When a user asks to search or find something, ask whether they mean movies/series, manga, or music before searching. Example: "Are you looking for the anime, the manga, or the soundtrack?"
2. **Check availability** — After searching, tell the user if the content is available and offer to play/open it.
3. **Continue watching/reading** — When asked "what was I watching/reading?", check both `get_continue_watching` (for video) and `get_manga_progress` (for manga) and present both.
4. **Navigate directly** — Use `play_content` for video, `open_manga` for manga, and `ask-ai:playMusic` for music. Don't just describe — take the user there.
5. Model incorporates result into spoken response

## Text Output Filtering

Nova Sonic sends multiple text events per turn:

- **SPECULATIVE** (`additionalModelFields.generationStage === 'SPECULATIVE'`): Preview of what AI will say — displayed to user
- **FINAL**: Actual spoken transcript — not displayed (would duplicate)
- **USER**: ASR transcription of what user said — displayed

## Session Limits

- **Connection limit**: 8 minutes per session (AWS limit)
- **Model**: `amazon.nova-2-sonic-v1:0`
- **Region**: `us-east-1`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM access key with `bedrock:InvokeModel` permission |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `AWS_BEDROCK_REGION` | Region (default: `us-east-1`) |

## Watch Party Integration

The Record button in watch party is host-only. Ask AI is available from the `/ask-ai` route in the sidebar.
