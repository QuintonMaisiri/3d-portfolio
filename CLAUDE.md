# The Adventurer's Codex

We're building my portfolio site, **The Adventurer's Codex**, from scratch. It's a single-page, scroll-driven 3D journey through one continuous fantasy world. Each of eight regions carries one section of my portfolio. The site has two jobs of equal weight:

1. **Immersive:** a visitor should feel they're travelling through a living world. No hard cuts, no section dividers. Region transitions are camera moves, fog and light shifts, and terrain changes.
2. **Informative:** a recruiter or client must be able to learn who I am, what I've built, what I'm good at, and how to reach me within about 60 seconds, without needing to appreciate the 3D. The world frames the content; it never hides it.

When these two goals conflict, readability wins.

## Tech stack

- Next.js (App Router) with TypeScript, strict mode
- React Three Fiber, `@react-three/drei`, `@react-three/postprocessing`
- GSAP for the master scroll timeline
- Zustand for shared scroll state (store raw progress and smoothed progress separately)
- Tailwind CSS for the HTML layer
- `.glb` models with Draco compression

Use current stable versions and check they're compatible with each other before installing (R3F v9 requires React 19; R3F v8 requires React 18). Self-host the Draco decoder in `public/draco/` rather than loading it from a CDN.

## Architecture

**One scroll value drives everything.** A single progress value from 0 to 1 is the source of truth. A paused GSAP master timeline is scrubbed by that value each frame and drives: camera position along a `CatmullRomCurve3`, camera look target, fog colour and density, key light colour and intensity, hemisphere light colours, and per-region animation progress. Each region owns an equal eighth of the timeline (Highlands 0.000 to 0.125, through Campfire 0.875 to 1.000).

**The camera should dwell, then travel.** Ease progress so the camera settles at each region long enough to read its content, then moves quickly to the next. Atmosphere blends during travel, not while dwelling.

**Two layers.**
- *World layer:* the R3F canvas, fixed full-screen behind everything.
- *Content layer:* real semantic HTML (headings, paragraphs, lists, links) positioned over the scene, synced to scroll. All portfolio content lives here, not as 3D text or textures, so it's selectable, searchable, indexable and screen-reader friendly. 3D objects can echo the content (a tree per project, an orb per skill) and act as interactive entry points, but the HTML is the canonical source.

**Regions are self-contained components.** Each region lives in `components/regions/<Name>.tsx` with its scenery, its animations, and a clear asset slot. Region definitions (name, scroll range, palette, camera waypoint, content) live in one config file, `lib/regions.ts`, and content lives in `content/*.ts` so I can edit copy without touching 3D code.

**Assets start as placeholders.** I have no final models yet. Build every region with procedural low-poly geometry from Three.js primitives (flat shading, a restrained per-region palette), wrapped so each placeholder can later be swapped for a `.glb` by changing one import. Do not recommend specific asset packs or marketplace items by name unless you can verify they exist; if assets come up, describe what's needed and I'll source it.

## The eight regions

| # | Region | Section | World idea | What the visitor must learn |
|---|---|---|---|---|
| 1 | The Misty Highlands | Hero | Name and title emerge from fog; a tagline on a stone tablet | Who I am and what I do, in one glance |
| 2 | The Ancient Archive | About | A scroll unrolls as you descend into a library | Background, current role, what drives me |
| 3 | The Forge | Skills | Skill orbs rise from molten rock, grouped by domain | Core stack and depth, not a logo wall |
| 4 | The Enchanted Forest | Projects | Each tree is a project; clicking one opens its detail | What I built, my role, the problem, the result, links |
| 5 | The Thundering Peaks | Problem solving | A climb; each peak is one hard problem | How I think: problem, approach, outcome |
| 6 | The Sunken Ruins | Experience timeline | Tablets rise from water, one per milestone | Career path in order, at a glance |
| 7 | The Crystal Caves | Testimonials | Each crystal holds a quote | What others say about working with me |
| 8 | The Campfire | Contact | A campfire under stars; the form is sent by raven | How to reach me, with zero friction |

## My content (use this; don't invent more)

- **Name:** Quinton Tinotenda Maisiri (corrected 2026-09-29)
- **Headline:** Software Engineer | Full Stack Developer. Don't lean into any speciality (e.g. security) for now.
- **Current role:** Senior Developer at Uncommon.org, a nonprofit technology education company
- **Location:** Harare, Zimbabwe
- **Path (corrected 2026-09-29):** Associate Developer, Uncommon.org, Sept 2023 to Aug 2025; Senior Developer from Aug 2025. BSc Computer Science, University of Zimbabwe, Aug 2021 to Aug 2025. Freelance since 2022. Frontend Developer (contract, part-time), Revixions, May 2024 to Jan 2025.
- **Source:** the CV (QMaisiri_Softaware_eng.pdf) supplied skills, dates and project descriptions now in `content/`. Its extra projects (Maintenance Dispatch, Wardrobe Worth, Facilite, Mutai) are not on the site yet; see open decisions.
- **Core stack:** TypeScript, React / Next.js, NestJS, PostgreSQL
- **Also:** AI/LLM integration; infrastructure tooling (Kubernetes, GitHub Actions, Tekton, Argo CD)
- **Products I own end to end at Uncommon:** UncommonOS, MentorMatch, PeopleCore, Uncommon Playground, Program Pulse
- **Freelance:** BioDive UAE (website build and ongoing support)
- **Links:** github.com/QuintonMaisiri, linkedin.com/in/quinton-maisiri-2ab157211/
- **Email:** maisiriquinton@gmail.com
- **Tagline:** "From first requirement to final deploy, I build the whole thing."

