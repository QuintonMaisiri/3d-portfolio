"use client";

/**
 * The Misty Highlands with real models (Quaternius Stylized Nature MegaKit,
 * CC0). Same exports as ../placeholders/highlands; the story pieces (tablet,
 * mist, crows) stay custom.
 */
import { Suspense } from "react";
import type { Placement } from "@/components/world/Scatter";
import { Model, ModelMix, type ModelLook } from "@/components/world/ModelScatter";
import { MODELS } from "@/lib/models";
import { windSway } from "@/lib/wind";
import type { GroupProps } from "../placeholders/common";

export { Crows, MistSheet, StoneTablet, type CrowsHandle, type StoneTabletHandle } from "../placeholders/highlands";

/** Cool grey moor stone. */
const STONE_LOOK: ModelLook = { other: "#cfd2cb" };
/** Bushes cooled and pulled toward heather purple; flowers keep their own colours. */
const HEATHER_LOOK: ModelLook = { foliage: "#c4a6cc", other: "#b8a8bc", wind: windSway(0.1, 0.06) };
const FLOWER_LOOK: ModelLook = { foliage: "#e8dcea", other: "#d8d0d8", wind: windSway(0.1, 0.1) };
/** Bare trees, silvered by the mist. */
const DEAD_TREE_LOOK: ModelLook = { other: "#bdbab4", wind: windSway(3, 0.01) };

/** Pack rocks are ~3.2 across; the scatter scales were tuned for a boulder ~2 across. */
const ROCK_SCALE = 0.62;

export function Rocks({ items }: { items: readonly Placement[]; color?: string }) {
  return (
    <Suspense fallback={null}>
      <ModelMix urls={MODELS.rocks} items={items} look={STONE_LOOK} scale={ROCK_SCALE} />
    </Suspense>
  );
}

/** Menhirs: a rock drawn up tall and thin (about 0.9 x 3.4 x 0.6 at scale 1). */
export function StandingStones({ items }: { items: readonly Placement[] }) {
  return (
    <Suspense fallback={null}>
      <ModelMix urls={[MODELS.rocks[1]!]} items={items} look={STONE_LOOK} scale={[0.3, 1.8, 0.25]} />
    </Suspense>
  );
}

/**
 * Heather: purple-tinted bushes with flower clumps among them. Items arrive
 * squashed in y (tuned for mounds), which the per-model scale undoes.
 */
export function Heather({ items }: { items: readonly Placement[] }) {
  const flowers = items.filter((_, k) => k % 3 === 0);
  const bushes = items.filter((_, k) => k % 3 !== 0);
  return (
    <Suspense fallback={null}>
      <ModelMix urls={[MODELS.bush]} items={bushes} look={HEATHER_LOOK} scale={[0.42, 0.93, 0.42]} castShadow={false} solid={false} />
      <ModelMix urls={MODELS.flowers} items={flowers} look={FLOWER_LOOK} scale={[0.4, 0.89, 0.4]} castShadow={false} solid={false} />
    </Suspense>
  );
}

/** Flat stepping stones marking the trail onward (~1.1 across). */
export function TrailStones({ items }: { items: readonly Placement[] }) {
  return (
    <Suspense fallback={null}>
      <ModelMix urls={MODELS.pathStones} items={items} look={STONE_LOOK} castShadow={false} />
    </Suspense>
  );
}

/** A few bare trees far back in the mist, for silhouette. */
export function DeadTrees({ items }: { items: readonly Placement[] }) {
  return (
    <Suspense fallback={null}>
      <ModelMix urls={MODELS.deadTrees} items={items} look={DEAD_TREE_LOOK} castShadow={false} />
    </Suspense>
  );
}

const CAIRN = [
  { y: 0, s: 0.9 },
  { y: 0.95, s: 0.7 },
  { y: 1.65, s: 0.55 },
  { y: 2.2, s: 0.42 },
  { y: 2.6, s: 0.3 },
];

/** A traveller's cairn: stacked rocks, largest at the bottom (each base sits a little into the one below). */
export function Cairn(props: GroupProps) {
  return (
    <Suspense fallback={null}>
      <group {...props}>
        {CAIRN.map((st, i) => (
          <Model
            key={i}
            url={MODELS.rocks[i % 3]!}
            look={STONE_LOOK}
            position={[(i % 2) * 0.08, st.y, 0]}
            rotation={[0.05 * (i % 2), i * 1.7, -0.04 * (i % 3)]}
            scale={[0.62 * st.s, 0.5 * st.s, 0.62 * st.s]}
          />
        ))}
      </group>
    </Suspense>
  );
}
