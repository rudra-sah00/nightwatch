# Explore & Direct Messages

## Overview

The Explore module is Nightwatch's social feed — a Twitter/X-style timeline where users post text, media, polls, and watch party invites. Direct Messages (DM) provides 1-on-1 real-time chat between friends.

**Tech stack:**
- **Posts storage:** Firestore (`explore_posts` collection + `reactions` subcollection)
- **Feed ranking:** Redis sorted sets (cron-recomputed every 5 min)
- **Fan-out:** Redis sorted sets per user (`explore:timeline:{userId}`)
- **View counts:** Redis HyperLogLog (`explore:views:{postId}`)
- **DM storage:** PostgreSQL (`messages` table via Drizzle ORM)
- **Real-time:** Socket.IO (typing, delivery receipts, thread updates)
- **Media:** Cloudinary (images, videos, voice notes)
- **AI:** AWS Bedrock Nova + Tavily web search

---

## Architecture

```
┌─────────────┐    Firestore onSnapshot     ┌──────────────┐
│  Frontend   │◄────────────────────────────►│  Firestore   │
│  (Next.js)  │                              │  (Posts DB)  │
│             │    REST API (CRUD)           ┌──────────────┐
│             │◄───────────────────────────►│   Backend    │
│             │                              │  (Express)   │
│             │    Socket.IO (real-time)     │              │
│             │◄───────────────────────────►│              │
└─────────────┘                              │              │
                                             │    Redis     │
                                             │  (ranking,   │
                                             │   timelines, │
                                             │   views,     │
                                             │   rate limit)│
                                             └──────────────┘
```

### Feed Delivery Strategy

1. **Fan-out on Write**: When a user creates a post, it's pushed to all their friends' Redis timelines (`ZADD explore:timeline:{friendId} <timestamp> <postId>`). Feed reads are O(1) via `ZREVRANGE`.

2. **Content Ranking (Trending tab)**: A cron job runs every 5 minutes computing:
   ```
   score = (reactions×2 + replies×3 + reposts×5) / (age_hours + 2)^1.5
   ```
   Results stored in `explore:ranked` sorted set.

3. **Real-time updates**: Firestore `onSnapshot` listener for new root posts. Socket.IO `explore:post-reply` events for live thread updates.

---

## Backend Modules

### `src/modules/explore/`

| File | Purpose |
|------|---------|
| `explore.routes.ts` | Express routes (public reads + authenticated writes) |
| `explore.controller.ts` | Request handling, validation, media upload (sharp + Cloudinary) |
| `explore.service.ts` | Business logic: CRUD, feeds, reactions, polls, notifications |
| `explore.schema.ts` | Zod validation schemas |
| `explore.types.ts` | TypeScript interfaces |
| `explore.ranking.ts` | Ranking cron, HyperLogLog views, fan-out on write |
| `nightwatch-ai.ts` | AI bot: queue → Bedrock Nova → web search → reply |

### `src/modules/messages/`

| File | Purpose |
|------|---------|
| `messages.routes.ts` | Express routes (all authenticated) |
| `messages.controller.ts` | Conversations, send, read, search, pin, delete |
| `messages.service.ts` | PostgreSQL queries via Drizzle, friendship enforcement |

### WebSocket Handlers

| Handler | Events |
|---------|--------|
| `explore.handler.ts` | `explore:subscribe-post`, `explore:unsubscribe-post` (room-based thread watching) |
| `messages.handler.ts` | `dm:send`, `dm:read`, `dm:delivered`, `dm:typing`, `dm:delete-for-all`, `dm:forward` |

---

## API Endpoints

### Explore (Public — no auth required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/explore/feed` | Public feed (tab, cursor, limit) |
| GET | `/api/explore/posts/:id` | Single post |
| GET | `/api/explore/posts/:id/thread` | Full thread (root + replies) |
| GET | `/api/explore/posts/:id/replies` | Paginated replies |
| GET | `/api/explore/views` | Batch view counts (`?ids=a,b,c`) |

### Explore (Authenticated)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/explore/posts` | Create post |
| PATCH | `/api/explore/posts/:id` | Edit post |
| DELETE | `/api/explore/posts/:id` | Delete post (cascades replies) |
| POST | `/api/explore/posts/:id/react` | Add reaction |
| DELETE | `/api/explore/posts/:id/react` | Remove reaction |
| POST | `/api/explore/posts/:id/poll/vote` | Vote on poll |
| POST | `/api/explore/posts/:id/view` | Record view (HyperLogLog) |
| POST | `/api/explore/upload` | Upload media (max 4 files, 5MB each) |
| GET | `/api/explore/link-preview` | OG meta extraction (SSRF-protected) |
| GET | `/api/explore/gif/search` | Giphy search |

### Messages (All authenticated)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/messages/conversations` | List conversations |
| GET | `/api/messages/:peerId` | Get messages (paginated) |
| POST | `/api/messages/send` | Send message |
| POST | `/api/messages/:peerId/read` | Mark as read |
| GET | `/api/messages/unread-count` | Unread count |
| DELETE | `/api/messages/:messageId` | Delete message |
| GET | `/api/messages/:peerId/search` | Search messages (ILIKE) |
| POST | `/api/messages/:messageId/pin` | Pin message |
| DELETE | `/api/messages/:messageId/pin` | Unpin message |
| GET | `/api/messages/:peerId/pinned` | Get pinned messages |

---

## Rate Limiting

