# 3D Theatre Mode — Design Specification

> **Status: PART BUILT.** Most of this is shipped — see §1b for what is and is
> not. Sections still describing intent rather than behaviour say so inline.
> `layout.ts` and `lib/geometry/` are the source of truth for anything
> dimensional; where this document disagrees with them, they win and this is
> stale.

An optional mode for a Watch Party that replaces the flat sidebar-plus-video
layout with a navigable 3D screening room. The host's stream plays on a cinema
screen inside the scene. Each participant has an avatar that walks with `WASD`
and sits in a chair with `E`. Friends appear sitting beside you in real time.

The existing 2D watch party is unchanged and remains the default. 3D is a
parallel mode selected at room creation.

---

## 1. Scope & Constraints

| Constraint | Value | Reason |
|---|---|---|
| Max participants | **8** | Product decision. Sets seat count, and caps avatar/voice cost. |
| Seat layout | **2 rows × 4** | Intimate screening room. Keeps everyone near the centre axis and gives natural side-by-side pairing. |
| Platforms | Desktop web + Electron | `WASD` implies a keyboard. Mobile WebView perf is unproven; Android TV is excluded outright. |
| Content types | `movie`, `series`, `livestream` | No change — the video source is the existing player. |
| Sketch mode | **Disabled in 3D** | Drawing on a screen viewed in perspective does not work. |
| Mode selection | **Per participant, not per room** | A watch party is social. Rooms are mixed-mode so a guest whose device cannot cope drops to 2D rather than being excluded. See §12 Q5. |
| Hardware gate | **None** | Web capability detection is unreliable. Quality adapts at runtime instead — see §8. |

### What stays unchanged

3D mode is a renderer swap, not a rewrite. These keep working untouched:

- Host-authoritative playback sync (`useWatchPartySync`, `usePredictiveSync`)
- Clock calibration (`useClockSync`)
- Member lifecycle, join approval, permissions, kick
- Chat persistence and history
- Agora RTC voice
- The 3h party cap and movie-end warnings

The video element continues to be driven by hls.js exactly as it is today. 3D
only changes *where the pixels are displayed*.

---

## 1b. Implementation Status

Last synced with the code: 2026-09-23.

### Built and verified

| Area | Module | Notes |
|---|---|---|
| Scene constants | `theatre/lib/layout.ts` | Single source of truth |
| Room + chair geometry | `theatre/lib/geometry/` | Generated in code — no `room.glb`, no `chair.glb`. 22 draw calls (§3) |
| Canvas + room + seating | `theatre/components/TheatreScene/TheatreRoom/TheatreSeating.tsx` | Room and all ten chairs batched per material |
| Walking | `theatre/hooks/use-avatar-controls.ts` + `components/LocalPlayer.tsx` | Rapier kinematic controller, WASD + Shift |
| Collision | `theatre/components/TheatreColliders.tsx` | Static boxes from `layout.ts`, not a trimesh |
| Networking | `theatre/hooks/use-theatre-network.ts` | Agora RTM, 8 Hz + dead band |
| Interpolation | `theatre/lib/interpolation.ts` | 160 ms snapshot buffer |
| Remote avatars | `theatre/components/RemoteAvatar.tsx` | `SkeletonUtils` clone per peer |
| Animation | `theatre/hooks/use-avatar-animation.ts` + `lib/animation.ts` | Mixer + crossfade state machine |
| Seated camera | `theatre/hooks/use-seated-camera.ts` | Per-seat head cone clamp |
| Asset manifest | `theatre/api.ts` + `hooks/use-theatre-assets.ts` | Backend-owned URLs. Characters only now the room is generated |
| View modes | `theatre/lib/view-mode.ts` + `hooks/use-view-mode-hotkey.ts` | `V` cycles 2D → 3D → screen focus |
| Opt-in download | `theatre/hooks/use-theatre-preload.ts` | Nothing fetched until enabled in settings. ~13 MB of characters, was ~38 MB |

### Not yet built

| Area | Blocker |
|---|---|
| `TheatreScreen` + `use-video-texture` | None — next piece of work. The in-scene screen is currently a lit placeholder; audio plays because `Player.Root` stays mounted. |
| `use-screen-light` (average-colour driver) | Depends on the video texture |
| `SitDown` / `StandUp` clips | Need authoring on the existing rig |
| Dance clips | Need authoring; `THEATRE_DANCE_CLIPS` on the backend gates publishing |
| Spatial audio, speech bubbles | Not started |

### Avatar rig, as built

The avatar is an assembly of **23 separate capsules**, so it uses **rigid**
skinning — one bone per segment, weight 1.0, no blending — rather than smooth
skinning, which would need continuous geometry across joints. **12 joint spheres**
at hip, knee, ankle, shoulder, elbow and wrist are weighted to the parent bone and
fill the wedge that opens when a joint bends. The torso is the exception: it is
continuous, so it gets graded weights across hips/spine/chest.

