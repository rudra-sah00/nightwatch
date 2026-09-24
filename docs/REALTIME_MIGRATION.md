# Replacing Agora Signaling with our own realtime service

> **Status: PLAN ONLY.** Nothing here is built. Written 2026-09-24 so the next
> session can start from the decisions rather than re-derive them.
>
> Scope: move every watch-party realtime message off Agora Signaling onto a service
> we run. **Agora RTC stays** — voice is not in scope, see §9.

---

## 1. Why

Three reasons, in the order they actually justify the work.

### 1a. Cost, which does not scale

Agora Signaling bills **per message sent *and* received**. From their pricing docs:

> "if a client sends a message to a message channel, and 10 people are subscribed to
> this channel, this counts as 1 sent message and 10 received messages, for a total
> of 11 messages."

So one avatar pose in a room of 8 costs **8 messages**, not 1. At the current 8 Hz:

`8 users × 8 Hz × 8 = 512 messages/second`

| Scenario | Messages per 2-hour party | Parties on the 1M/month free tier |
|---|---|---|
| Everyone walking | 3,686,400 | **0.27** |
| Realistic mix (~20% walking) | 921,600 | **~1** |
| Mostly seated (heartbeat only) | 230,400 | ~4 |

Free tier is also **20 peak concurrent users** app-wide, and its overage policy is
**service suspension**, not billing. At overage rates ($3/M) a realistic party costs
about **$2.76**; at the 20 Hz we would want for low latency, about **$28**.

A flat-fee server carries thousands of parties. The curve is the problem, not the
current bill.

### 1b. Latency we cannot reach on Agora

**Measured 2026-09-24, and it weakens this argument — read before planning around it.**
Agora's data-path edge for this region is **already in Mumbai**:
`ap-web-1.agora.io`, `webrtc2-ap-web-1.agora.io` and `uap-ap-web-1.agora.io` all
resolve to `ec2-15-206-47-129.ap-south-1.compute.amazonaws.com` (AWS ap-south-1),
54.5 ms RTT from the Talcher box with 0.18 ms jitter. Only `api.agora.io` — the REST
control plane, where latency is irrelevant — is in Singapore.

So **there is no geographic win available.** A self-hosted Mumbai relay sits beside
Agora's edge, not closer to the user than it. Note a relay crosses two legs
(sender→edge, edge→receiver), so one-way latency is roughly the full RTT to the edge
when both parties are equidistant: ~5–15 ms for a Mumbai user, and the same for a
self-hosted box there.

Peer motion lag decomposes as `sampling delay + network one-way + interpolation buffer`:

| Component | Agora now | Agora at 20 Hz | Own relay + datagrams |
|---|---|---|---|
| Sampling (pose age when sent, avg) | 62 ms | 25 ms | 25 ms |
| Network one-way (Mumbai user) | ~15 ms | ~15 ms | ~10 ms |
| Interpolation buffer | 160 ms | 120 ms | **50–60 ms** |
| **Total** | **~237 ms** | ~160 ms | **~90 ms** |

**The entire remaining prize is the buffer.** Geography contributes ~5 ms; the buffer
contributes ~60–70 ms. Three things stop us shrinking it on Agora:

1. **The SDK ignores calls beyond 20/second per client**, so 20 Hz is a hard ceiling
   on the send rate, which floors the buffer.
2. The cost in §1a — 20 Hz is roughly $28 per party.
3. **The buffer must cover p99 jitter, not p50.** Signaling is WebSocket, so TCP, so
   a lost packet is retransmitted and everything behind it waits. That tail is what
   forces 160 ms. With unreliable datagrams a stale pose is dropped instead, the
   tail collapses, and the buffer can sit near p50.

Point 3 is the only structural argument left, and no hosted pub/sub product offers
datagrams. Worth ~60 ms — decide whether that is worth the ops in §10.

### 1c. One source of truth for presence

The strongest reason, and it is not about performance.

Membership truth lives in our Redis; presence lives in Agora. They are different
systems that can disagree, which is why a departure currently needs **three**
signals reconciled (`MEMBER_LEFT` over RTM, `MEMBERS_UPDATED`/`MEMBER_LEFT` over
Socket.IO, and Agora presence `REMOTE_LEAVE`/`REMOTE_TIMEOUT`/`INTERVAL`), plus
`mergeMembers` to stop the server's roster clobbering locally-known `disconnected`
flags. See `docs/features/WATCH_PARTY.md` § "How a departure propagates".

