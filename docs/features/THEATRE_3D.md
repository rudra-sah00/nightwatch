# 3D Theatre Mode — Design Specification

> **Status: SPEC — not implemented.** This document defines what we are building
> before we build it. Every other doc in `docs/features/` describes shipped
> behaviour; this one describes intent. Update it as decisions change, and
> rewrite it as an as-built doc once the feature ships.

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

Last synced with the code: 2026-09-21.

### Built and verified

| Area | Module | Notes |
|---|---|---|
| Scene constants | `theatre/lib/layout.ts` | Single source of truth, measured from Blender |
| Canvas + room + seating | `theatre/components/TheatreScene/TheatreRoom/TheatreSeating.tsx` | Chair glb loaded once, reused across 8 seats |
| Walking | `theatre/hooks/use-avatar-controls.ts` + `components/LocalPlayer.tsx` | Rapier kinematic controller, WASD + Shift |
| Collision | `theatre/components/TheatreColliders.tsx` | Static boxes from `layout.ts`, not a trimesh |
| Networking | `theatre/hooks/use-theatre-network.ts` | Agora RTM, 8 Hz + dead band |
| Interpolation | `theatre/lib/interpolation.ts` | 160 ms snapshot buffer |
| Remote avatars | `theatre/components/RemoteAvatar.tsx` | `SkeletonUtils` clone per peer |
| Animation | `theatre/hooks/use-avatar-animation.ts` + `lib/animation.ts` | Mixer + crossfade state machine |
| Seated camera | `theatre/hooks/use-seated-camera.ts` | Per-seat head cone clamp |
| Asset manifest | `theatre/api.ts` + `hooks/use-theatre-assets.ts` | Backend-owned URLs |
| View modes | `theatre/lib/view-mode.ts` + `hooks/use-view-mode-hotkey.ts` | `V` cycles 2D → 3D → screen focus |
| Opt-in download | `theatre/hooks/use-theatre-preload.ts` | Nothing fetched until enabled in settings |

### Not yet built

| Area | Blocker |
|---|---|
| `TheatreScreen` + `use-video-texture` | None — next piece of work. The in-scene screen is currently a lit placeholder; audio plays because `Player.Root` stays mounted. |
| `use-screen-light` (average-colour driver) | Depends on the video texture |
| `E` to sit, `use-seat-authority` | RTM message types exist (`SEAT_CLAIM` / `SEAT_MAP` / `SEAT_DENIED`); arbitration not written |
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

> **Status: BUILT.** Every number below is measured from the Blender scene, which
> is the source of truth (kept outside the repo — it is a ~158 MB binary). These
> values are mirrored in `src/features/watch-party/theatre/lib/layout.ts`, which
> is what the runtime reads. If this document and `layout.ts` ever disagree,
> `layout.ts` wins and this document is stale.
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
| Width | 8.0 m (`X` from −4.0 to +4.0) |
| Depth | 8.5 m auditorium (`Z` 0 → 8.5), plus a café room `Z` 8.7 → 14.2 |
| Wall top | 4.6 m |
| Ceiling soffit | 4.35 m (coffered) |

The auditorium connects to a **café room** through a 2.60 × 2.30 m gate in the
back wall at `Z` 8.5–8.7. Both floors sit at `Y = 0.45` there, so it is walkable
in one continuous surface — 19.8 m from screen wall to café back wall.

### Screen

| Property | Value |
|---|---|
| Width | 7.0 m |
| Aspect | 2.39:1 → height 2.929 m |
| Bottom edge | `Y = 1.20` |
| Top edge | `Y = 3.29` |
| Centre | `(0, 2.245, 0.02)` |

The `+0.02` Z offset places the video plane just in front of the modelled
masking frame to avoid z-fighting.

**The screen is not a modelled asset.** It is a `PlaneGeometry` created in code
carrying the `VideoTexture`. The room model provides only the black masking
border around it and must leave that area flat and unobstructed.

### Seating

Two rows, four seats each. Rear row on a raised platform.