19 bones. `Idle` / `Walk` / `Run` are embedded in `avatar.glb`, which is why the
manifest reports `animations.clipsEmbedded: true`.

Two export traps worth remembering:

- **Draco must be off for the avatar.** It can drop joint/weight attributes on
  skinned meshes. Textures still go through WebP, which is where the size win is.
- **`export_apply` must be `false`.** Applying modifiers bakes away the armature
  and silently produces an unrigged mesh.

## 2. Scene Specification

> **Status: BUILT.** `src/features/watch-party/theatre/lib/layout.ts` is the
> source of truth and the room geometry is generated from it (§3). The figures
> below were originally measured from a Blender scene; that scene is now a
> reference for surface detail only, not an asset in the pipeline. If this
> document and `layout.ts` ever disagree, `layout.ts` wins and this is stale.
>
> The original draft of this section described a 6 m room with 0.70 m seat pitch
> and a 5 m screen. The room as built is 8 m wide with 0.90 m pitch and a 7 m
> screen; the figures here have been corrected.

### Coordinate system

Three.js convention: **Y up, metres, right-handed.**

- Origin at **floor centre of the screen wall**
- Screen plane at `Z = 0`; audience occupies `+Z`
- Audience faces `-Z`
- `X = 0` is the room centreline

### Room shell

| Dimension | Value |
|---|---|
| Width | 9.6 m (`X` from −4.8 to +4.8) |
| Depth | 8.5 m (`Z` 0 → 8.5) |
| Wall top | 4.6 m |
| Ceiling soffit | 4.35 m (coffered) |

The back wall is solid. A café room used to sit behind it through glazed double
doors; both are gone, because the doors' transmissive glass cost a full extra
scene pass — see §3.

### Screen

| Property | Value |
|---|---|
| Width | 7.40 m |
| Aspect | 2.39:1 → height 3.096 m |
| Bottom edge | `Y = 0.52` |
| Top edge | `Y = 3.616` |
| Centre | `(0, 2.068, 0.02)` |

Width is set by the **worst seat, not by the wall**. The wall would take 8.48 m
(where the speaker towers start), but at that size the front-row outer seats crop
the picture on narrow windows and 16:9 needs a 77° lens. 7.40 m is the largest
width all ten seats can frame — at 7.41 m seat A1 breaches the 65° limit.

The `+0.02` Z offset places the video plane just in front of the modelled
masking frame to avoid z-fighting.

**The screen is not a modelled asset.** It is a `PlaneGeometry` created in code
carrying the `VideoTexture`. The room model provides only the black masking
border around it and must leave that area flat and unobstructed.

### Seating

Two rows, **five** seats each — ten in all. Rear row on a raised platform.

| Row | Floor `Y` | `Z` | Seat `X` positions |
|---|---|---|---|
| A (front) | 0.00 | 4.5 | −2.4, −1.2, 0, +1.2, +2.4 |
| B (rear) | 0.45 | 6.2 | −2.4, −1.2, 0, +1.2, +2.4 |

- Seat spacing **1.2 m** (`SEAT_PITCH`), premium recliner pitch, not multiplex.
  The chair is 0.719 m wide, so that leaves a 0.48 m gap to walk between them.
- Row pitch 1.7 m
- Step riser at `Z = 5.3`, 0.45 m tall
- Rear platform spans `Z` 5.3 → 8.5 at `Y = 0.45`

**There is no centre aisle.** The seats are contiguous, so the only route between
levels is the aisle stairs at `|X|` 3.40–4.80 — three risers of 0.15 m with
0.30 m treads, spanning `Z` 4.69 → 5.29. This is enforced in physics: a collider
across the riser face between the stairs blocks the shortcut, and the character
controller's slope limit stops you walking up the drop.

Seat IDs are `A1`–`A5` and `B1`–`B5`, numbered left to right from the
audience's point of view (i.e. `A1` is at `X = −2.4`, `A3` is on the centre line).

`SeatId` travels over RTM in seat claims, so a client on an older build treats
`A5`/`B5` as unknown and ignores the claim — a mixed-version party degrades to
that person appearing unseated rather than to anything breaking.

Each seat also carries a **`SEATPAD_<id>`** marker: a thin emissive floor pad
0.52 m in front of the chair, at the spot an avatar stands to sit down. These
are the visual affordance for seat state (see *Seat occupancy*), and the anchor
for the proximity trigger.

### Sightline validation

Measured against the built geometry, not guessed. These changed when the screen
was enlarged from 4.40 m to 7.00 m.