On our own relay a socket closing **is** the departure. One event, one truth. That
entire class of bug — of which the seated-avatar-after-leaving bug was one instance —
stops existing.

---

## 2. Measurements we already have

Recorded so they are not repeated.

**Agora**: pinned at `agora-rtm-sdk@2.3.0`. Channel is the room code uppercased,
plus a private `user:<id>` channel per client. Payloads are `JSON.stringify`, ~120
bytes per pose, and Signaling meters in 1 KB units so size is irrelevant — only
**message count** matters.

**Agora's edge location** (measured from Talcher, 2026-09-24). ICMP, 5 packets:

| Host | Resolves to | RTT | Jitter |
|---|---|---|---|
| `ap-web-1.agora.io` | `15.206.47.129` — **AWS Mumbai** | 54.5 ms | 0.18 ms |
| `webrtc2-ap-web-1.agora.io` | same IP | 54.5 ms | 0.15 ms |
| `uap-ap-web-1.agora.io` | same IP | 54.7 ms | 0.13 ms |
| `api.agora.io` | `52.77.88.131` — AWS Singapore | 62.4 ms | control plane only |
| `statscollector-1.agora.io` | `164.52.55.243` | 252–380 ms | 52 ms — telemetry, off the data path |

The data path is in India. Compare Talcher→other Mumbai datacentres, below: Agora's
edge is 11–22 ms further than Linode/Vultr Mumbai from this particular spur, which is
peering, not distance.

**Latency from the Talcher dev box** (BSNL AS9829, Odisha), server→city RTT, which is
symmetric. Jitter was 0.2–0.3 ms mdev throughout:

| City | RTT |
|---|---|
| Mumbai | 32.8–43.1 ms |
| Delhi | 44.6 ms |
| Hyderabad | 53.3 ms |
| Bangalore | 54.9 ms |

Add consumer last mile: +5–15 ms fibre, +20–40 ms mobile.

**Estimated end state** at 20 Hz with datagrams and a jitter-sized buffer:

| Deployment | Mumbai user | Bangalore user |
|---|---|---|
| Talcher | ~105 ms | ~120–135 ms |
| Mumbai VPS | ~83 ms | ~95 ms |

**The Talcher box cannot serve production.** It has no public IPv4 —
`117.199.185.185` is BSNL's NAT gateway, inbound times out, and the machine's only
addresses are a Docker bridge and Tailscale. Its three IPv6 prefixes rotate, so it
cannot hold a stable DNS name. Keep it as the dev and load-test target;
it is 6 cores, 15 GB, idle, reachable over Tailscale.

> **Correction, 2026-09-24.** This paragraph originally said the rotating prefixes
> mean it "cannot hold a DNS name or a TLS certificate". **The certificate half was
> wrong** — a certificate binds to a name, not an address, and DNS-01 ACME
> validation needs no inbound connectivity, so the name can hold a valid cert
> whatever it points at. The real blockers were measured and are different:
> Tailscale cannot establish a direct path to the box at all (20 attempts,
> `direct connection not established`, every packet via `DERP(blr)`), which is
> decisive for IPv4; and an `AAAA`-only relay is unreachable from any IPv4-only
> client — including our own dev machine, which has **no global IPv6 address**.
> See RELAY_DESIGN.md §1d for the full probe results.

---

## 3. Target architecture

```
                 ┌──────────────────────────────┐
  browser /      │  relay  (Mumbai VPS)         │
  Electron ─────▶│  WebTransport over HTTP/3    │
                 │   • datagrams  → poses       │
                 │   • streams    → everything  │
                 │  WebSocket fallback          │
                 └──────────┬───────────────────┘
                            │ Redis (shared with API)
                 ┌──────────┴───────────────────┐
                 │  existing Node API           │
                 │  REST + Socket.IO + Redis    │
                 └──────────────────────────────┘

  Agora RTC ────▶ voice only. Unchanged.
```

**A separate process, not inside the existing backend.** Two reasons:

- **Tick stability.** A 20 Hz loop has a 50 ms budget. The API process does Redis
  round trips, external HLS playlist fetches and FFmpeg clip work; one slow call or
  GC pause there becomes visible avatar stutter.