| Action | Limit | Storage |
|--------|-------|---------|
| Post creation | 30/hour per user | Redis (`explore:rate:{userId}:{hourBucket}`) |
| DM messages | 15/10 seconds per user | Redis (`dm:rate:{userId}`) |
| AI mentions | 5/hour per user | Redis (`explore:ai:rate:{userId}`) |
| AI per thread | 1 reply per user per thread | Redis (`explore:ai:thread:{threadId}:{userId}`) |

---

## Security

- **SSRF protection**: Link preview resolves DNS, blocks private IPs, no redirect following, 200KB body limit
- **Content moderation**: Blocked words + spam pattern detection on create and edit
- **Deduplication**: `clientId` + Redis NX (30s TTL) prevents duplicate DM sends
- **Auth**: All write operations behind `authMiddleware`; link preview also requires auth
- **Firestore rules**: `allow write: if false` — client can only read, writes go through backend Admin SDK
- **Input validation**: Zod schemas on all inputs, 2000 char message limit, emoji whitelist for reactions

---

## Frontend Structure

```
src/features/explore/
├── api.ts                    # REST API calls
├── firestore.ts              # Firestore real-time subscriptions + pagination
├── types.ts                  # TypeScript types
├── store/
│   ├── use-composer-store.ts # Post creation state (Zustand)
│   └── use-dm-store.ts       # DM conversations state (Zustand)
├── hooks/
│   ├── use-explore-feed.ts   # Feed with real-time + pagination
│   ├── use-post-actions.ts   # Optimistic mutations
│   ├── use-dm-media.ts       # Image/video/voice upload
│   ├── use-dm-offline-queue.ts # localStorage queue for offline sends
│   ├── use-dm-extras.ts      # Search, pinned, GIF picker
│   ├── use-tag-search.ts     # Slash command content search
│   └── use-explore-notifications.ts # Socket badge tracking
└── components/
    ├── ExploreShell.tsx       # Swipe tabs (explore ↔ DM)
    ├── ExploreFeed.tsx        # Feed + IntersectionObserver pagination + view counts
    ├── PostCard.tsx           # Post card with view tracking
    ├── ThreadView.tsx         # Nested replies (max depth 4) + live Socket.IO
    ├── CreatePostDialog.tsx   # Full composer (text, media, GIF, emoji, @mentions)
    ├── DMView.tsx             # Full DM chat
    ├── ReactionBar.tsx        # 14 whitelisted emoji reactions
    ├── PollCard.tsx           # Poll voting with expiration
    ├── LinkPreviewCard.tsx    # OG card
    └── ...
```

---

## Firestore Indexes (Deployed)

| Collection | Fields | Purpose |
|------------|--------|---------|
| `explore_posts` | `visibility, createdAt DESC` | Public feed |
| `explore_posts` | `visibility, parentId, createdAt DESC` | Real-time listener |
| `explore_posts` | `authorId, parentId, createdAt DESC` | User's posts / friends feed |
| `explore_posts` | `type, parentId, createdAt DESC` | Watch party tab |
| `explore_posts` | `parentId, createdAt ASC` | Replies oldest-first |
| `explore_posts` | `parentId, createdAt DESC` | Replies newest-first |
| `explore_posts` | `threadRootId, createdAt ASC` | Full thread fetch |

---

## Nightwatch AI Bot

When a user mentions `@nightwatch` in a post:

1. Rate-checked (5/hr/user, 1 reply per user per thread)
2. Enqueued to Redis list (`explore:ai:queue`)
3. Worker processes with 3-8s random delay (human-like)
4. AWS Bedrock Nova generates reply (with optional Tavily web search tool)
5. Reply posted as a child post with `authorId: 'nightwatch-ai'`
6. FCM push notification sent to the mentioning user
7. Socket.IO event emitted to thread viewers

---

## Notification Preferences

The `notification_preferences` table controls per-user notification delivery:

| Field | Default | Controls |
|-------|---------|----------|
| `dm_messages` | `true` | DM push notifications |
| `explore_replies` | `true` | Reply + AI reply notifications |
| `explore_mentions` | `true` | @mention notifications |
| `explore_reactions` | `false` | Reaction notifications |
| `friend_requests` | `true` | Friend request notifications |

`NotificationService.sendToUser()` checks these before sending FCM.

---

## Database Schema (PostgreSQL)

### `messages` table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID v7 | Primary key |
| `sender_id` | UUID | FK → users |
| `receiver_id` | UUID | FK → users |
| `content` | text | Message text |
| `metadata` | text (JSON) | Attachments: `{ type, url, filename, duration }` |
| `reply_to_id` | UUID | Quoted reply reference |
| `forwarded_from_id` | UUID | Original message if forwarded |
| `read_at` | timestamptz | When recipient read it |
| `delivered_at` | timestamptz | When delivered to device |
| `deleted_for_all` | boolean | Delete-for-everyone flag |
| `pinned_at` | timestamptz | When pinned (null = not pinned) |
| `created_at` | timestamptz | Send timestamp |

### `notification_preferences` table

| Column | Type | Default |
|--------|------|---------|
| `user_id` | UUID (PK) | FK → users |
| `dm_messages` | boolean | true |
| `explore_replies` | boolean | true |
| `explore_mentions` | boolean | true |
| `explore_reactions` | boolean | false |
| `friend_requests` | boolean | true |
| `updated_at` | timestamptz | now() |