| Row | Floor `Y` | `Z` | Seat `X` positions |
|---|---|---|---|
| A (front) | 0.00 | 4.5 | −1.35, −0.45, +0.45, +1.35 |
| B (rear) | 0.45 | 6.2 | −1.35, −0.45, +0.45, +1.35 |

- Seat spacing **0.90 m** (premium recliner pitch, not multiplex)
- Row pitch 1.7 m
- Step riser at `Z = 5.3`, 0.45 m tall
- Rear platform spans `Z` 5.3 → 8.5 at `Y = 0.45`

**There is no centre aisle.** The seats are contiguous, so the only route between
levels is the aisle stairs at `|X|` 1.80–4.00 — three risers of 0.15 m with
0.30 m treads, spanning `Z` 4.69 → 5.29. This is enforced in physics: a collider
across the riser face between the stairs blocks the shortcut, and the character
controller's slope limit stops you walking up the drop.

Seat IDs are `A1`–`A4` and `B1`–`B4`, numbered left to right from the
audience's point of view (i.e. `A1` is at `X = −1.35`).

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
(A1 −16.77°, A2 −5.74°, B1 −12.32°, B2 −4.16°, mirrored for 3/4). **Verified: from
all eight seats both screen edges fall inside the cone**, so the clamp never fights
the thing you are there to watch.

Anchors are baked in Blender as `SEATVIEW_<id>` empties carrying the limits as
custom properties, and mirrored into `layout.ts` for the runtime.

### Spawn & circulation

- Spawn at `(0, 0.45, 11.0)` — rear platform, facing the screen
- Players walk forward and **step down** into Row A, which gives the natural
  "walking down the aisle" feel
- Clear side aisles: seats span 2.8 m in a 6.0 m room, leaving 1.6 m each side

---

## 3. Asset Manifest

Three assets need modelling. Everything else is code.

### `chair.glb`

| Requirement | Value |
|---|---|
| Triangles | ≤ 1200 |
| Origin | Floor centre of the seat footprint |
| Facing | `−Z` |
| Footprint | ≤ 0.70 m wide × 0.85 m deep |
| Seat pan height | 0.45 m |
| Total height | ≤ 1.10 m |
| File size | < 100 KB |

Exported **once** and instanced 8× in code via `InstancedMesh`. Do not model
eight chairs. Do not include chairs in the room model.

### `room.glb`

The auditorium shell: raked floor with the step, walls, ceiling, screen masking
frame, acoustic wall panels, aisle light fixtures, exit signs.

| Requirement | Value |
|---|---|
| Triangles | ≤ 40k |
| Origin | World origin as defined above |
| File size | < 2 MB |
| Materials | Tiling trim sheets, not unique UVs per surface |
| Lighting | **No baked lighting.** See §4. |

Include a separate low-poly **collision proxy** mesh (named `_collision`) —
boxes only, no detail. Rapier uses this, not the visual mesh.

### `avatar.glb`

> **DEFERRED — not needed for v1.** §12 Q4 resolves avatars to stylised capsules
> generated in code (`CapsuleGeometry` + a name-tag sprite), so there is no
> avatar asset, no rig and no animation clips to author. Animation state reduces
> to position, yaw and a `sitting` flag, which is exactly what
> `AVATAR_TRANSFORM` already carries (§6). The specification below is retained
> for when rigged avatars are revisited post-launch.

| Requirement | Value |
|---|---|
| Standing height | 1.75 m |
| Origin | Between the feet |
| Facing | `−Z` |
| Triangles | ≤ 15k |
| Rig | Humanoid, Mixamo-compatible bone names |
| File size | < 2 MB |

Ships with four animation clips **in the same file**:

| Clip | Notes |
|---|---|
| `Idle` | Looping |
| `Walk` | Looping. Must be authored or retimed to ~1.4 m/s to match the controller. |
| `SitDown` | One-shot, ends in the seated pose |
| `SeatedIdle` | Looping |