Where content is missing (project write-ups, problem-solving case studies, testimonials, tagline), use clearly marked placeholders like `[TODO: MentorMatch problem and outcome]` and list them for me at the end of each phase. **Never invent testimonials, quotes, metrics or project outcomes.**

## Informative requirements

- Every region's content is legible over its scene at all times while dwelling: sufficient contrast (WCAG AA), a readable panel treatment, line length under about 70 characters.
- Persistent navigation: a compact region map that shows where you are and jumps to any region.
- A "Read as a page" toggle that hides the canvas and presents all content as a clean, conventional one-page portfolio. Same content source, no duplication.
- Project detail (from clicking a tree) opens in an accessible panel: focus-trapped, closable with Escape, with the scroll journey paused behind it.
- Keyboard: every interactive 3D object has an HTML equivalent reachable by Tab.
- `prefers-reduced-motion`: no camera travel animation or ambient motion; regions snap, and the page stays fully usable.
- Metadata: proper title, description, Open Graph image, and semantic HTML so the content is indexable.

## Performance and devices

- Target 60fps on a mid-range laptop with integrated graphics.
- Only regions near the current scroll position render or animate; everything else is hidden or frozen.
- Cap device pixel ratio at 2; use instancing for repeated scenery (trees, crystals, rocks, particles).
- Use `r3f-perf` in development only.
- Mobile and low-power devices get a lighter scene (fewer particles, no postprocessing). If the GPU is too weak or WebGL is unavailable, fall back to the "Read as a page" view automatically.

## Build phases (stop for my review after each one)

- **Phase 0: Foundation.** Project setup, config files, region config, content files, Zustand store, empty canvas plus content layer, region nav, and the "Read as a page" view with all content. The site must already be fully informative with no 3D.
- **Phase 1: The journey skeleton.** Camera path through all eight regions, dwell-then-travel easing, fog and light blending, and rough placeholder blocking for every region. The goal is to prove the world feels continuous before polishing anything.
- **Phase 2 onward: one region at a time**, in order, finished completely (scenery, animation, interaction, content panel) before moving to the next.
- **Final phase:** performance pass, accessibility audit, mobile fallback, metadata, deployment to Vercel.

## How I want to work

- Concrete code over long discussion. Explain decisions briefly when they matter.
- Keep `CLAUDE.md` current: update it at the end of each phase with what's done, what's next, open TODOs, and any decisions we made, so a fresh session can pick up without me re-explaining.
- If something is ambiguous, ask one focused question rather than guessing on anything structural. For small styling details, make a sensible choice and tell me.
- Before saying a phase is done, run the dev build, check for TypeScript and console errors, and tell me exactly what to look at in the browser.
- No em dashes in any copy you write for the site.

---

## Status

**Current phase:** All build phases complete (0 to 9 plus final pass), real models rolled out to all regions. **Next:** Quinton's end-to-end debug pass on real hardware, content TODOs, then deploy (awaiting his go-ahead and Vercel account).

### Git and v2
- Local git repo (not pushed; no remote). Branches: `main` and `v1` hold v1 (commit `e8f4d8d`); `v2` holds the v2 audit and plan in `docs/v2-plan.md`. Commits authored as maisiriquinton@gmail.com (repo-local config).
- v2 direction (Quinton, 2026-09-29): **immersion first** (content may sit behind discovery; "Read as a page" is the guaranteed shortcut), game-like exploration. Movement model left to the audit, which recommends "glades and roads": walk freely within each region, authored travel between them. **Plan approved 2026-09-30**: model B, Forest as vertical slice, discoveries persist (localStorage), sound muted for now (engine built, silent). **On the v2 branch, immersion-first supersedes "readability wins" and the 60-second rule**: content may sit behind discovery, with the Codex's first page and page view as the guaranteed shortcuts. V2.0 Foundation done (below). **Next: V2.1 Interaction and the Codex.**

### v2 assets (added 2026-09-30, checked)
- **Built** (`npm run models -- creatures|chest|survival|resources`): ox beetle 885 KB (9 clips kept of 49: Idle, Fidget, SleepLoop, SleepEnd, Walk, Run, Flinch, StunStart, StunLoop; authored ~6 long), dung beetle 172 KB (Walk rolling its ball, Attack; realistic textures, use small), raven 112 KB (one clip "Scene": take-off and flight; authored in cm), `props/chest-wood.glb` 94 KB (Chest_Open/Close/Opened/Closed), 12 Survival Pack props (tent, backpack, compasses, bonfire, torch, log, shovel, axe, pan, pot, matchbox; OBJ at a large scale, scale down at runtime), 16 KayKit Resource Bits (ingots, nuggets, cog, parts, stone chunks, logs, planks, textiles, pallet). Paths in `lib/models.ts`.
- **Pipeline additions:** animated entries now resample keyframes and compress textures; `clips` keeps and renames chosen animations (disposing a clip now also disposes its channels and samplers, which had left 7 MB behind); Sketchfab spec-gloss materials are moved to base colour. The adventurer dropped to 175 KB.
- **Licences:** Survival Pack and KayKit CC0; ambientCG textures (paper, leather, carpet, for the Codex, unextracted) CC0; the three creatures **CC-BY-4.0**, credited in `content/credits.ts`, shown by `components/content/Credits.tsx` in the page view (the Codex will show them too). Left out: the survival raft (modern inflatable), guns, phones, cans. The nature pack zip was an identical duplicate. **Music** `leberch-ambient-ambient-music-595680.mp3`: no metadata; filename looks like a Pixabay download, source unconfirmed (sound is muted for now).
- `app/lab` (dev only, 404 in production): every candidate model side by side under world-like light, for style and scale checks.
- `app/globals.css` excludes `assets-inbox` and `public` from Tailwind's class scan: the extracted glTF/OBJ text made the scanner try to allocate 15 GB and crash the dev CSS build.