- **Room affinity vs clustering.** `cluster.ts` forks workers, which is free for a
  stateless API and fatal for a room relay — every peer of a room must land in one
  process or fan-out needs a Redis hop. Two members of one party hitting different
  workers would break it immediately.

Same repo, same deploy pipeline, shared auth library and Redis. Own port, own
lifecycle, restartable without dropping the API.

**One connection, two channels.** WebTransport gives unreliable datagrams *and*
reliable ordered streams over one QUIC connection. Poses take datagrams; everything
else takes a stream. One handshake, one auth, one thing to monitor — and stage 3
needs no second transport bolted on.

---

## 4. What has to move: all 32 message types

Every type in `room/types/rtm-messages.ts`, with its delivery requirement and target
channel. **Nothing may be left on Signaling** or we keep paying the dependency.

| # | Message | Rate | Needs | Target |
|---|---|---|---|---|
| 1 | `AVATAR_TRANSFORM` | 8–20 Hz × N | lossy, latest-wins | **datagram** |
| 2 | `SEAT_CLAIM` | rare | reliable, ordered | stream |
| 3 | `PLAY_EVENT` | rare | reliable, ordered | stream |
| 4 | `PAUSE_EVENT` | rare | reliable, ordered | stream |
| 5 | `SEEK_EVENT` | rare | reliable, ordered | stream |
| 6 | `RATE_EVENT` | rare | reliable, ordered | stream |
| 7 | `SYNC` | on join | reliable | stream |
| 8 | `SYNC_REQUEST` | on join | reliable | stream |
| 9 | `CHAT` | low | reliable, ordered, **persisted** | stream + REST |
| 10 | `TYPING_START` | low | lossy | stream |
| 11 | `TYPING_STOP` | low | lossy | stream |
| 12 | `MEMBER_JOINED` | rare | reliable | **derived from connection** |
| 13 | `MEMBER_LEFT` | rare | reliable | **derived from connection** |
| 14 | `JOIN_APPROVED` | rare | reliable, **peer-targeted** | stream (directed) |
| 15 | `JOIN_REJECTED` | rare | reliable, peer-targeted | stream (directed) |
| 16 | `KICK` | rare | reliable, peer-targeted | stream (directed) |
| 17 | `PARTY_CLOSED` | once | reliable, broadcast | stream |
| 18 | `HOST_DISCONNECTED` | rare | reliable | **derived from connection** |
| 19 | `HOST_RECONNECTED` | rare | reliable | **derived from connection** |
| 20 | `PERMISSIONS_UPDATED` | rare | reliable | stream |
| 21 | `MEMBER_PERMISSIONS_UPDATED` | rare | reliable | stream |
| 22 | `CONTENT_UPDATED` | rare | reliable | stream |
| 23 | `STREAM_TOKEN` | rare | reliable, **secret** | stream (directed) |
| 24 | `INTERACTION` (emoji/sound) | bursty | lossy | stream |
| 25 | `SKETCH_DRAW` | bursty | reliable, ordered | stream |
| 26 | `SKETCH_UNDO` | rare | reliable, ordered | stream |
| 27 | `SKETCH_CLEAR` | rare | reliable, ordered | stream |
| 28 | `SKETCH_MOVE_Z` | rare | reliable, ordered | stream |
| 29 | `SKETCH_CURSOR_MOVE` | **10 Hz × N** | lossy, latest-wins | **datagram** |
| 30 | `SKETCH_REQUEST_SYNC` | on join | reliable, peer-targeted | stream (directed) |
| 31 | `SKETCH_SYNC_STATE` | on join | reliable, peer-targeted | stream (directed) |
| 32 | `SKETCH_REACTION` | bursty | lossy | stream |

Three things fall out of that table:

- **Types 12, 13, 18, 19 stop being messages.** They become facts the relay derives
  from connection state. That is §1c cashed in.
- **Types 1 and 29 are the whole cost problem** — the only two with per-recipient
  multiplication at rate. Both are latest-wins and belong on datagrams.
- **Directed messages need a routing primitive.** Today they abuse a per-user Agora
  channel (`user:<id>`). The relay needs an explicit "send to one member" call.

Receiver-side permission gating (`isRtmMessageAllowed`) must move with them — it is
applied once in `useWatchParty`'s `onMessage` and covers chat, sketch and soundboard.

---

## 5. Do these first, regardless

Independent of the migration, and all three are prerequisites for judging it.

### 5a. Fix the interpolation clock (hours)