Four clips in one GLB, not four files — otherwise the skinned mesh and rig are
downloaded and instantiated four times.

### Export pipeline

Blender → glTF Binary (`.glb`), `+Y` up, selected objects only, no cameras or
lights.

```bash
# static geometry — draco is fine here
gltf-transform optimize room.glb out.glb \
  --texture-compress webp --texture-size 1024 --compress draco

# the avatar — draco OFF, it can drop joint/weight attributes on skinned meshes
gltf-transform optimize avatar.glb out.glb \
  --texture-compress webp --texture-size 1024 --no-compress
```

**Textures dominate size, not geometry.** A 126-face chair exported at 10.3 MB
because of six 2048² maps, each costing ~22 MB of GPU memory; the optimize step
took it to 311 KB and the room from 16.5 MB to 2.3 MB. KTX2 is better still —
it stays compressed in VRAM rather than only on the wire — but needs the `ktx`
binary (`brew install ktx`), without which the command fails at the `uastc` step.

For the avatar, `export_apply` must be **false**: applying modifiers bakes away
the armature and silently yields an unrigged mesh.

### Where assets live

**Not in `public/`.** They are served from the Cloudflare R2 bucket
`nightwatch-assets` via `assets.nightwatch.in`, under a versioned prefix:

```
theatre/v1/models/{room,cafe,chair,avatar}.glb
theatre/v1/animations/...
```

URLs are owned by the backend (`GET /api/theatre/assets`) so the bucket, domain
and version can change without a frontend release. Bucket config, CORS and the
upload commands are documented in `nightwatch-backend/infra/r2/README.md`.

The `v1/` prefix is deliberate: a watch party holds clients for hours, so a new
asset set must be publishable without breaking sessions in flight. Bump to `v2/`;
never overwrite a live version in place.

One upload trap: `wrangler r2 object put` writes to a **local simulator** without
`--remote`, while still printing `Upload complete`. Verify over HTTP, not by
trusting the CLI.

---

## 4. Lighting

**The screen is the primary light source, and it is dynamic.** This is the
single highest-impact element of the whole feature and it is why no lighting is
baked into `room.glb`.

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

## 4b. Materials & Texturing

The current build is **flat-colour blockout** — every surface is a solid
neo-brutalist tone with `Metallic = 0` and no maps. That was deliberate for
getting the geometry and sightlines right. It is not the target look.

Target is **photoreal PBR surfaces carrying the neo-brutalist palette** — real
carpet weave, real fabric, real leather, real plaster, but tinted to the brand
colours rather than left as stock beige. Grain and wear come from the textures;
the colour identity stays ours.

### Source