### Done in V2.0: Foundation (v2 branch)
- **View modes:** `explore` (v2, the default world view), `journey` (v1 film, kept at `?view=journey` while v2 is built), `page`. The server still renders the journey HTML (all content indexable); the client switches on mount. Only a saved "page" choice is remembered. Header toggle is page <-> explore. In explore the region map is fast travel (`travelTo`), and `#region` deep links spawn there.
- **The adventurer:** `Character_Animated.fbx` (ultimate ruins pack, CC0) built by `npm run models -- character` (FBX2glTF via the `fbx2gltf` devDependency, pinned 0.9.7-p1; animated entries skip weld/simplify; duplicate `CharacterArmature|` clips dropped) to `public/models/character/adventurer.glb`, 326 KB. Clips: Idle, Walk, Run, PickUp, Roll, Punch, Death, Dagger_Attack(2), RecieveHit(_Attacking), Attacking_Idle; all in place (no root motion). Scale 0.71 (about 2 units tall). Before building, extract the FBX to `assets-inbox/_work/character/`.
- **Movement** (`components/world/explore/Player.tsx`): `PlayerController` (always mounted, before the camera) moves the mutable `player` (`lib/player.ts`): WASD/arrows relative to the camera, Shift runs (3.4 / 7 u/s), click or tap walks there (heightfield ray march; far taps run; blocked walks give up after 0.6 s; reduced motion teleports). Kept on the valley by `clampToValley` (20 either side of the path, journey ends) and out of props by colliders. `Player` is the body: Lambert materials, idle/walk/run crossfades with pace matched to speed, never culled.
- **Colliders** (`lib/colliders.ts`): built automatically from the scene every 0.4 s when dirty (models mark dirty on load): every opaque mesh and instance taller than 0.35 and under 60 across becomes a y-rotated box on the ground plane, in an 8-unit grid. `userData.walkThrough` opts out (set for grass, foliage parts, undergrowth, mushrooms, heather, the Archive arch, skill orbs, the adventurer). `ModelScatter`/`ModelMix`/`Model` take `solid={false}`. This replaces the plan's navmesh for now; regions get hand-authored colliders where needed in their phases.
- **Camera** (`FollowCamera.tsx`): spring arm behind the shoulders (FOV 55, distance 3 to 14, 1.35x on portrait), drag to orbit, wheel or pinch to zoom, shortens instantly on terrain or collider hits and eases back, swings behind the adventurer while walking if the visitor hasn't looked for 1.8 s. The opening starts pulled out and up. `lib/cameraState.ts` holds `cameraLookAt` (shared with the journey rig; the sun follows it) and `orbit`.
- **World binding** (`ExploreDirector.tsx`, first in the Canvas): `journey.position = journeyPositionAt(player.z)` (whole inside a glade, blending across the middle of each road), so fog, light and region streaming work unchanged. `updateExploreNarrative` plays each region's arrival beats once, on first entry, and keeps them. Wires input, rebuilds colliders, compiles shaders, dev handle adds `player`, `input`, `colliderCount`, `collidersNear`.
- **HUD** (`ExploreHud.tsx`): `main#main` with an sr-only heading and a live region naming the current region, a controls hint (touch or keyboard wording) that fades after the first move, and a region title card on entry.
- Tests (scratchpad, not in repo): `explore.mjs` (walk, fast travel, click-to-walk), `extouch.mjs` (phone tap and drag), `cdp-v2.mjs` (v1 suite on `?view=journey` plus explore checks): all pass, no console errors.


### Done in Phase 0
- Hand-scaffolded Next 16 (App Router, Turbopack), TS strict + `noUncheckedIndexedAccess`, Tailwind v4, ESLint flat config.
- `lib/regions.ts`: 8 regions with equal eighths, palettes, rough waypoints, panel side. `lib/journey.ts`: `regionBlend()` splits progress into dwell/travel. `lib/store.ts`: Zustand with `rawProgress`, `smoothProgress`, `activeRegion`, `viewMode`, `webgl`, `reducedMotion`, `openProjectId`.
- `content/*.ts`: all copy, typed, TODO placeholders via `todo()` (rendered with a dashed underline).
- Journey view: fixed canvas (sky colour blends by region as proof of sync) + semantic HTML sections with sticky panels. Page view: same section components, light theme, canvas unmounted.
- Region map (anchors, `aria-current`), header with current region and view toggle, project dialog (native modal `<dialog>`), contact form (mailto), skip link, metadata, favicon.
- Auto fallback to page view when WebGL is unavailable.