`SnapshotBuffer` compares timestamps from two different machines' wall clocks.
Senders stamp `t = Date.now()` (`use-theatre-network.ts:131,149`); receivers sample
with their own `Date.now()` (`:345`). So the 160 ms window is really
`160 ms ± skew`, and for a peer whose clock is more than ~160 ms behind, `target >=
newest.t` always holds — the hold-at-newest branch runs and **there is no
interpolation at all**, so that avatar steps at 8 Hz.

Fix: stamp and sample in server time using the offset `useClockSync` already
computes. Prefer `performance.now()` as the monotonic base.

This must happen regardless of transport — it follows us onto any new stack, and it
is probably producing a worse artefact today than the network is.

### 5b. Stop pose heartbeats while seated (hours)

A seated avatar's position is fully determined by its seat claim —
`seatedAvatarPose(seatId)` derives it, and `PassiveAvatars` already draws 2D members
this exact way with no pose traffic. The 2 s heartbeat from a seated member repeats
information every client can compute: 8 seated users cost 32 messages/second, about
230k per party. In a cinema most people are seated most of the time, so this is the
largest single line item on the bill.

Also review `SKETCH_CURSOR_MOVE` at 10 Hz, which has the same ×N shape.

### 5c. Instrument (small)

Nothing currently measures RTT, jitter, loss or per-peer clock offset — the stats HUD
was removed. Needed to: size `INTERP_DELAY_MS` from measured jitter instead of
guessing, prove 5a worked (offset should sit near zero), and compare the relay
against Agora from the same client in the same session.

---

## 6. Staged migration

Each stage ships independently, behind a flag, with Agora as the live fallback.

| Stage | Moves | Gate to pass |
|---|---|---|
| **0** | 5a, 5b, 5c | Offset ~0; measured jitter and RTT recorded for real users |
| **1** | `AVATAR_TRANSFORM` only | Two clients, smooth motion; p99 jitter < Agora's; fallback exercised by killing the relay mid-party |
| **2** | Presence → connection state; `SEAT_CLAIM`; delete the three-signal reconciliation | A killed tab frees its seat with no `disconnected` grace ambiguity |
| **3** | Chat, playback, sketch, interactions, permissions, directed messages | Playback sync drift no worse than today; chat backlog intact |
| **4** | Remove `agora-rtm-sdk`, its token endpoint and RTM config | Nothing imports it; RTC untouched |

Order is deliberate. Poses first because the failure mode is cosmetic — avatars
stutter, nobody's film stops. **Playback sync last**, because that *is* the product;
it moves only after the relay has carried poses in production for a while.

---

## 7. Protocol sketch

**Fixed tick, ~20 Hz, batched fan-out.** Do not forward each pose as it arrives.
Collect, and once per tick send each client **one** datagram containing everyone who
moved, stamped with the server tick. Today a client receives 7 separate messages per
tick from 8 peers; this makes it 1 — and the server's stamp gives every client a
shared timeline, which removes the §5a problem by construction rather than by
correction.

**Binary pose**, ~10 bytes against ~120 of JSON:

| Field | Type | Notes |
|---|---|---|
| slot | `uint8` | index within the room, not the user id |
| x, z | `int16` | centimetres; room is 9.6 × 8.5 m |
| y | `int16` | centimetres; derived locally today, kept for the step |
| yaw | `uint8` | 1.4° resolution is plenty |
| state | `uint8` | animation state + dance index packed |

**Sequence number per sender.** Discard anything older than the newest seen, on both
ends. Gives UDP semantics even on the WebSocket fallback path.

**Keep `quantise` and `exceedsDeadBand`** as they are — the dead band is why a seated
room sends almost nothing, and it is already correct.

---

## 8. Server design

- **Rooms in memory**, keyed by room code. No persistence — Redis already holds party
  state and the chat backlog.
- **Single process.** No clustering; if we ever outgrow one box, shard whole rooms by
  code, never split a room.
- **Auth on connect** by verifying the existing JWT / guest token, then confirming
  membership against Redis. Reject and close otherwise.
- **The relay does not simulate.** Movement stays client-authoritative. There is
  nothing to cheat at, seat conflicts already converge deterministically without a
  referee, and a simulation loop would add physics divergence for no benefit.
- **Presence from connection state**: open = present, close = gone. Publish to the
  room and mirror into Redis so the API and Smart TV clients see one roster.