| Check | Row A | Row B | Standard |
|---|---|---|---|
| Distance to screen | 4.5 m | 6.2 m | |
| Horizontal viewing angle | **75.7°** | 58.9° | Row A exceeds IMAX (~70°) |
| Angle to screen top | 28.1° | 17.4° | Under the THX 35° limit ✓ |
| Seated eye height above own floor | 1.254 m | 1.254 m | from the seated avatar mesh |

**Row A at 75.7° is deliberately aggressive** — wider than IMAX. It is a
front-row tradeoff accepted in exchange for screen size. Trimming the screen to
about 6.2 m would bring Row A to roughly 68° if that proves too immersive.

### Seated head cone

A seated viewer turns their head, not their torso, so the camera is clamped per
seat. Without this you can spin 360° in a chair, which reads as a floating camera
and destroys presence.

| Parameter | Value |
|---|---|
| Yaw | ±55° from that seat's neutral aim |
| Pitch | +30° / −35° |

Each seat's neutral aim points at screen centre, so off-axis seats are pre-rotated
(A1 −28.18°, A2 −15.00°, A3 0°, B1 −21.22°, B2 −10.99°, mirrored for 4/5).
**Verified: from all ten seats both screen edges fall inside the cone**, so the
clamp never fights the thing you are there to watch.

Anchors are `SEATVIEW_<id>` transforms in `layout.ts`, carrying each seat's
neutral aim and its head-cone limits.

### Spawn & circulation

- Spawn at `(0, 0.45, 7.8)` — rear platform, facing the screen (`SPAWN`)
- Players walk forward and **step down** into Row A via the aisle stairs, which
  gives the natural "walking down the aisle" feel
- Seats span |x| ≤ 2.76 in a 9.6 m room, leaving the 1.4 m stair runs each side

### Reachability — tighter than it looks

**You cannot walk between two chairs, and that is deliberate.** At 1.2 m pitch
with a 0.719 m chair the gap is 0.482 m against a 0.56 m player capsule. The
seats are contiguous (there is no centre aisle), so a seat is only ever
approached from its `SEATPAD_<id>` in front of it.

That makes the band in front of each row load-bearing:

| Row | Floor starts | Chair face | Standing band |
|---|---|---|---|
| A | z 0.0 | z 4.16 | the whole front floor |
| B | z 5.30 | z 5.86 | **0.56 m — exactly one capsule diameter** |

Row B has no margin. It works because sitting only requires being within
`SIT_PROMPT_RADIUS` (1.0 m) of the pad rather than standing exactly on it, so the
capsule can sit flush against the chair face and still trigger. Deepen the chair
or move Row B forward and the rear row becomes unreachable. `collision.test.ts`
asserts both the band and the prompt reach.

Avatars carry **no colliders** — only the local player has a body. Eight capsules
shoving each other turns a shared row into a scrum, and remote poses arrive
interpolated ~160 ms in the past, so a collision would disagree on both sides and
push each player somewhere the other never saw them. Double-occupancy is prevented
by the seat map instead (§5).

---

## 3. Geometry & Assets

**The room is generated in code. There is no room asset.**

`room.glb`, `chair.glb` and `cafe.glb` are gone. The auditorium, its eight
recliners and the starlight ceiling are built from primitives at runtime by
`theatre/lib/geometry/`, which reads its dimensions from `layout.ts`.

### What that replaced

| Was | Now |
|---|---|
| `room.glb`, 2.3 MB, 307 draw calls across 19 materials | `buildAuditorium()`, 0 bytes, **22 draw calls** |
| `chair.glb`, 311 KB, instanced 8x | `buildSeating()`, 0 bytes, batched into the same call count as one chair |
| `cafe.glb` + glazed gate | deleted outright — see below |
| KTX2 texture sets, `gltf-transform` pipeline, `v1/` -> `v2/` versioning | nothing to ship, nothing to version |

### Why it is worth doing this way

- **Draw calls are bounded by MATERIALS, not objects.** `GeometryBatcher` bakes
  each primitive's transform into its vertices and merges per material, so detail
  is close to free. The Blender blockout spent 229 objects on the coffered
  ceiling alone; the generated room spends one mesh per surface type.
- **Dimensions cannot drift.** `layout.ts` was already the source of truth for the
  colliders and the seat anchors, and the geometry now reads the same constants.
  Previously a change to the room meant editing a 158 MB `.blend` outside the
  repo, re-exporting, re-optimising, re-uploading to R2 and bumping a version
  prefix — with `layout.ts` updated by hand to match, or not.
- **Nothing to download.** 3D used to gate on ~38 MB across five files.

### The cafe, and why it went

The cafe was a second room through glazed double doors at the back of the
auditorium. Both are deleted. The doors were the expensive part: their glass used
`MeshPhysicalMaterial` with `transmission: 0.75`, and three.js renders a **whole
extra scene pass** for any transmissive material in the scene.