### Architecture decisions
- **Scroll model:** native document scroll. Each region is a `<section id>` of `REGION_HEIGHT_VH` (300vh); the last is 100vh taller so section tops line up exactly with the eighths. The panel is `position: sticky` for the first 2/3 of a region (dwell), then scrolls away (travel). `DWELL_RATIO` in `lib/regions.ts` is derived from this; Phase 1 camera easing should use `regionBlend()` so camera, atmosphere and panels agree.
- **Anchors are region ids** (`#forge`, `#forest`, ...). Native anchor jumps land on the dwell start. CSS smooth scroll is off under reduced motion.
- **Content ↔ region link:** region config stays React-free; `components/content/sections/index.ts` maps region id → section component. Section headings use `region.section` ("Skills"), eyebrows use `region.name` ("The Forge").
- **Theming:** section components use `text-ink`, `text-muted`, `text-accent`, `bg-surface`, `border-line`, `bg-field`, `text-on-accent`, backed by CSS vars in `.theme-journey` (dark panel, per-region `--accent` inline) and `.theme-page` (light, single dark accent).
- **View mode:** `?view=page|journey` beats localStorage (`codex:view`) beats default journey. Server always renders journey HTML (all content present, indexable); a saved page preference applies after hydration (brief flash, revisit in final phase with a pre-hydration script if it bothers us).
- **Project dialog:** native `<dialog>.showModal()` for inert background, focus containment, Escape and focus return. `html.scroll-locked` pauses the journey. Trees in Phase 4 should call `useCodex.getState().openProject(id)`.
- **smoothProgress** runs in a rAF loop only while it differs from raw; world code should read it with `useCodex.getState()` inside `useFrame`, not via React subscriptions.

### Dependency notes
- Versions checked 2026-09-29: Next 16.3.6, React 19.3.0 (R3F 9.8 requires `>=19 <19.4`), three 0.186.1, R3F 9.8.1, drei 10.7.9, @react-three/postprocessing 3.1.3 (+ postprocessing 6.39.5), GSAP 3.15.0, Zustand 5.0.15, Tailwind 4.3.3. Node 22.15, npm 11.7.
- **TypeScript 6.0.3 and ESLint 9.39.5**, not the newer TS 7 / ESLint 10: typescript-eslint and Next's ESLint plugins don't support them yet.
- **r3f-perf 7.2.3** (last release Nov 2024) depends on drei 9 / React 18. An npm `overrides` entry points it at our drei 10. It also ships a source map pointing at a binary font that crashes Turbopack dev; `scripts/patch-r3f-perf.mjs` (postinstall) strips it. Dev only, lazily imported, verified absent from the production bundle. If it causes more trouble, swap for drei `<StatsGl>`.
- `scripts/copy-draco.mjs` (postinstall) copies the Draco decoder from `three` into `public/draco/` (gitignored, regenerated on install).
- `next.config.ts`: `agentRules: false` stops `next dev` appending its own block to this file; `turbopack.root` pinned because a stray `package-lock.json` exists in the parent `practice/` folder.
- Harmless console noise: `THREE.Clock ... deprecated` comes from inside R3F 9.8.1.
- Next 16 docs ship in `node_modules/next/dist/docs/`; check them for API changes.

### Open decisions
- Contact form backend (currently `mailto:` to maisiriquinton@gmail.com).

### Open TODOs (content)
Placeholders render visibly as `[TODO: ...]`. Edit in `content/`:
- `about.ts`: what drives you (1 to 2 sentences).
- `projects.ts`: UncommonOS and Program Pulse summaries; problem and result for all six; stack for the Uncommon products.
- `problems.ts`: 3 case studies. Candidates from the CV: CSRF cookie auth across origins, EcoCash/Paynow callback verification, MentorMatch capacity-aware allocation, the 15% refactor, four-layer RBAC. Needs approach and outcome from Quinton.
- `testimonials.ts`: real quotes with name and relationship.
- `skills.ts`: AI/LLM integration has no supporting detail yet.