[Poly Haven](https://polyhaven.com) — CC0, no attribution required, already
wired into the Blender MCP addon. It must be enabled first:
*3D Viewport → sidebar (`N`) → MCP for Blender → ✅ Use assets from Poly Haven*,
then reconnect.

### Verified candidate textures

These slugs were confirmed present in the Poly Haven API, with full PBR map
sets at 1k/2k/4k/8k:

| Surface | Slug | Notes |
|---|---|---|
| Floor carpet | `dirty_carpet` | Only carpet in the library. Tint to oxblood `#2a1416` |
| Chair upholstery | `velour_velvet` | **First choice.** Velvet is *the* cinema seat material |
| Chair upholstery alt | `leather_red_02` | Red leather, closest match to brand red `#e63b2e` |
| Chair upholstery alt | `leather_red_03`, `scuba_suede`, `fabric_leather_01` | Compare before committing |
| Chair frame | `metal_plate` | Dark, tint toward `#1f1d24` |
| Acoustic wall panels | `poly_wool_herringbone` | Woven wool — reads as real acoustic fabric |
| Acoustic panel alt | `ribbed_corduroy`, `wool_boucle`, `caban` | Corduroy ribbing suits vertical panel runs |
| Wall plaster | `grey_plaster_02`, `plastered_wall_04` | Tint to charcoal violet `#1f1d24` |
| Ceiling | `grey_plaster_03` | Tint near-black `#141318` |
| Riser / structural | `concrete_wall_003` | Available up to 16k |

Worth browsing the **`indoor`** category (76 assets) as a whole before settling —
it is the most relevant pool and larger than any single search above.

### Map conventions — easy to get wrong

Poly Haven ships several packed variants. For a three.js target:

- **Use `nor_gl`, not `nor_dx`.** `nor_gl` is the OpenGL green-channel
  convention, which is what three.js and glTF expect. `nor_dx` will make
  lighting appear inverted on every surface.
- **Use the `arm` map.** It packs AO → R, Roughness → G, Metalness → B in one
  image, which is exactly glTF's `occlusionRoughnessMetallicTexture` layout.
  One fetch instead of three.
- Prefer **`jpg`** over `png`/`exr` for the web. At 1k the `arm` map is ~1 MB as
  jpg versus ~4.5 MB as png.
- Each asset also offers a ready-made **`gltf`** variant worth checking before
  hand-wiring nodes.

### Resolution budget

Total 3D payload ceiling is **6 MB** (§8), and textures will dominate it.

| Surface class | Resolution | Reasoning |
|---|---|---|
| Carpet | 1k, tiled | Large area, always at a distance, low detail need |
| Walls, ceiling | 1k, tiled | Mostly unlit and out of focus |
| Chair upholstery | 2k | Closest surface to a seated camera |
| Accent trim | 512 or flat colour | Small screen area |

Tile with UV scaling, never by increasing resolution. A 1k carpet tiled 8× over
the floor looks sharper than a 4k carpet stretched once, and costs 1/16 the
bytes.

### Non-negotiables

- **No baked lighting in any map.** §4 makes the screen the dynamic primary
  light source. Baked AO in the `arm` map is fine and expected; baked
  *directional* light is not.
- **Screen aperture stays untextured.** The masking border may be textured; the
  aperture itself must remain flat and unobstructed for the `VideoTexture`.
- **Hard black outlines stay in post.** The neo-brutalist edge look comes from
  the postprocessing pass, not from baked outlines or extra geometry.
- Run everything through `gltf-transform optimize --texture-compress ktx2`
  before shipping, and re-measure against the 6 MB ceiling.
- **Use KTX2/Basis, not WebP.** WebP shrinks the *download* but is decoded to
  raw `RGBA8` on GPU upload, so it does nothing for texture memory. KTX2
  transcodes to a native GPU format (ASTC/BC7/ETC2) and stays compressed in
  VRAM. Measured on the current blockout: the 15 wired maps cost **135 MB** as
  `RGBA8`+mips versus **~17 MB** as KTX2 — an 8× saving for a barely
  perceptible quality cost. Download and VRAM are separate budgets; only KTX2
  fixes both.

---

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
eight visibly empty chairs, and that person may sit anywhere they like.

Seat state is a single map, `Record<SeatId, string | null>`, held by the host
and broadcast as `SEAT_MAP`. `null` means free.

Flow:

1. Proximity check against `SEATPAD_<id>` positions, ~1.0 m radius
2. Nearest **free** seat's pad brightens and a `Press E to sit` prompt appears
3. `E` → `SEAT_CLAIM` to host (§6)
4. Host validates against its seat map, replies `SEAT_MAP` or `SEAT_DENIED`
5. On grant: disable controller, play `SitDown`, lerp avatar to the seat anchor
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

On disconnect, the host frees that user's seat and rebroadcasts `SEAT_MAP`, so
a dropped guest never leaves a phantom occupant.

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
  seatId: string;
}

interface RtmSeatMap {
  type: 'SEAT_MAP';
  seats: Record<string, string | null>;
  serverTime: number;
}