Measured on an M4 at 2268x1111, adding one pane of that glass back to the
finished room: **0.36 ms -> 12.92 ms per frame, and +29 draw calls.** That single
material cost more than every other surface put together. Avoid `transmission`
in this scene.

### Characters — the one thing still fetched

The avatars stay remote, because they are the one part that cannot be generated:
skinned meshes with an armature, ten clips, and rigid-skinned joint spheres. A
capsule would be a downgrade, not a port.

They are served from the Cloudflare R2 bucket `nightwatch-assets` via
`assets.nightwatch.in`, under a versioned prefix:

```
theatre/v3/models/avatar-{boy,girl}.glb
```

URLs are owned by the backend (`GET /api/theatre/assets`) so the bucket, domain
and version can change without a frontend release. The manifest's `models` field
is now just `{ avatar, avatars? }`; `room`, `cafe` and `chair` are ignored if the
backend still sends them, so the frontend can ship ahead of the backend being
trimmed.

Two export traps worth keeping:

- **Draco must be off for the avatar.** It can drop joint/weight attributes on
  skinned meshes. Textures still go through KTX2.
- **`export_apply` must be `false`.** Applying modifiers bakes away the armature
  and silently produces an unrigged mesh.

```bash
# the avatar — draco OFF, it can drop joint/weight attributes on skinned meshes
gltf-transform optimize avatar.glb out.glb \
  --texture-compress ktx2 --texture-size 1024 --no-compress
```

One upload trap: `wrangler r2 object put` writes to a **local simulator** without
`--remote`, while still printing `Upload complete`. Verify over HTTP, not by
trusting the CLI.


## 4. Lighting

**The screen is the primary light source, and it is dynamic.** This is the
single highest-impact element of the whole feature and it is why no lighting is
baked into the room geometry.

Implementation: each frame (throttled — see §8), downscale the video texture to
a tiny offscreen canvas, average its pixels, and drive a light's colour and
intensity from the result. The room then shifts colour with the content — blue
in a night scene, orange on an explosion.

Supporting lights, all static:

- Aisle floor strips, dim warm
- Exit sign glow, green, low intensity
- Very dim ceiling ambient — enough to keep geometry readable, not enough to
  flatten the screen's contribution

Post-processing via `@react-three/postprocessing`: **bloom** on the screen
(essential — this is most of the cinema look) and **ACES Filmic** tone mapping.

---

## 4b. Materials

Every surface is a flat `MeshStandardMaterial` from a single shared palette in
`theatre/lib/geometry/materials.ts`. No texture files, no UV work, no maps.

The palette is converted from the Blender scene's materials, and the conversion
matters: **Blender stores base colours linear, three.js `material.color` is
sRGB.** Every value in the palette is the sRGB equivalent of Blender's, not a
copy of it. Where a Blender material was textured — carpet, walnut veneer, brown
plank risers, red leather — it is represented by a flat tone.

One shared palette is load-bearing, not tidiness: draw calls are bounded by
material count, so if the chairs built their own copies they would not batch with
the room and every seat would cost its own calls.

### Two conversions that were bugs first

**`metalness`.** A metallic surface has almost no diffuse response — it shows its
surroundings instead. With a weak environment there is little to show, so anything
much above 0.4 renders near black however many lights hit it. Blender specifies
`1.0` for the brass stair nosing and the speaker chassis, and `0.85` for the rear
wall rail. All are held to 0.70–0.75 here; at Blender's values they read as black
lips rather than brass ones. `geometry.test.ts` guards the ceiling.

**`emissiveIntensity`.** Blender's emission strength is a radiance figure for a
path tracer: 2.5 on the cove LEDs, 1.35 on the step markers, 2.4 on the speaker
standby light. Carried over literally, every strip clipped to flat cream plastic
in this tone-mapped forward renderer. The hues are kept, pushed slightly more
saturated, and the levels cut to roughly a third — enough that a strip still
reads as a source.

### If textures are ever wanted