### Deferred decisions (Quinton: "fix later")
- Which projects go in the Forest (add the CV's extra projects?).
- Which links are public (uncommon.org sites, biodiveuae.org, wardrobe-worth.com, facilite.cc, repos).
- Phone number on site (default: no). "Download CV" link. Final domain (needed for metadataBase and OG).

### Done in Phase 1
- `lib/timeline.ts`: paused GSAP master timeline (duration 1) scrubbed by `smoothProgress` in `components/world/Director.tsx`. It writes a mutable `journey` object: `journey.position` (0..7, whole while dwelling, eased `power2.inOut` during travel) and `journey.regions[i].progress`. Helpers `arrival(i)` (0 until travel toward i starts, 1 on arrival) and `distanceTo(i)`.
- `lib/cameraPath.ts`: centripetal CatmullRom curves through waypoint positions and targets; `CameraRig` samples them at `position / 7`, with a slight idle sway.
- `components/world/Atmosphere.tsx`: background, FogExp2, hemisphere and key light blended between current and next region palettes. Two point "glow" lights (current + next region, from `region.glow`) keep the light count constant so shaders never recompile; campfire glow flickers.
- `components/world/Terrain.tsx` + `lib/terrain.ts`: one continuous 200×415 low-poly ground with a walkable valley following the path, vertex colours blending region ground colours. `groundHeight(x, z)` places every prop.
- Regions: `components/regions/<Name>.tsx`, each in a `RegionSlot` that is only visible within 1.5 regions of the camera (`useRegionFrame` also skips their animation when far). Content echoes: one orb per skill (by group), one tree per project, one peak per case, one tablet per milestone, one crystal per testimonial. Arrival animations: scroll unrolls (Archive), orbs rise from lava (Forge), tablets rise from water in order (Ruins), stars fade in (Campfire).
- Asset slots: `components/regions/placeholders/<region>.tsx` (see README there). `lib/assets.ts` exports `DRACO_PATH`.
- `components/world/Scatter.tsx`: instanced placement helper; `scatter()` in `components/regions/shared.tsx` is seeded and always keeps props 3.5 units clear of the camera's route.
- Reduced motion: `journey.position` is rounded (world snaps at mid-travel), no sway/bob/flicker/drift. Canvas `frameloop="never"` while the project dialog is open. `flat` (no tone mapping) so palettes render as authored. Shaders precompiled with `gl.compileAsync` on mount.

### Phase 1 decisions
- Region centres are 45 units apart along -z (`REGION_SPACING`); `center[1]` is the ground baseline. Waypoints are derived by `frame()` in `lib/regions.ts`; `side` offsets camera and target together so scenery sits beside the content panel.
- **Campfire panel moved to the left** so the fire is never hidden behind the contact form. Forge panel is `panelSize: "wide"` (two-column skills).
- The header/nav active region still follows scroll eighths, so mid-travel it names the region you are leaving. Fine for now; revisit with Phase 2 polish if it feels off.

### Phase 1.5: cinematic flow (supersedes parts of Phase 1)
Quinton's feedback: motion felt erratic, "moving between pictures"; wants narrative to flow with movement like a film, only where it fits.
- **Timing:** `DWELL_RATIO` 0.55 (was 2/3). Travel is 45% of each region's 300vh, eased `sine.inOut`. `REGION_SCROLL_VH` = 300 replaces `REGION_HEIGHT_VH`. Scroll smoothing lambda 3.5 (was 6) for more glide.
- **Camera (`CameraRig`):** arc-length interpolation between waypoints (`waypointU` in `lib/cameraPath.ts`, `arcLengthDivisions` 2000) so travel speed is even; mid-travel aim blends toward the road ahead (`LOOK_AHEAD`), turning to the scene on arrival. Per-region `shot` in `lib/regions.ts` (`dolly`, `rise`, `orbit`) runs across the dwell via `journey.regions[i].shot` (`sine.inOut`, so velocity is continuous at arrival and departure) and decays through the next travel.
- **Panels:** with JS (`html.js`, set by an inline head script), panel frames are `position: fixed` and never move; without JS they fall back to sticky. `lib/narrative.ts` computes per panel `reveal` (build-in, max of scroll window and a 1.6s time-based build so it always completes once you stop) and `leave` (fade as travel starts). `JourneyLayer` runs one rAF writing `--reveal`/opacity; `globals.css` staggers `[data-beat]` elements (rise out of a soft blur). Content components mark beats with `data-beat`. Tabbing into a hidden panel scrolls its region into view.
- **Scene beats:** `beatProgress(reveal, i, n)` mirrors the CSS so 3D can sync to text. Forge: each skill group's orbs rise with that group's line (beat 0 is the header).
- **Narration:** `content/narration.ts`, keyed by the region being left; one subtitle line shown mid-travel (`.caption`, aria-hidden). Currently only Highlands ("Every build starts with a story.") and Archive ("Then comes the craft."). Drafts for Quinton to rewrite.
- **Reduced motion:** no builds or captions; the panel for the region the world has snapped to is shown.
- Dev only: `window.__codex = { journey, camera }` for inspecting motion.
- Headless Chrome (SwiftShader, ~5-12 fps) cannot judge motion feel; filmstrips via real wheel events are the useful check. Feel must be judged on real hardware.

### Scene beats (all synced to panel beats via beatProgress; beat 0 is the header)
- Archive: scroll unrolls with the panel reveal. Forge: each skill group's orbs rise with its group. Forest: each project tree's root ring and crown light with its project (`ProjectTreeHandle.setGlow`). Peaks: a summit beacon kindles per case. Ruins: each tablet rises from the water with its milestone. Caves: each crystal brightens and grows with its quote (crystals placed so each has its own third of the open frame). Campfire: stars fade in on arrival (no per-beat sync).
- Narration lines: Highlands "Every build starts with a story.", Archive "Then comes the craft.", Forest "Some problems you have to climb.", Caves "The road ends where yours begins." Peaks and Ruins travel stay silent. All drafts for Quinton to rewrite.

### Done in Phase 2: The Misty Highlands
- **Opening sequence** (`lib/narrative.ts`): `narrative.intro` runs 0 to 1 over 2.8s, starting on the world's first rendered frame (`narrative.worldReady`, set by Director) or after 1.2s at most. Fog density starts 4x and clears (`Atmosphere`), the camera eases in from higher and further back (`CameraRig` `INTRO_OFFSET`), mist starts 2.4x thicker, and the hero panel builds in from 0.6s over 2.2s. Reduced motion: no opening.
- **First paint:** with JS the hero panel is painted hidden (`.js ... [data-first]:not([data-live])`) so it emerges instead of flashing; a CSS fallback animation (`@property --reveal`) reveals it after 4s if the narrative loop never starts. No-JS users see it immediately.
- **Scenery** (`placeholders/highlands.tsx`): stone tablet with three carved lines that light in sequence with the tagline beat (`StoneTabletHandle.setCarving`, hero beat 3), standing stones, cairn, heather, grass tufts, rocks, a stepping-stone trail laid under the camera route toward the Archive (leads the eye onward), five circling crows (wings still under reduced motion), seven soft mist banks.
- **Mist:** alphaMap reads the green channel, so the texture is opaque greyscale. Sheets are 24 wide and stay on the flat valley floor (wider ones cut into the low-poly hills and show stepped edges); each fades by the camera's distance to its plane so flying through never pops.
- **Hero panel:** "Begin the journey" button (anchor to #archive; smooth scroll travels the route) with a nudging chevron (static under reduced motion), plus "or scroll, or use the map".
- Dev: `window.__codex.narrative` also exposed.

### Done in Phase 3: The Ancient Archive
- **Descent:** stone steps (`Steps`) laid along the ground under the last stretch of the camera route from the Highlands (continuing the Highlands trail), and an `Archway` placed on the route itself, sized from the camera's height there plus `ARCH_CLEARANCE`, so the camera always passes centrally beneath it. Both computed from `cameraPath` in `Archive.tsx` (`onDescent`).
- **Scroll:** `HangingScroll` (handle `update(unroll, ink[])`) unrolls with the About panel reveal, then ink lines write left to right, one group per About paragraph, each synced to that paragraph's beat. Lines only show once the parchment has unrolled past them.
- **Library:** outer ring of taller shelves for depth, raised mosaic dais (sits on the highest ground under it), lectern and book stack, 26 floating wax candles with flames (instanced), 220 dust motes drifting in the candlelight. Candle bob and dust drift are ambient only.
- **About panel (journey):** facts as a two-column label-over-value grid, tighter paragraph spacing; fits 1440x900 (19px internal scroll at 1366x768, final-phase item).
- **Header/region map** now use `regionShownAt(progress)`: the active region switches halfway through each travel, where the world visibly crosses over (same point reduced motion snaps), instead of at the eighth boundary.

### Done in Phase 4: The Forge
- **Composition:** the wide Skills panel covers the right ~60% of the frame, so the scene is laid out in the open left band (at depth d, visible x runs from about 6.5 - 0.75d to 6.5 - 0.28d in region-local units). Pool at (1, 3), pedestals on a shallow arc behind it, anvil and hearth placed inside that band. Region glow light moved to the pool.
- **Skill orbs:** one per skill, faceted Lambert gems that glow in their group's colour (a small `onBeforeCompile` multiplies the emissive by the instance colour, since three only tints the diffuse), with additive soft halos (`GlowPoints`). Each group rises from the lava with its panel beat, arcs over (`ARC`) and settles above its own `Pedestal`, whose ring lights in the group colour.
- **Group colours** live in `SKILL_GROUP_COLORS` (`lib/regions.ts`): gold, flame, steel blue, violet, white-hot, chosen to stay distinct under orange light. The Skills panel shows matching legend dots (journey view only) so text and world line up.
- **Lava:** vertex-coloured pool (hot centre to deep red rim) with slow heat breathing, drifting crust plates, 160 rising embers that fade and respawn. Hearth with glowing mouth and chimney; hammer on the anvil. Embers, heat breathing, crust drift and orb bob/spin are ambient only.
- `useSoftDot()` in `placeholders/common.tsx`: shared soft point texture for glows.
- Testing note: stale headless Chrome instances can hold the CDP port and hang the screenshot scripts; kill only processes whose command line contains `--headless` and the scratchpad profile.

### Done in Phase 5: The Enchanted Forest
- **Tree interaction:** each `ProjectTree` has pointer handlers (`Forest.tsx`): hover sets `hoveredProjectId` in the store and a pointer cursor; click calls `openProject(id)` (same accessible dialog as the panel list). Trees only respond while the Forest panel is on screen (`reveal * leave > 0.5`), never mid-travel. An invisible cylinder (no colour or depth writes) gives each tree a generous hit area. Opening a project clears hover; the cursor is reset on click, pointer-out and unmount.
- **Two-way link:** hovering or focusing an entry in the Projects panel sets the same `hoveredProjectId`, so its tree brightens; hovering a tree highlights its panel entry. A drei `<Html>` label ("Name · Open") floats above the hovered tree (decorative; canvas is aria-hidden, the list is canonical and keyboard reachable).
- **Project trees:** paler crowns, five lanterns (one shared material per tree) and a root ring; `setGlow(lit, hover)` lights them with the project's panel beat and brightens on hover (damped; instant under reduced motion).
- **Atmosphere:** four additive light shafts with a greyscale vertical fade (shimmer is ambient only), glowing mushroom clusters at each project tree's roots, fireflies.
- **Projects panel (journey):** entries are full-width rows with a chevron and a highlighted state; intro now mentions the trees.
- Testing note: synthetic CDP mouse input needs a lead-in move before R3F registers hover (the first event only enters the canvas); real pointers always do this. Dev debug handle now also exposes `store`.

### Done in Phase 6: The Thundering Peaks
- **The climb:** each case's peak has 12 lanterns zigzagging up the camera-facing side (`ClimbMarkers`, instanced, recoloured per frame). As a case builds into the panel its route lights from the base up over the first `CLIMB_SHARE` (80%) of its beat, then its summit `Beacon` ignites. Peaks are 11/14/17 tall so every summit stays in frame.
- **Storm:** 7 low-poly clouds (35 instanced puffs) drift on the wind; 300 snowflakes fall and wrap; lightning strikes every 5 to 11 s from a cloud to a peak (`Bolt`, a TubeGeometry rebuilt per strike, shown on the strike frame itself so slow devices still see it), followed by one weaker flicker 0.12 s later. At most two flashes per strike, each about 0.25 s: well under the WCAG three-flashes-per-second limit. Only while the camera is at the Peaks (`distanceTo < 0.6`). Reduced motion: no lightning, no falling snow, clouds still.
- **`lib/weather.ts`:** `weather.flash` is set by the Peaks and read by `Atmosphere`, which brightens sky (toward `#dfe7ff`), key light and hemisphere by it and decays it every frame, so a flash can never stick.
- **Problem-solving panel:** numbered summit markers (1, 2, 3; left to right like the peaks), aria-hidden since the `<ol>` conveys order.
- Measured (headless): 6 strikes in ~40 s, each ~0.25 s; zero flashes under reduced motion. Dev debug handle also exposes `weather` and `scene`.
- Testing note: the regression suite's first check waits 6 s; right after edits the dev server can take longer to mount the canvas.

### Done in Phase 7: The Sunken Ruins
- Tablets rise per milestone beat (`MilestoneTabletHandle.setY/setLit`); each has an inscription band that lights over the second half of its rise. A **causeway** of stepping stones (instanced, recoloured per frame) joins the tablets in career order, lighting stone by stone as the next milestone arrives, so the scene reads as a timeline. A "you are here" `NowMarker` floats over the latest milestone.
- Ripples spread from each risen tablet; broken arch, fallen column drums, steps descending into the water; drifting light motes. Ripple spread, water bob and motes are ambient only.
- Experience panel: "Now" badge on milestones whose period ends in "present".

### Done in Phase 8: The Crystal Caves
- Stalactites and stalagmites; drifting spores; eight twinkling sparkles orbit each crystal once its quote appears.
- Hovering a quote in the Testimonials panel (`hoveredQuoteId` in the store) brightens its crystal. Decorative quote mark on each testimonial.
- **Tunnel is asymmetric** (`TUNNEL.left -10`, `right 14`, `height 11`): the camera sits right of centre so the scene clears the panel, and a symmetric tunnel put the camera inside the right wall and roof rocks.

### Done in Phase 9: The Campfire
- **The raven carries the form.** On submit (journey view, motion allowed) `sendRaven()` records `ravenSentAt`; the raven flaps up and away toward the moon over 2.4 s, the email app opens after a 0.9 s head start, and a new raven perches after 6 s. Reduced motion or page view: the email app opens immediately. The status message confirms either way.
- Rising sparks from the fire, two log benches, a low moon with an unfogged halo (`GlowPoints` gained a `fog` prop), the raven perched in clear view in front of the fire with folded wings.

### Final pass
- **Device tiers** (`lib/webgl.ts` `detectGpu`): `supported`, `weak` (software renderers: SwiftShader, llvmpipe and similar) and `quality` (`low` for coarse pointer, 4 or fewer cores, 4 GB or less memory, or data-saver). View choice order in `Experience.tsx`: `?view=` in the URL, then the saved toggle, then page view on weak GPUs, else journey. The weak-GPU default applies in production only (headless test browsers render in software); `?gpu-check` enables it in dev.
- **Render budget** (`WorldCanvas.tsx`): DPR high `[1, 2]`, low `[1, 1.25]`, degraded `[0.75, 1]`; antialias only on high. drei `PerformanceMonitor` calls `degrade()` on sustained low frame rate (drops DPR and bloom for the visit).
- **Bloom** (`@react-three/postprocessing`, mipmap blur, luminance threshold 0.82) on high tier only, for lava, fire, beacons, crystals and lanterns.
- **Camera collisions:** audited by scrubbing the camera through the whole journey (241 samples) against every solid prop's bounding box (about 2,000 incl. instances). Fixes: clearance samples now include each region's reading drift (`shots` moved to `lib/cameraPath.ts`), `CAMERA_CLEARANCE` 4, `scatter` gained `tilt` (trees 0.06, since tilted crowns swung into the path), Archive shelves, pillars and candles filtered off the route, Forest trees, Peaks and the third crystal moved clear, Archive crane softened (`rise -1.3`). Result: zero hits.
- **Deep links snap:** a single progress jump over 1.5 regions (hash applied after load, view switch) snaps the world instead of flying the whole route (`ScrollDriver` `SNAP_JUMP`).
- **Accessibility:** axe-core (wcag2a/aa, wcag21a/aa, best-practice) in journey view at Highlands, Forge and Campfire and in page view: zero violations after darkening the header and region-map pills (region name was 3.58:1 on the light page).
- **Short screens:** tighter panels under 820 px tall and again under 740 px; every panel fits at 1440x900, 1366x768 and 1280x720 (checked Archive, Forge, Forest, Ruins, Campfire).
- **Metadata:** `lib/site.ts` (set `NEXT_PUBLIC_SITE_URL` in production), canonical URL, Open Graph `profile`, generated share card `app/opengraph-image.tsx` (static), Person JSON-LD, `robots.txt`, `sitemap.xml`.
- **Production checks:** software GPU defaults to page view with "Enter the world" still offered; `?view=journey` still enters; dev debug handle and r3f-perf absent.
- `README.md`: run, edit content, swap models, deploy to Vercel.

### Lighting pass and console clean-up
- **Console is clean** (no warnings or errors on load):
  - `THREE.Clock` deprecation came from inside R3F 9.8.1 (latest). `scripts/patch-r3f-clock.mjs` (postinstall, idempotent, ESM and CJS builds) swaps in an identical clock class. Remove once R3F uses `THREE.Timer`.
  - `KHR_parallel_shader_compile not supported`: `Director` now uses `gl.compileAsync` only when the extension exists, else `gl.compile`.
  - Shadows use `"percentage"` (PCFShadowMap); three r18x removed PCFSoftShadowMap and warned.
- **Shadows** (high tier): the sun follows the camera's look point (`cameraLookAt` exported from `CameraRig`) with a 68-unit shadow box, 2048 map, bias -0.0004, normalBias 0.05. `ShadowSetup` (after `<Regions>`) flags lit opaque meshes as casters and receivers; basic/transparent/hit-area meshes are skipped and the terrain only receives.
- **Ambient occlusion** (high tier): `N8AO` half-res, performance quality, radius 2, before Bloom.
- **Sky dome** (`SkyDome.tsx`, all tiers): gradient from the region's sky colour at the horizon to 62% of it at the zenith; follows the camera, unfogged, drawn first. Atmosphere writes `skyColors`.
- **Tone variation** (all tiers): `Scatter` gives each instance a deterministic brightness and slight warm/cool shift (`vary`, default 0.14).
- **Wind and water** (all tiers, `lib/wind.ts`): `windSway(from, amount)` material hooks bend woodland crowns, project-tree tiers and grass; `waterShimmer` adds slow interfering light bands to the Ruins water. Both run off `windTime`, advanced by `<WindClock>` only when motion is allowed.
- Peaks storm clouds now only show within 0.75 regions of the Peaks (they floated above the Forest).
- Dev-only `?no-degrade` keeps full quality in slow test browsers.

### Real assets (done: all eight regions)
- **Sources** (all CC0, Quaternius, unzipped from `assets-inbox/` into `assets-inbox/_work/<pack>/`, gitignored): Stylized Nature MegaKit, Fantasy Props MegaKit, Medieval Village MegaKit, Ultimate Modular Ruins Pack (OBJ), Updated Modular Dungeon (OBJ). The MegaKit glTFs expect their PNGs beside them: copy `Textures/*.png` into the `glTF` folder first. The village vines were dropped (texture `T_VineLeaf_png.png` missing from the pack).
- **Pipeline** (`npm run models`, optional filter `npm run models -- props`): `scripts/build-models.mjs` reads glTF (or converts OBJ with obj2gltf 3.2.0, pinned), then dedup, weld, meshopt simplify (per-model `ratio`/`error`), WebP textures via sharp, prune, Draco. Output `public/models/{forest,nature,props,village,ruins,dungeon}/*.glb`, about 4.3 MB. `scripts/model-sizes.mjs public/models [filter]` prints size, min y and triangles; `scripts/arch-probe.mjs` measures arch openings (the Archive arch is scaled from them so the camera clears it).
- **Runtime** (`components/world/ModelScatter.tsx`): `useModelParts(url, look)` bakes node transforms, converts materials to Lambert and tints them (`ModelLook`: `foliage`, `other`, `wind`, `glow` for emissive parts such as the woodfire's flame). `ModelScatter` (one model, many instances), `ModelMix` (items dealt round-robin across variants, with a scale multiplier), `Model` (one-off prop). All suspend; each region wraps them in `<Suspense fallback={null}>`. Paths live in `lib/models.ts`.
- **Region modules** `components/regions/models/<region>.tsx` keep the placeholder exports, so each region file changed only its import (plus new dressing: Highlands `DeadTrees`, Forge `Smithy`, Peaks `Pines`/`DeadTrees`, Ruins `Statues`/`BrokenWalls`, Archive `Rubble`, Campfire `CampGear`). `ModelWoodland` (woodland.tsx) takes optional `models`/`farModels` (Peaks uses pines only).
- **Kept custom** (story objects, or shapes no pack has): hero tablet, mist, crows, scroll, floor mosaic, lava, crust, hearth, skill orbs, mountains, clouds, bolt, milestone tablets, causeway, water, crystals, stalactites/stalagmites, tent, raven, moon.
- **Glows, not shapes**: every particle and small light is a soft round point (`useSoftDot(profile)` in placeholders/common: `"glow"` bright core for fireflies, dust, spores, motes, snow, stars, embers, candle flames, lanterns, climb markers, beacons, the Ruins "now" light, campfire flames; `"halo"` even disc for Forge orb halos and the moon halo). `SoftPointsMaterial` wraps it. No octahedron "floaters" remain outside the crystals.
- Forest mushrooms are the pack's common mushroom and shelf fungus (natural colours, no glow); project-tree lanterns are glow points.
- Caves rock placements were designed for centred boulders, so `CaveRock` shifts each model to put its centre on the spot.
- Triangles (headless, including neighbouring regions): about 0.35M (Ruins) to 1.25M (Forest). Watch on real hardware; if needed, shrink RegionSlot's 1.5-region visibility window or cut woodland counts.
- **Lite mode** (`lib/lite.ts` `useLite()`: low quality tier or degraded): grass fields keep 40% of blades, woodland keeps a third of distant trees and uses the light models near the camera too. Forest on mobile: 497k triangles / 80 draw calls, down from 1.19M / 204.
- Verified after the rollout: collision audit zero hits (241 samples, ~64k boxes), regression suite passes through the Campfire checks (its mobile screenshot step crashed headless Chrome; mobile checked separately, no console errors), typecheck, lint and production build clean.

### For the debug pass (known, not yet addressed)
- Motion feel, bloom strength and lightning intensity need judging on real hardware (headless runs at 1 to 12 fps).
- Mobile: the Campfire contact panel is about 133 px taller than a 390x844 screen and scrolls inside the panel; the region map sits close to panel edges on narrow screens.
- Deploy: not done. Needs Quinton's go-ahead, a Git repository (the folder is not one yet) and his Vercel account; set `NEXT_PUBLIC_SITE_URL`.
- Contact form backend decision still open (mailto today).