interface RtmSeatDenied {
  type: 'SEAT_DENIED';
  seatId: string;
  reason: 'occupied' | 'invalid';
}
```

**No `Y` in the transform.** Floor height is derived locally from `(x, z)`. This
saves bandwidth and prevents desync artefacts on the step.

### Rates & authority

| Concern | Decision |
|---|---|
| Transform broadcast rate | **10 Hz**, matching the proven cursor throttle in `use-sketch-overlay.ts` |
| Remote smoothing | Interpolation buffer — render remote avatars ~100 ms in the past, interpolate between snapshots |
| Packet gaps | Dead reckoning from last known velocity |
| Seat authority | **Host-authoritative.** Host owns the seat map, validates claims, broadcasts `SEAT_MAP` on every change. |
| Movement authority | **Client-authoritative.** No cheating incentive in a watch party; authoritative server movement is unjustified complexity. |

Seats are the only genuinely conflicting state in the feature — two people
cannot occupy `A3`. Everything else is conflict-tolerant. Host arbitration
matches the existing host-authority model for playback and needs zero backend
work.

`SEAT_MAP` is broadcast in full rather than as deltas. Eight seats is small
enough that deltas are not worth the complexity, and full broadcasts make late
joiners trivial.

### Lifecycle hooks

| Event | Behaviour |
|---|---|
| RTM presence `JOIN` | Spawn avatar at spawn point |
| RTM presence `LEAVE` | Despawn avatar, host releases their seat |
| Guest joins | Host sends current `SEAT_MAP` |
| Host disconnect (existing 60 s grace) | Seat map freezes; no new claims resolve until reconnect |

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
| Total 3D payload | < 6 MB |
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

The blockout currently has **307 draw calls across only 19 materials** — the
coffered ceiling alone is 229 objects sharing 4 materials (96 `CofferInner`,
96 `CofferLED`, 24 `CofferBack`, 13 beams). Merge each material group into one
mesh at export time and instance the chairs; that clears the < 80 target with no
visual change whatsoever. Geometry is *not* the constraint here — the blockout is
2,140 triangles against a 150k budget, so detail should be spent, not cut.

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
│   │   ├── TheatreRoom.tsx           room.glb + collision proxy
│   │   ├── TheatreScreen.tsx         video plane + VideoTexture
│   │   ├── TheatreSeating.tsx        InstancedMesh chairs + seat anchors
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
│   │   └── interpolation.ts          snapshot buffer, dead reckoning
│   └── types.ts
└── room/types/rtm-messages.ts        ← extend union (§6)

public/models/theatre/
├── room.glb
├── chair.glb
└── avatar.glb
```

Gate mode selection in `WatchPartyClient` at the same branch point as the
existing `isTV()` / `useIsMobile()` checks.

All constants in §2 belong in `theatre/lib/layout.ts` as named exports — single
source of truth shared by the Blender script, the collision setup, and the seat
anchors.

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
4. ~~**Avatar fidelity vs. cost.**~~ **RESOLVED — stylised capsules for v1.**
   Rigged humanoids are deferred. Capsules suit the neo-brutalist theme, and
   they delete the rig, all four animation clips, retargeting, per-frame GPU
   skinning for 8 avatars, and roughly 2 MB of the 6 MB payload. This is the
   largest single lever for widening the device floor, and it removes the
   critical path — there is no armature in `theatre_blockout.blend` today, so
   the rigging work has not started. Revisit after the feature ships.
5. ~~**Does 3D mode need its own room flag on the backend?**~~
   **RESOLVED — client-side preference, not a room mode.** 3D is chosen per
   participant, so rooms are mixed-mode: the host may be in 3D while a guest
   sits in 2D, in the same room, with the same host-authoritative sync, chat and
   voice. A 2D client still receives `SEAT_MAP` and can render it as text
   ("Rudra is in seat B3").

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
- **Integration** — RTM message round trip for `AVATAR_TRANSFORM` and
  `SEAT_MAP`; mode gating in `WatchPartyClient`
- **Not unit-testable** — anything requiring a WebGL context. Rendering, the
  character controller, and animation blending need manual or Playwright
  verification. Do not mock a GL context to chase coverage.
- **Perf regression** — record frame-time numbers from Phase 0 and re-measure at
  each phase gate.