They are not needed for the current look, and adding them would reintroduce the
download budget this section used to be about. If it is revisited: use
[Poly Haven](https://polyhaven.com) (CC0), prefer the `arm` map (AO/roughness/
metalness packed, matching glTF's `occlusionRoughnessMetallicTexture`), use
`nor_gl` not `nor_dx` (three.js expects the OpenGL green channel), and use
KTX2/Basis rather than WebP — WebP shrinks the download but decodes to `RGBA8`
on GPU upload, so it does nothing for texture memory.

### Non-negotiables

- **No baked lighting.** §4 makes the screen the dynamic primary light source.
- **The screen aperture stays clear.** The masking surround is built as four
  pieces around the picture; nothing may cross it. `geometry.test.ts` asserts no
  masking vertex falls inside the aperture.
- **No `transmission`, anywhere.** One transmissive material costs a full extra
  scene pass — 0.36 ms to 12.92 ms, measured. This is why the cafe doors went.


## 5. Character Controller

Rapier kinematic character controller with a capsule collider. Not hand-rolled
collision — the step down into Row A, the riser, and chair geometry all need
real sweep-and-slide handling.

### Controls

| Input | Action |
|---|---|
| `W` `A` `S` `D` | Move, camera-relative |
| `Shift` | Run |
| `E` | Sit / stand, when within range of a free seat |
| `R` | Hold to open the dance wheel, release toward a clip |
| Mouse drag | Camera orbit |

`W`, `A`, `S`, `D`, `E` and `R` are all unbound in the existing player, which
uses `K`/`J`/`L`/`M`/`F`/`C`/`N`, Space, arrows and Escape. `F` is deliberately
avoided for sitting: it is the player's fullscreen toggle, and the player stays
mounted beneath the scene (the theatre renders inside `Player.Root` so the video
keeps playing), so a theatre binding on `F` would fire both actions. `R` is used
only by the music shortcut layer, which is not active in a watch party. Arrow
keys (seek) must still be gated while the avatar has focus.

Guests are `interactionMode: 'read-only'` for playback already, so only the host
holds both control roles.

### Sit interaction

**Every seat starts empty.** Nobody is auto-seated, ever — not the host, not
the first joiner. A watch party with one person shows one avatar standing and
ten visibly empty chairs, and that person may sit anywhere they like.

Seat state is a `Map<SeatId, { userId, at }>` held independently by **every**
client (`theatre/lib/seat-claims.ts`, driven by `use-seat-occupancy.ts`), not by
the host.

**There is no arbiter.** Admission to the party is already the permission
boundary — once the host has approved a member they may sit anywhere — so routing
every claim through the host would add a round trip and a single point of failure
to guard something that is not actually restricted. Claims are broadcast and
applied optimistically.

Two people can therefore grab the same seat in the same instant, and it has to
resolve identically on every machine with nobody adjudicating. The rule:

- Earliest `at` wins.
- An exact tie breaks on the lower `userId` — arbitrary, but identical
  everywhere. Ties are not hypothetical: `Date.now()` is millisecond-resolution
  and two clicks can land on the same one.
- The rule is **order-independent** — apply the same set of claims in any
  sequence and every client lands on the same occupant. That property is what
  makes a referee unnecessary, and it is what `seat-claims.test.ts` covers.
- A person holds at most one seat, so a new claim vacates their previous one
  first. Otherwise standing up and sitting elsewhere leaves a phantom occupant
  that blocks the chair for everyone.

Flow:

1. Proximity check against `SEATPAD_<id>` positions, ~1.0 m radius
2. Nearest **free** seat's pad brightens and a `Press E to sit` prompt appears
3. `E` → broadcast `SEAT_CLAIM` with the seat id and `at`
4. Every client, including the claimant, applies the deterministic rule. A
   claimant that loses is bounced back to standing
5. Disable controller, play `SitDown`, lerp avatar to the seat anchor
6. Camera transitions from third-person follow to a seated near-first-person
   view facing the screen
7. `E` again → stand, seat returns to `null`, avatar is placed back on its pad

Seat pad tint encodes state, so the room reads at a glance:

| State | Pad appearance |
|---|---|
| Free | dim cyan `#06b6d4` |
| Free + you are in range | bright yellow `#ffcc00` |
| Taken | hidden |

This mirrors the pattern used by VRChat *stations* and High Fidelity's
sit-trigger zones: a defined anchor transform plus a proximity volume, rather
than clicking the chair mesh itself. It stays readable at a distance and does
not depend on precise aim.

Seats are reconciled against the party roster (`presentMemberIds`, which already
excludes `disconnected` members). A seat held by someone no longer in the room is
worse than a stale avatar, because the deterministic rule makes it
**untakeable** — a ghost claim carries an early timestamp, so every later claim
on that chair loses to it and the seat stays reserved for somebody who left.

A member who joins late never heard the claims that already fired, so each
sitting client re-asserts its **own** claim on `MEMBER_JOINED`, re-sending the
original timestamp rather than a fresh one. Re-announcing with `Date.now()` would
make a sitting player lose their own seat to whoever claimed most recently.
Re-asserting per-client is what preserves the no-referee design; broadcasting a
whole seat map would mean electing an authority to own it.

> Earlier revisions of this document described a host-arbitrated model with
> `SEAT_MAP` and `SEAT_DENIED` messages. That approach was rejected for the
> reasons above, and those two message types — never sent by anything — have been
> removed from the `RTMMessage` union along with the unused `onSeatMap`
> subscriber.

### Camera

Third-person follow while walking — `WASD` moves the avatar and the camera
trails it, so walking always looks like walking, never like a floating camera.
Seated view on sit. Smooth interpolated transition both ways.

---

## 6. Network Protocol

Rides on the existing Agora RTM channel. Extends the `RTMMessage` discriminated
union in `room/types/rtm-messages.ts`.

### New message types

```ts
interface RtmAvatarTransform {
  type: 'AVATAR_TRANSFORM';
  userId: string;
  x: number;
  z: number;
  yaw: number;
  anim: 'idle' | 'walk' | 'sitting';
  serverTime: number;
}

interface RtmSeatClaim {
  type: 'SEAT_CLAIM';
  userId: string;
  /** seat id to take, or null to stand up */
  seatId: string | null;
  /** claim timestamp, ms — the only field the contest is decided on */
  at: number;
}
```

There is no `SEAT_MAP` or `SEAT_DENIED`. Both existed in the union as leftovers
from the rejected host-arbitrated design (§5) and were never sent; they have been
removed.

**No `Y` in the transform.** Floor height is derived locally from `(x, z)`. This
saves bandwidth and prevents desync artefacts on the step.

### Rates & authority

| Concern | Decision |
|---|---|
| Transform broadcast rate | **10 Hz**, matching the proven cursor throttle in `use-sketch-overlay.ts` |
| Remote smoothing | Interpolation buffer — render remote avatars ~100 ms in the past, interpolate between snapshots |
| Packet gaps | Dead reckoning from last known velocity |
| Seat authority | **No arbiter.** Claims are broadcast and applied optimistically; conflicts resolve by a deterministic, order-independent rule on every client (§5). |
| Movement authority | **Client-authoritative.** No cheating incentive in a watch party; authoritative server movement is unjustified complexity. |

Seats are the only genuinely conflicting state in the feature — two people
cannot occupy `A3`. Everything else is conflict-tolerant.

Host arbitration was the original plan, on the grounds that it matched the
existing host-authority model for playback. It was rejected: party admission is
already the permission boundary, so arbitrating a claim guards nothing, and it
would add a round trip plus a single point of failure. A deterministic
order-independent rule gets the same convergence with neither — see §5.

### Lifecycle hooks

| Event | Behaviour |
|---|---|
| RTM presence `JOIN` | Spawn avatar at spawn point |
| RTM presence `LEAVE` | Despawn avatar, host releases their seat |
| Guest joins | Each seated client re-asserts its own claim, with the original timestamp |
| Host disconnect (existing 60 s grace) | Seats keep resolving — no client depends on the host to arbitrate |

---

## 7. Chat, Voice & Reactions in 3D

| Feature | 3D treatment |
|---|---|
| Chat | Floating speech bubbles above the speaker's avatar, plus the existing panel on a toggle key |
| Voice | Agora audio **panned by seat position** — this is what actually sells "sitting beside you" |
| Emoji reactions | Spawn above the sender's avatar rather than over the video |
| Soundboard | Unchanged, non-positional |
| Sketch | Disabled |

Spatial voice is a small step once seat positions are known, and it carries more
of the illusion than the visuals do. Prioritise it over avatar fidelity.

---

## 8. Performance Budget

The hard constraint: this runs *alongside* HLS decode, Agora RTC with up to 8
participants, RTM, and React. The GPU and main thread are already busy.

| Metric | Target |
|---|---|
| Frame rate | 60 fps target, 30 fps floor |
| WebGL frame time | **< 8 ms** — leaves headroom for video decode and Agora |
| Draw calls | < 80 |
| Triangles | < 150k |
| Total 3D payload | < 16 MB — characters only; the room is generated (§3) |
| Screen-light sampling | Throttled to ~10 Hz, not per-frame |

### Adaptive quality — measure, do not predict

**There is no hardware gate.** Capability detection on the web is unreliable:
`hardwareConcurrency` reports CPU cores rather than GPU, `deviceMemory` is
coarse and Chromium-only, and `WEBGL_debug_renderer_info` is increasingly masked
for privacy. Any fixed bar misclassifies in both directions — blocking capable
machines and admitting weak ones.

Instead, start at a tier, sample real frame time for ~3 s, and step down if the
30 fps floor is missed. Step down only; never oscillate.

| Tier | Shadows | Bloom | Textures | Screen light | DPR cap |
|---|---|---|---|---|---|
| High | 1–2 lights | on | 2k upholstery | 10 Hz | 1.5 |
| Mid | off | on | 1k | 5 Hz | 1.25 |
| Low | off | off | flat colour | 2 Hz | 1.0 |

**The DPR cap is the single cheapest win.** On a Retina display
`devicePixelRatio` of 2 means 4× the fragments, and fragment work is where the
lights and bloom cost sits. Always clamp:

```ts
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
```

Shadows are the other large lever: each shadow-casting light re-renders the
scene into a depth map every frame, and a *point* light costs six passes because
it needs a cubemap. Cap at two shadowed lights, and prefer the screen itself as
the unshadowed primary source (§4).

### Draw-call batching

**Done, by generating the room instead of exporting it.** The Blender blockout
spent **307 draw calls across only 19 materials** — its coffered ceiling alone was
229 objects sharing 4. `GeometryBatcher` (§3) merges per material, so the whole
auditorium is **22 draw calls** and the ten chairs cost the same as one.

Geometry is not the constraint: the room is well under the 150k triangle budget,
so detail should be spent, not cut. The constraint is **light count** — see below.

### Light count is the real fragment cost

Three.js forward-shades every light on every fragment, and `light.distance` only
shapes falloff; it does not skip the light. Cost is also superlinear past roughly
16 punctual lights, where each extra one costs about twice the previous. Measured
on an M4 at 2268x1111, shader compiles awaited:

| punctual lights | ms/frame |
|---|---|
| 16 | 1.69 |
| 24 | 3.01 |
| 32 | 7.78 |

The rig in `lib/lighting.ts` is 12 point/area fixtures plus ambient, hemisphere,
one directional and the screen's own `RectAreaLight`. `lighting.test.ts` holds the
ceiling at 12. Adding fixtures is the easiest way to regress this feature's frame
time, and a wall does not make a light behind it free.

One trap worth repeating from §3: changing the light *count* at runtime forces a
recompile of every material. If lights are ever culled dynamically, keep a fixed
slot count and move them rather than toggling `visible`, or steady-state cost is
traded for compile hitches.

### Bundle isolation

three.js, Rapier, and postprocessing must **not** enter the bundle for users not
in 3D mode. Dynamic-import the entire `theatre/` tree with `ssr: false`, the same
way `ActiveWatchParty` and `SketchOverlay` are imported today.

---

## 9. Video Texture Bridge

The crux of the feature, and the thing to validate first.

`THREE.VideoTexture` wraps the existing `<video>` element. hls.js keeps driving
it; we stop displaying it and sample it instead.

Requirements and gotchas:

- Keep the `<video>` **mounted**. Move it offscreen or use `opacity: 0` — not
  `display: none`, which can affect decode behaviour.
- Set texture `colorSpace` to sRGB, or output looks washed out.
- Video must be same-origin or CORS-enabled for texture upload. The existing CDN
  proxy should satisfy this — **verify before building**.
- **DRM is a hard blocker.** If content is Widevine/FairPlay protected, EME
  blocks reading frames into WebGL and the screen renders black. The current
  `/api/stream/hls/TOKEN/ID` path appears to be clear HLS — **verify before
  building**.

---

## 10. Proposed File Layout

```
src/features/watch-party/
├── theatre/                          ← new, self-contained
│   ├── components/
│   │   ├── TheatreScene.tsx          Canvas root, lighting rig, post-processing
│   │   ├── TheatreRoom.tsx           generated shell + starfield
│   │   ├── TheatreScreen.tsx         video plane + VideoTexture
│   │   ├── TheatreSeating.tsx        generated chairs + seat pads
│   │   ├── TheatreColliders.tsx      static boxes from layout.ts
│   │   ├── LocalAvatar.tsx           controlled avatar
│   │   ├── RemoteAvatar.tsx          interpolated peer avatar
│   │   └── SpeechBubble.tsx
│   ├── hooks/
│   │   ├── use-video-texture.ts
│   │   ├── use-screen-light.ts       average-colour light driver
│   │   ├── use-avatar-controls.ts    WASD + E, Rapier controller
│   │   ├── use-animation-state.ts    AnimationMixer crossfade machine
│   │   ├── use-theatre-network.ts    AVATAR_TRANSFORM broadcast + interp buffer
│   │   ├── use-seat-authority.ts     host-side seat arbitration
│   │   └── use-spatial-audio.ts
│   ├── lib/
│   │   ├── layout.ts                 seat table + room constants from §2
│   │   ├── geometry/                 the room itself — no asset
│   │   │   ├── batch.ts              GeometryBatcher: merge per material
│   │   │   ├── materials.ts          shared flat palette
│   │   │   ├── auditorium.ts         shell, walls, stairs, speakers, rear wall
│   │   │   ├── recliner.ts           the chair, x8 into one batch
│   │   │   └── starfield.ts          3 instanced tiers, 630 stars
│   │   └── interpolation.ts          snapshot buffer, dead reckoning
│   └── types.ts
└── room/types/rtm-messages.ts        ← extend union (§6)
```

No `public/models/`. The room is generated; the character models are fetched from
R2 at the URLs the backend publishes (§3).

Gate mode selection in `WatchPartyClient` at the same branch point as the
existing `isTV()` / `useIsMobile()` checks.

All constants in §2 belong in `theatre/lib/layout.ts` as named exports — single
source of truth shared by the generated geometry, the collision setup, and the
seat anchors.

---

## 11. Build Order

Deliberately front-loads risk. Each phase is independently verifiable.

| Phase | Deliverable | Gate |
|---|---|---|
| **0** | Spike: hidden video → `VideoTexture` on a plane, box room, 8 capsules, Agora running with cameras on, frame-time readout | **Frame time < 8 ms.** If this fails, stop and reconsider. Also resolves the DRM and CORS questions. |
| **1** | Blockout scene at §2 dimensions, real stream on the screen | Proportions and sightlines read correctly |
| **2** | Screen-driven dynamic lighting + bloom + tone mapping | Looks like a cinema |
| **3** | Rapier character controller, `WASD`, step traversal | Movement feels good, no clipping |
| **4** | Animation state machine with crossfades | No hard animation cuts |
| **5** | Networked avatars over RTM with interpolation | Two browsers, smooth remote movement |
| **6** | Seat claims with host authority, `E` to sit, camera transition | No double-occupancy under concurrent claims |
| **7** | Spatial voice panning | Direction is audibly correct |
| **8** | Chat bubbles, emoji repositioning | — |
| **9** | Look-dev: textures, materials, final post | — |

Phase 2 comes before avatars on purpose. It is the highest-impact element and it
tells us early whether the idea looks as good as it sounds.

---

## 12. Open Questions

Unresolved. Do not treat as decided.

1. **Is any content DRM-protected?** Binary blocker for the whole feature.
   Must be answered in Phase 0.
2. **Does the stream proxy send CORS headers permitting texture upload?**
   Likely yes, unverified.
3. **Frame budget under full load** — 8 participants with cameras on plus HLS
   plus WebGL is the realistic worst case and has never been measured.
4. ~~**Avatar fidelity vs. cost.**~~ **SUPERSEDED — rigged avatars were built.**
   This was resolved as "stylised capsules for v1", and then the opposite
   shipped: §1b documents a 19-bone rig with 23 capsules, rigid skinning, finger
   bones stripped at load, and ten clips embedded in the glb. `RemoteAvatar`,
   `use-avatar-animation.ts` and `lib/animation.ts` all depend on it.

   That makes the characters the **only** remaining download, now that the room
   is generated (§3). The capsule argument still holds as a device-floor lever if
   it is ever needed — it would delete the rig, the clips, per-frame GPU skinning
   for 8 avatars and the last of the payload — but it would now be a removal of
   working behaviour, not a deferral.
5. ~~**Does 3D mode need its own room flag on the backend?**~~
   **RESOLVED — client-side preference, not a room mode.** 3D is chosen per
   participant, so rooms are mixed-mode: the host may be in 3D while a guest
   sits in 2D, in the same room, with the same host-authoritative sync, chat and
   voice. A 2D client receives the same `SEAT_CLAIM` stream and could render it
   as text ("Rudra is in seat B3").

   Rationale: a watch party is social. Gating by device would mean a guest whose
   machine cannot cope is excluded from their friends' party, which is a worse
   product failure than a low frame rate. §1 already establishes that 3D is "a
   renderer swap, not a rewrite," so mixed-mode costs little to support.

   No backend flag is required.
6. **Late joiner seat contention** — if two guests claim the same seat within one
   RTM round trip, host arbitration resolves it, but what does the loser see?
   Needs a UX answer, not just a protocol one.
7. **Idle timeout** — should an avatar that never sits be auto-seated? Standing
   in the aisle for a 2h movie is a plausible but odd state.

---

## 13. Testing

Follow `docs/TESTING.md`. Specific to this feature:

- **Unit** — seat layout maths, interpolation buffer, dead reckoning, seat
  arbitration logic (host grants/denies correctly under concurrent claims)
- **Geometry** — `geometry.test.ts` covers the generated room without a GL
  context, by inspecting the built `BufferGeometry` directly. It asserts the
  batcher collapses primitives per material, that the room and chair match their
  measured envelopes, that no masking vertex crosses the screen aperture, that
  wall detail stands on the floor beneath it rather than on datum, and that the
  material palette stays inside the metalness and emissive ceilings §4b explains.
  These are the checks that caught real bugs during the port — a chair a third too
  tall, a backrest tilted the wrong way, a cup-holder wider than its armrest, and
  pilasters with their feet buried under the rear platform.
- **Integration** — RTM message round trip for `AVATAR_TRANSFORM` and
  `SEAT_CLAIM`; mode gating in `WatchPartyClient`
- **Not unit-testable** — anything requiring a WebGL context. Rendering, the
  character controller, and animation blending need manual or Playwright
  verification. Do not mock a GL context to chase coverage.
- **Perf regression** — record frame-time numbers from Phase 0 and re-measure at
  each phase gate.
