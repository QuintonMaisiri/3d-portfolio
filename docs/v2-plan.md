# The Adventurer's Codex, v2: audit and plan

Branch: `v2` (from `v1`, commit `e8f4d8d`). This document is the audit of v1 and the plan for v2. Nothing in v2 is built yet.

Decisions made by Quinton for v2 (2026-09-29 and 2026-09-30):
- **Immersion first.** Content may sit behind discovery. "Read as a page" stays as the one guaranteed shortcut.
- **Movement model B approved:** explore freely within each region, authored travel between them (section 3).
- **Vertical slice:** the Forest (Claude's choice; it has the richest interaction, the animated chests, and the approved v1 art).
- **Discoveries persist** between visits (localStorage).
- **Sound: muted for now.** The audio engine is built, but v2 ships silent, with visual feedback only, until audio is sourced.

---

## 1. Verdict

v1 is a well-built **scroll-driven film**. A single value, scroll progress, drives the camera, light, fog and every animation. That is exactly why it feels like a video. The visitor can do only one thing: move forward or backward along a line someone else drew. Everything they see was framed in advance, the camera never looks where they want, and nothing reacts to them except two hovers and a form.

To feel like walking through a world, v2 needs:
- a body in the world
- the freedom to point your attention anywhere
- things that respond when you touch them
- a reason to go and look

Put simply, v2 has to become a small game. The good news is that v1's foundations carry over: the content layer, the regions, the models and the atmosphere system. What has to change is the input model, the camera and the interaction layer. Most of the art stays.

---

## 2. Audit of v1

### 2.1 What to keep
- **One continuous world** with atmosphere that blends between regions (fog, key light, hemisphere, sky dome). This is the backbone of the mood and is already good.
- **Canonical semantic HTML** for all content. In v2 this becomes the Codex journal (section 5) instead of floating panels.
- **Region configuration and content files** (`lib/regions.ts`, `content/*.ts`). The content model is fine; only its presentation changes.
- **Model pipeline** (`npm run models`, Draco, WebP, Lambert tinting, instancing) and the eight `models/<region>.tsx` modules.
- **Device tiers, lite mode and page-view fallback.** The camera-clearance tooling moves over as collision data.
- **Story objects:** the scroll that unrolls, orbs rising from lava, tablets rising from water, the raven. These become the rewards for interacting.

### 2.2 Why it feels like a video (root causes)

| # | Finding | Where in v1 | Effect |
|---|---|---|---|
| 1 | **One input axis.** Scroll maps straight onto a timeline (`ScrollDriver` to `lib/timeline.ts`). | whole app | No agency: the visitor is a viewer, not a traveller. |
| 2 | **Authored camera only.** The route is a CatmullRom spline with a fixed per-region `shot` drift. You cannot look left, turn round or step closer. | `CameraRig`, `lib/cameraPath.ts` | The world reads as a backdrop. Nothing can be "discovered" because everything is already framed for you. |
| 3 | **No presence.** No body, no footsteps, no shadow, no hands. The camera floats 3 to 6 units above the ground. | `lib/regions.ts` waypoints | No sense of scale; props look like a diorama seen from a drone. |
| 4 | **Panels dominate the frame.** The Forge panel covers about 60% of the screen and every region is composed around its panel. | `JourneyLayer`, `panelSize` | The scene becomes decoration behind a slide deck. |
| 5 | **Content is read, not found.** Every section appears on arrival, beat by beat, whatever you do. | `lib/narrative.ts` | There's nothing to seek out, so no curiosity loop and no reward. |
| 6 | **Very few interactions.** Hover or click a project tree, hover a quote, send the raven. Nothing else in the world responds. | `Forest.tsx`, `Caves.tsx`, `Campfire.tsx` | The 3D is scenery, not a place. |
| 7 | **Silence.** No audio at all. | none | Sound carries half of immersion in games; without it even great visuals feel like a screensaver. |
| 8 | **Same rhythm everywhere.** Every region is dwell 55% then travel 45%, with sine easing. | `DWELL_RATIO` | Predictable pacing, like a slideshow with crossfades. |
| 9 | **Transitions are dolly moves.** Region changes are camera translations through fog. | `CameraRig` | Nothing marks the threshold: no gate, bridge, descent or doorway you pass through yourself. |
| 10 | **Flat materials.** Everything is Lambert with a tint. No rim light, normal detail, specular water, grading or depth of field. | `useModelParts` | Good for performance, but it reads "prototype" next to award-level work. |
| 11 | **Terrain is one low-poly sheet with vertex colours.** No paths worn into the ground, no cliffs, no texture detail up close. | `Terrain.tsx` | Close to the ground (which v2 needs), it will look bare. |
| 12 | **The grass doesn't react.** Blades sway with wind but ignore anything moving through them. | `GrassField.tsx` | A missed, cheap "wow" once there's a character. |

### 2.3 Technical debt that matters for v2
- **Triangle load** is 0.35M to 1.25M per view, because RegionSlot renders neighbours within 1.5 regions. A ground-level character camera sees less sky and more near detail, so v2 needs LODs and far-tree impostors, not just culling.
- **No physics or navigation.** Camera clearance is checked against a spline today. A walking character needs a navmesh or physics colliders.
- **Everything loads up front** (all models, about 4.3 MB, and all regions mounted). v2 should stream per region.
- **Scroll owns the page.** With free movement the page should not scroll in journey mode. The Codex scrolls instead, and page view stays a normal document.

---

## 3. Movement model (the key decision)

| | A. Guided scroll (v1, improved) | **B. Explore within regions, travel between them (recommended)** | C. Full free roam |
|---|---|---|---|
| Feel | Film | Adventure game | Open-world game |
| Input | Scroll | Click or tap to walk, WASD or stick, drag to look. Scroll optional for travel. | WASD and mouse look everywhere |
| Discovery | Low | High, within bounded, art-directed areas | Highest, but easy to miss things |
| Mobile | Excellent | Good (tap to walk, drag to look) | Poor (twin-stick on a phone is hard) |
| Getting lost | Impossible | Unlikely (bounded glade, visible exit) | Likely |
| Performance | Easy | Controllable (one region loaded, plus the next streaming) | Hard (whole world streaming) |
| Build cost | Low | Medium to high | High |

**Recommendation: B, "glades and roads".**
- **Each region is a walkable glade**, roughly 40 by 40 units, bounded naturally by trees, cliffs, water or cave walls rather than invisible walls. Inside it you walk freely with a third-person adventurer, look around, and interact.
- **Regions are joined by roads.** The road out of each glade is a physical threshold (a bridge, a gate, stairs down, a cave mouth). Walk into it and a short authored travel sequence plays: the character keeps walking, the camera pulls into a cinematic, and atmosphere blends as in v1. You arrive in the next glade in control again. This keeps v1's best asset, the continuous blended journey, but you trigger it yourself.
- **Scroll becomes "walk the road".** Scrolling (or holding W) on a road moves you along it, so trackpad users still get a flowing journey.
- **A waystone at each glade** (the dungeon pedestal) lets you fast-travel to any region you've already visited.

**Why B:** it delivers "walk through the sections like a game, take time to look around" without the two failure modes of free roam: people getting lost, and the phone experience collapsing. It also keeps the scope buildable. One glade is a contained level we can polish to award standard before copying the pattern.

---

## 4. The core loop

**Arrive, look, notice, interact, reward, record, move on.**

1. **Arrive.** Your own feet cross a threshold. A title card ("The Forge") fades in and out, diegetic and brief.
2. **Look.** You have free control. Ambient sound, motion and light pull your eye to three to six points of interest.
3. **Notice.** Interactables have a restrained tell: a faint shimmer, a firefly that circles them, a sound when you're near. There are no giant arrows. On approach, a small prompt appears ("E / tap: Open").
4. **Interact.** A physical action with an animation: a chest lid lifts, a book slides off a shelf and opens, a rock tips over, a crystal rings. The camera eases into a focus shot and the depth of field narrows.
5. **Reward.** The content is revealed in the world (the object glows, particles rise, a sound plays), and its HTML page is written into the Codex with an ink-writing animation.
6. **Record.** The Codex (section 5) counts progress per region, for example "Forge 3 of 5". Finding everything in a region lights its waystone.
7. **Move on.** The road out is always open, and completion is never required. A soft nudge (the raven lands on the road sign) suggests going on once you've found about half.

---

## 5. The Codex: the UI, the content and the accessibility layer

The site's title is its central mechanic. The visitor carries **The Adventurer's Codex**, a leather journal that is the entire UI.

- **Open it** with the book icon, the `C` key, or `Tab`. It's real HTML, rendered as a book spread over the dimmed, blurred world (the world pauses and the ambient sound goes muffled). Each discovered item is a page written in the same content components v1 uses today. That keeps the HTML canonical, selectable, indexable and screen-reader friendly.
- **Undiscovered pages** show as faint sketches with a hint ("Something glints under the stones by the stream"). Immersion first, but no one is ever stuck.
- **Map page.** A hand-drawn parchment map of the eight regions, with visited ones inked in, a fast-travel waystone on each, and a "you are here" marker.
- **Recruiter shortcut.** The Codex's first page, "About the author", is always written, and so is a "Read the whole Codex" link to page view. Page view is the same content as a plain one-page portfolio (unchanged from v1). Given the immersion-first decision, this is the one shortcut, but it's always one click away.
- **SEO:** the server still renders every page's HTML. Discovery only controls what the journal shows as written, not what exists in the DOM.

---

## 6. Region by region

Each region gets a glade layout, interactables (with the content they reveal), a signature moment, an entry threshold and its models. Content marked TODO still needs Quinton's real material (section 10).

### 1. The Misty Highlands (Hero)
- **Opening:** the Codex lies closed on a stone. Click to open it: the name and headline write themselves across the first page as the camera pulls back through the mist to the adventurer (you) standing up beside a cairn. **Signature moment:** the title literally written into the book that becomes your UI.
- **Tutorial by doing:** "Walk to the tablet" (teaches movement), "Read it" (teaches interaction: the tagline carves in). Three steps and you've learned the whole game.
- **Interactables:**
  - The tablet (tagline).
  - A traveller's pack (`Bag` or `Pouch_Large`): opens to the CV download and links.
  - A signpost: the eight region names, which unlocks the Codex map.
- **Threshold:** stone steps descending under the Archive arch (reuses v1's archway, now walked through).
- **Models:** as v1, plus `Bag`, `Pouch_Large`, and a signpost built from `Prop_WoodenFence_Single` and `Banner_1` (village and props kits).

### 2. The Ancient Archive (About)
- **Glade:** a sunken circular library you walk down into.
- **Interactables:**
  - Books that slide out of shelves and open in your hands (`Book_5`, `Book_7`, `BookGroup_*`). Each is an About paragraph: role, path, freelance, education.
  - The hanging scroll on the lectern (the full About).
  - A locked cabinet (`Cabinet`) holding "what drives me" (TODO), opened with a key (`Key_Metal`) found in a candle alcove. This is the region's small puzzle.
- **Signature moment:** light the candles. Each candle you click lights and reveals the next shelf aisle, so the room literally gets brighter as you learn about Quinton.
- **Threshold:** a heavy door (`Arch_Door`, dungeon) that swings open onto the heat of the Forge.
- **Models:** v1 set plus `Book_5`, `Book_7`, `BookGroup_*`, `Cabinet`, `Key_Metal`, `Chandelier`, `CandleStick`, `Scroll_2`, `Doors_RoundArch` (ruins).

### 3. The Forge (Skills)
- **Glade:** a working smithy on a lava shelf.
- **Interactables:**
  - Skill orbs lie cooling in the slag. Pick one up (the character uses its `PickUp` animation), carry it to the anvil, strike it (three hammer hits synced to sound), and it becomes a forged item on its group's weapon rack.
  - Each group's rack or pedestal shows that group's skills and evidence in the Codex (for example "NestJS: used to build ... at Uncommon").
  - Tools on the wall (`Pickaxe_Bronze`, `Axe_Bronze`, `Sword_Bronze`, `Shield_Wooden`): infrastructure and ways of working.
  - A potion shelf (`Shelf_Small_Bottles`, `Potion_*`): the AI/LLM group (TODO detail).
- **Signature moment:** the lava pool flares and the whole cave lights orange with each hammer strike (bloom, screen shake of about 2 px, a spray of embers, a deep clang).
- **Threshold:** a rope bridge over the lava channel (`BridgeSection` and `Rail_*`, ruins) into the forest.
- **Models:** v1 set plus `Pickaxe_Bronze`, `Axe_Bronze`, `Sword_Bronze`, `Shield_Wooden`, `Peg_Rack`, `Shelf_Small_Bottles`, `Potion_1/2/4`, `Bucket_Metal`, `Dummy` (training dummy, a light easter egg), `Anvil`.

### 4. The Enchanted Forest (Projects)
- **Glade:** a clearing ringed by the twisted project trees.
- **Interactables:**
  - At each project tree's roots sits a **chest** (`Chest_Wood`, which ships with `Chest_Open` and `Chest_Close` animations). Kneel and open it: the lid swings, light spills out, and the project's artifact rises (a miniature screen, scroll or model). The Codex writes the full project spread (role, problem, result, links; TODO content).
  - Fireflies drift toward the nearest unopened chest.
  - A ring of mushrooms hides a secret, such as a freelance project or a playful note.
- **Signature moment:** opening the last chest makes every lantern in the forest light at once, and the canopy parts for a moonbeam.
- **Threshold:** a path of lanterns climbing out of the trees onto the scree.
- **Models:** v1 set plus `Chest_Wood` (animated), `Lantern_Wall`, `Clover_*`, `Petal_*`, `Plant_1_Big`, `Plant_7_Big`, `Grass_Wispy_*`.

### 5. The Thundering Peaks (Problem solving)
- **This is where Quinton's "bugs under rocks" example belongs.**
- **Glade:** a switchback trail up the mountain, in three ledges (one per case).
- **Interactables:**
  1. **The problem:** a boulder is blocking the trail. Push or lever it over and a bug scuttles out (a stylized beetle; the model is needed, see section 9). Catch it and the problem is written into the Codex ("The bug: CSRF cookies across origins", TODO).
  2. **The approach:** the lanterns on this ledge light one by one as you walk past them, each a step of the approach.
  3. **The outcome:** at the ledge's end, light the beacon to write the outcome. Lightning strikes a nearby peak.
- **Signature moment:** the storm is live. Wind audio rises with altitude, snow thickens, and the final summit strike lights the whole range.
- **Threshold:** descend the far side to the water, where the path goes under the surface of a flooded stair.
- **Models:** v1 set plus `Pickaxe_Bronze` (lever), `Rope_*`, `BearTrap_Open` (a joke "trap" for a bug), and the bug creature (missing).

### 6. The Sunken Ruins (Experience)
- **Glade:** a flooded courtyard with a stepping-stone causeway.
- **Interactables:** each stepping stone is a year. Step on it and that milestone's tablet rises from the water beside you, with the date carved on it. Ripples come from your own footsteps, so the water surface reacts to the character.
  - The stag and fox statues each "speak" one line of career context when you face them, with a soft chime.
  - A gold chest (`Chest_Gold`, ruins) at the end holds "Now: Senior Developer".
- **Signature moment:** walking the causeway plays your career under your feet, and the camera rises to show the lit path as a timeline once you reach the end.
- **Threshold:** a dark archway (`Arch_Gothic`) with cobwebs, leading into the caves.
- **Models:** v1 set plus `Arch_Gothic`, `Floor_Diamond`, `Chest_Gold`, `Wall_ArchRound_Overgrown`, `Window_Bars_Overgrown`, `Bush_Round`, `Tree_1/2/3` (ruins).

### 7. The Crystal Caves (Testimonials)
- **Glade:** a tunnel that opens into a crystal chamber.
- **Interactables:** crystals hum as you approach (positional audio, rising pitch). Touch one and it rings. The quote appears as light refracting across the cave walls and is written into the Codex (real testimonials only; TODO).
- **Signature moment:** the chamber goes dark except for your character's lantern, and each crystal you touch stays lit. Light every one and the cave harmonises in a chord.
- **Threshold:** a tunnel rising toward firelight and night air.
- **Models:** v1 crystals (upgraded, section 8), plus `Torch` (dungeon), `Cobweb*`, `Skull` (one, as a joke), and `Trapdoor` for a secret.

### 8. The Campfire (Contact)
- **Glade:** the camp, the fire and the stars.
- **Interactables:**
  - Sit at the fire (a sit animation is needed, section 9) and the camera settles into a warm two-shot with the fire.
  - A writing desk by the tent (`Table_Small`, `Scroll_1`, `CandleStick`) opens the contact letter (the HTML form, styled as a letter).
  - Sealing it hands it to the raven, who flies off toward the moon (v1's flight, now a reward).
  - The Codex's last page summarises what you found ("You found 31 of 34 pages") with the page-view link.
- **Signature moment:** after sending, the camera slowly tilts up from the fire to the stars and the music resolves. It's an ending, and the credits (links and email) write themselves into the sky.
- **Models:** v1 set plus `Table_Small` (dungeon), `Stool`, `Mug`, `Rope_*`, `Bucket_Wooden_1`, `FarmCrate_*`, `Stall_Cart_Empty`.

---

## 7. Presence, camera and control

- **The adventurer:** `Character_Animated` (ultimate ruins pack, FBX) has Idle, Walk, Run, PickUp, Roll, Punch, Death and hit reactions. It needs FBX to glTF conversion (FBX2glTF, verified before install), retargeting of any extra clips (sit, open, push, kneel), and a region-appropriate tint. Its shadow and footsteps alone will transform the sense of scale.
- **Controls:**
  - Desktop: WASD or arrow keys, or click to walk. Drag or right-mouse to orbit the camera. E to interact. C to open the Codex. Shift to run.
  - Mobile: tap to walk, drag to look, tap an object to interact.
  - Gamepad: supported via the Gamepad API (cheap, and award juries notice it).
- **As built in V2.0:** a kinematic controller on the terrain heightfield with colliders generated automatically from the scene (see CLAUDE.md), which proved enough for the glades; a navmesh stays an option if click-to-walk needs real pathfinding around clutter.
- **Originally proposed:** a kinematic character controller over a navmesh (recast-navigation, WASM) or Rapier colliders (`@react-three/rapier`). Recommendation: **navmesh for walking plus simple sphere triggers for interaction**. It's lighter than full physics, and click-to-walk pathfinding comes free.
- **Camera:** a third-person spring arm (about 6 units back, shoulder offset, collision-aware so it never enters rocks). It is damped, leads slightly in the walking direction, and lowers when you're near objects. Focus shots on interaction blend in over 0.6 s with depth of field. Authored cinematics only for travel roads and signature moments.
- **World reacts to you:** grass bends away from the character (pass its position to the grass shader), water ripples at your feet, fireflies scatter and return, crows lift off when you walk near the cairn, and candles flicker as you pass.

---

## 8. Look and feel: getting to award standard

**Lighting and shading**
- A stylized lit shader (toon ramp with rim light) on `onBeforeCompile` over Lambert, which keeps the pack colours but adds form and silhouette.
- Region colour grading (LUT) in postprocessing: cold blue Peaks, warm amber Archive, teal Ruins.
- God rays through the Forest canopy and the Archive windows (screen-space, high tier only).
- Height fog, so valleys hold mist and peaks rise clear. This replaces the uniform FogExp2 and the plane mist sheets.
- Depth of field during focus shots and the Codex, and a subtle vignette.

**Materials**
- Water: reflective, with depth colour, foam around stones and the character, and normal-mapped ripples.
- Crystals: refraction (drei `MeshTransmissionMaterial` on high tier, emissive fallback on low), internal glow, sparkle.
- Lava: flowing noise shader with crust cells and heat haze over the pool.
- Fire: flipbook or shader flames instead of glow sprites, with a flickering point light that casts moving shadows.

**Terrain**
- Sculpted glades per region: worn dirt paths where the character walks, cliffs from stretched rock clusters, and a texture splat (grass, dirt, stone) with close-up detail.
- The v1 "terrain as one sheet" stays only as the far background.

**Motion and "juice"**
- Everything eases. Interactables bob or shimmer subtly. Rewards burst particles in the region's accent colour. The camera gets a tiny shake on impacts only.
- Transitions: the travel roads are the showcase, a 6 to 10 second authored shot with the character walking in silhouette and atmosphere and music crossfading.

**Sound (a new system, a large part of the upgrade)**
- Web Audio with positional sources (three `PositionalAudio`), a per-region ambient bed, footsteps per surface (grass, stone, wood, water), and interaction effects (chest creak, book page, anvil clang, crystal ring, raven caw).
- A music layer per region crossfading on the roads.
- Muted until the first interaction, with a clear toggle, remembered, and respecting reduced motion or reduced data.

**Loading as story**
- "Opening the Codex": the book's cover and a progress bar drawn as ink, while only the Highlands streams in. Other regions stream while you play.

---

## 9. Assets

### 9.1 Already downloaded (unused so far) and planned for v2
All CC0 (licence text checked in the props pack; the nature and ruins licences were checked in v1).
- **Fantasy Props MegaKit:** `Chest_Wood` (rigged, `Chest_Open` and `Chest_Close` animations), `Book_5`, `Book_7`, `BookGroup_*`, `Cabinet`, `Key_Gold`, `Key_Metal`, `Lantern_Wall`, `Chandelier`, `CandleStick`, `Potion_*`, `Shelf_Small_Bottles`, `Pickaxe_Bronze`, `Axe_Bronze`, `Sword_Bronze`, `Shield_Wooden`, `Peg_Rack`, `Dummy`, `Stool`, `Mug`, `Rope_*`, `Bucket_*`, `FarmCrate_*`, `Stall_Cart_Empty`, `Coin_Pile`, `Scroll_2`, `Banner_*`.
- **Ultimate Modular Ruins Pack:** `Character_Animated` (Idle, Walk, Run, PickUp, Roll and more), `Chest`, `Chest_Gold`, `BridgeSection`, `Rail_*`, `Arch_Gothic`, `Doors_*`, `Floor_*`, `Bush_*`, `Tree_1/2/3`, `BearTrap_*`, `Skull`, `Trapdoor`, `Window_Bars_*`.
- **Updated Modular Dungeon:** `Arch_Door` (and a bottom-pivot variant for swinging), `Trapdoor_open`, `Table_Small`, `Table_Big`, `Chair`, `Banner_wall`, `Statue_Horse`, `Bag_Coins`, `Torch`.
- **Medieval Village MegaKit:** fences and posts for signposts, `Prop_Support`, stairs. Also walls, doors and roofs if we want a small hut at the Campfire instead of the cone tent.

### 9.2 Still needed (Quinton to source)
Requirements for everything: **CC0 or a licence allowing commercial use without attribution, low poly, glTF/GLB or FBX, in the same stylized flat-colour look as the Quaternius packs.** Quaternius and Kenney both publish CC0 work in this style; check each item's licence before downloading.

| Need | Used for | Notes |
|---|---|---|
| Bug or beetle creatures, 2 to 3 variants, **animated** (idle, scuttle) | Peaks "bugs under rocks" | The biggest gap. Rigged insects or small critters. |
| Extra character animations: sit, kneel or open, push, interact | Campfire sit, chest opening, boulder push | Ideally for the same `CharacterArmature` rig, or a compatible humanoid animation set to retarget. |
| A raven or crow, rigged, with fly and idle | Campfire, Highlands crows | v1's raven is primitives. |
| A tent (or build a hut from village parts) | Campfire | The village kit can cover this. |
| Large rock formations or cliffs | Glade boundaries, Peaks | Can be approximated by stacking `Rock_Medium`. |
| Crystal cluster models | Caves | Optional; shader-upgraded octahedrons may do. |
| **Audio:** ambient beds (moor wind, library hush, forge roar, forest night, storm, water, cave drip, fire crackle), footsteps on 4 surfaces, about 15 interaction sounds, 8 short music loops | Everything | CC0 or royalty-free with commercial use. Audio matters as much as any model. |
| Parchment and leather textures, and an ink-style display font with a licence for web use | The Codex UI | A free Google Font can cover the font. |

Nothing in the plan depends on a specific store or pack beyond the ones already downloaded and checked.

---

## 10. Content needed from Quinton

The discovery mechanics only land if what you discover is real. These were TODOs in v1 and now matter more:
1. **Three to five "bugs I've faced"** (problem, approach, outcome), one per Peaks ledge. Candidates from the CV: CSRF cookie auth across origins, EcoCash/Paynow callback verification, MentorMatch capacity-aware allocation, the 15% refactor, four-layer RBAC.
2. **Project write-ups** for each chest: problem, role, result and a visual (screenshot or short clip) for the artifact that rises out.
3. **Real testimonials**, with names and relationships, for the crystals.
4. "What drives me", for the locked cabinet.
5. Optional: a few personal easter eggs (hobbies, a favourite tool, a joke) for the secret spots.

---

### 10.1 Where to find each piece of content

| Content | Where to look | What to pull out | Goes in |
|---|---|---|---|
| **Bugs you've faced** (Peaks, 3 to 5) | Your own git history and pull requests on the Uncommon and freelance repos (search commit messages for "fix", "bug", "hotfix"); GitHub Issues or your team's ticket tracker; incident or post-mortem notes; Slack or Teams threads where you debugged something; code review comments; the five CV candidates above | The symptom (what broke, who it hurt), the root cause, what you tried, the fix, and the outcome (only numbers you can stand behind) | `content/problems.ts` |
| **Project write-ups** (Forest chests, 6) | Each repo's README and docs; product briefs or specs; release notes or changelogs; your own notes; the live apps and staging sites for screenshots; stakeholder emails confirming results | Problem, your role, stack, key decisions, result, public links, one screenshot or short screen recording per project | `content/projects.ts`; images in `public/projects/<id>/` |
| **Testimonials** (Caves crystals) | LinkedIn (your profile, Recommendations section, and ask for new ones there); your managers and team leads at Uncommon; the Revixions contact; the BioDive UAE client; mentees or learners you supported; freelance clients' emails or reviews | The quote verbatim, the person's name and role, how you worked together, and their permission to publish it | `content/testimonials.ts` |
| **What drives you** (Archive cabinet) | You. Your LinkedIn About section, past cover letters or personal statements can be a starting point | One or two honest sentences | `content/about.ts` |
| **AI/LLM skill evidence** (Forge potion shelf) | The project or repo where you integrated an LLM; its README or PR | What you built with it and where | `content/skills.ts` |
| **Easter eggs** (optional secret spots) | You: hobbies, a favourite tool, a running joke from work | A few short lines | new `content/secrets.ts` (added in V2.4+) |

### 10.2 Where to look for the missing assets

Always check the licence on each individual model before downloading. Some sites mix licences per model.

| Asset | Where to look | Licence to check | Notes |
|---|---|---|---|
| Animated bugs or beetles | quaternius.com (animal and creature packs); poly.pizza (search "beetle", "bug", "insect"); kenney.nl | Quaternius and Kenney publish CC0; Poly Pizza varies per model (CC0 or CC-BY) | Need idle and scuttle animations. If none fit, a static beetle with procedural leg wiggle is a fallback. |
| Extra character animations (sit, kneel or open, push) | mixamo.com (free with an Adobe account); quaternius.com (animated character packs) | Mixamo: free to use in projects, but raw files can't be redistributed (fine for a built site) | Mixamo clips must be retargeted to the `CharacterArmature` rig; I'll handle retargeting. Download as FBX, "without skin". |
| Raven or crow (rigged, fly and idle) | quaternius.com (animal packs); poly.pizza | As above | Any low-poly bird with a flap cycle works. |
| Cliffs and large rock formations | Already covered by stacking the nature kit's rocks; kenney.nl nature kits if more are needed | CC0 | Optional. |
| Parchment and leather textures (Codex UI) | ambientcg.com; polyhaven.com (textures) | Both CC0 | 1K or 2K is plenty. |
| Ink-style display font | fonts.google.com | SIL Open Font License | I can pick a candidate for you to approve. |
| Audio (later, muted for now) | freesound.org (filter by CC0); kenney.nl (audio packs, CC0); sonniss.com (the free "GameAudioGDC" bundles, royalty free) | Freesound varies per sound; filter to CC0 | Not needed until sound is switched on. |

## 11. Architecture for v2

- **State:** Zustand stores for `player` (position, region, state machine: idle, walk, interact, travel, seated), `discoveries` (a set of item ids, persisted to localStorage so returning visitors keep their Codex), `codex` (open state and current page), `audio` and `settings`.
- **Interaction system:** a single `<Interactable id region radius prompt onInteract>` wrapper. It registers a trigger, shows the prompt, drives the focus shot and writes the discovery. Every region uses it, so each new interaction is only content plus animation.
- **Regions as levels:** each region module exports a glade (the walkable area and navmesh source), its interactables, a road (the travel spline to the next region) and its ambience. Regions are code-split with `next/dynamic`. The current and next region are loaded and older ones disposed.
- **Content stays in `content/*.ts`.** Each item gets an `id` that interactables reference. The Codex renders the same section components v1 already has.
- **Rendering budget** (target 60 fps on integrated graphics at 1080p): at most 400k triangles and 150 draw calls in view, LODs for trees and rocks, far-tree impostors (billboards baked from the models), KTX2 textures (through gltf-transform, which the pipeline already uses), one shadow-casting light with a tight frustum around the player.
- **Library candidates** (each to be verified for version compatibility with R3F 9 and React 19 before installing):
  - `@react-three/rapier` or `recast-navigation` for movement
  - drei's `KeyboardControls` and `PositionalAudio`
  - FBX2glTF for the character conversion
  - `postprocessing` effects already in use (DoF, god rays, LUT)
- **What gets retired:** `ScrollDriver` as the master driver, the GSAP master timeline (kept only for the travel roads), the fixed floating panels, and the spline camera outside roads.

---

## 12. Accessibility and fallbacks, with immersion first

- **Page view** is unchanged, with all content present. The world is optional.
- **Keyboard:** full play with the keyboard. Every interactable can be tabbed to through an off-screen list of "nearby things" (the world canvas stays `aria-hidden`), and the Codex is fully keyboard navigable.
- **Reduced motion:** movement becomes point-and-teleport with fades, and there are no camera cinematics, shake, or lightning flashes. The Peaks storm is audio only.
- **Low-end or no WebGL:** the device tiers from v1 still pick page view automatically on weak GPUs.
- **Screen readers:** interacting announces "Page written: MentorMatch" through a live region, and the Codex is semantic HTML.
- **Motion sickness:** moderate FOV (55 to 60), no head bob, damped camera, and an option to disable camera cinematics.

---

## 13. Roadmap

Each phase ends with a review, as in v1.

| Phase | Goal | Output |
|---|---|---|
| **V2.0 Foundation** (done) | The adventurer walks | Character converted and animated, controller with navmesh, spring-arm camera, input (keys, click, touch), a test glade |
| **V2.1 Interaction and Codex** (done) | The loop works | `Interactable`, focus shots, the Codex UI (HTML book, map, progress), discovery persistence, audio engine with placeholder sounds |
| **V2.2 Vertical slice: the Forest** | One region at award quality | Chests with animations, sculpted glade, stylized shader, grading, grass reacting to the character, sound. This is the proof. |
| **V2.3 Roads** | Continuous world | Travel cinematics between glades, region streaming, waystones and fast travel |
| **V2.4 to V2.10** | Remaining regions, in journey order | Each region's interactables, signature moment and threshold |
| **V2.11 Polish** | Awards pass | Loading story, music, gamepad, performance budget, accessibility audit, mobile tuning, credits |

**The vertical slice (V2.2) is the key checkpoint.** If walking through the Forest and opening chests doesn't feel great, we adjust before building the other seven.

---

## 14. Risks

| Risk | Mitigation |
|---|---|
| Recruiters won't play | Page view is one click from everywhere; the Codex's first page is always written; the opening takes under 15 s |
| Mobile controls feel bad | Tap to walk is the primary mobile input, tested on real phones in V2.0 |
| Performance on integrated GPUs | Per-region streaming, LOD and impostors, a hard triangle budget, lite mode kept |
| Scope creep | The vertical slice gates everything; each region is capped at five or six interactables |
| Art inconsistency from mixed packs | Keep to the Quaternius style; the shared shader and grading unify colours |
| Missing content makes discoveries hollow | Section 10 content is needed before the relevant region phase |

---

## 15. How v2 answers the award criteria

- **Design:** a unified stylized look (shader and grading), strong silhouettes, ground-level composition, and the Codex as a crafted, tactile UI.
- **Usability:** three-step tutorial, tap to walk, always-available Codex and page view, keyboard and gamepad, reduced motion.
- **Creativity:** the portfolio *is* the game's journal. Discovering the author's work is the gameplay, and bugs under rocks is literal.
- **Content:** real work, surfaced through real actions. Opening a chest to see a project makes the project memorable.
- **Signature moments** (what people share):
  1. The title writing itself into the Codex as the mist clears.
  2. The anvil strike lighting the Forge.
  3. Every lantern in the Forest lighting when the last chest opens.
  4. Walking your career across the flooded causeway.
  5. The crystal chord in the dark.
  6. The raven carrying your letter to the moon.

---

## 16. Answered questions

1. Movement model B: **approved**.
2. Vertical slice: **the Forest** (left to Claude).
3. Discoveries persist between visits: **yes**.
4. Sound: **muted for now**.
5. Content: sourcing guide in section 10.1, assets in section 10.2. The Peaks bugs and the project write-ups unlock the two most distinctive regions, so those are the most valuable to gather first.