- **Degrade, never break.** If the relay is unreachable the client falls back to
  Agora for poses (stage 1–2) and the party continues. Keep that path until stage 4.

---

## 9. What we are explicitly not doing

Recorded so it is not relitigated.

- **Not replacing Agora RTC.** Voice needs an SFU: echo cancellation, jitter buffers,
  bandwidth estimation, simulcast, codec negotiation. Agora is good at it and we have
  no reason to compete.
- **Not building an authoritative game server.** No tick simulation, no client
  prediction, no reconciliation, no lag compensation. All of it exists to defeat
  cheating and resolve contested physics in shooters. We have neither.
- **Not Cloudflare Tunnel for the relay.** It solves CGNAT and certificates, but it
  cannot carry QUIC datagrams to a browser — so it costs the ~60 ms of buffer that is
  the entire reason to self-host, and lands at ~160–180 ms. That is Durable Objects'
  number with a home server's failure modes.
- **Durable Objects — reconsider this.** It is the only hosted option whose billing
  does not punish fan-out (inbound only, WebSocket discounted 20:1, outbound free), so
  it fixes §1a outright. It is still TCP, so ~160–165 ms versus ~90 ms self-hosted.
  The original rejection leaned partly on self-hosting being geographically closer to
  users — and the §1b measurement shows it is not, since Agora is already in Mumbai
  and so would we be. That leaves a straight trade: **~70 ms of buffer against running
  a server.** If the answer to open question 2 is that p99 jitter on Indian mobile is
  modest, take Durable Objects and skip the infrastructure entirely.
- **Not the Talcher box in production.** §2.
- **Not Agora RTC's `sendStreamMessage`** as a pose transport. Still SFU-relayed, own
  rate limits, no datagram semantics.
- **Not other hosted pub/sub** (Ably, Pusher, PubNub, Supabase Realtime). All bill
  per delivered message, so the ×N multiplier is unchanged, and all are reliable
  ordered over TCP, so the buffer stays large.

---

## 10. Ops

- **One Mumbai VPS**, ₹400–800/month. 2 vCPU is ample; the current dev box is a
  6-core i5 sitting at 0.18 load.
- **QUIC needs valid TLS on UDP/443.** Certificate renewal now breaks avatars if it
  fails — alert on expiry, not on failure.
- **Monitor**: connected clients, rooms, tick overrun count, p50/p99 fan-out latency,
  datagram loss. Tick overrun is the one that predicts user-visible stutter.
- **New failure mode**: relay down. Must degrade to Agora (stages 1–3) and, after
  stage 4, to "no avatars, party continues" — never to a broken party.
- **Deploys** must not drop connections silently; drain and let clients reconnect.

---

## 11. Open questions

1. ~~What is Agora's actual RTT for our users?~~ **ANSWERED 2026-09-24.** The edge is
   AWS Mumbai (§2), so the network leg is already short and a self-hosted Mumbai relay
   is no closer. The latency case now rests entirely on the interpolation buffer, and
   the cost case (§1a) stands alone as the reason to migrate. This is the correction
   that makes Durable Objects a serious contender again — see §9.
2. What is real p99 jitter on Indian mobile? It sets `INTERP_DELAY_MS`, and it is the
   single number that decides whether datagrams are worth the migration.
3. Does WebTransport survive Indian carrier NATs at acceptable rates? Some networks
   block or throttle UDP/443. The WebSocket fallback rate will tell us.
4. Electron: confirm the bundled Chromium's WebTransport behaviour matches the browser
   path, and that the desktop app can reach UDP/443.
5. Do we want the relay to own the chat backlog write, or keep that on the REST path?
   Keeping REST is less to build and already permission-gated server-side.
6. Guest tokens are room-scoped and short-lived — confirm the relay's auth handles
   renewal mid-party without dropping the connection.

---

## 12. Rough effort

| Stage | Estimate |
|---|---|
| 0 — clock fix, heartbeat, instrumentation | 1 day |
| 1 — relay skeleton, auth, tick, datagrams, poses, fallback | 2–3 days |
| 2 — presence and seats; delete reconciliation | 1–2 days |
| 3 — remaining 28 message types | 2–3 days |
| 4 — remove the SDK, clean up | half a day |
| Ops — VPS, TLS, monitoring, deploy | 1 day |

Call it **8–11 days** of focused work. Stage 0 alone is worth doing this week
whatever happens to the rest.
