"use client";

/**
 * The Crystal Caves with real rock models (Quaternius Stylized Nature
 * MegaKit, CC0). Same exports as ../placeholders/caves; the crystals, spores
 * and the stalactites (clean cones read right for those) stay custom.
 */
import { Suspense, useMemo } from "react";
import { Euler, Vector3 } from "three";
import type { Placement } from "@/components/world/Scatter";
import { ModelMix, type ModelLook } from "@/components/world/ModelScatter";
import { MODELS } from "@/lib/models";

export { Crystal, CrystalShards, GlowPoints, Stalactites, Stalagmites } from "../placeholders/caves";

/** Violet-dark cave stone. */
const CAVE_LOOK: ModelLook = { other: "#6a5c8c" };
/** Pack rocks are ~3.2 across; placements were tuned for a boulder 2 across. */
const ROCK_SCALE = 0.62;
/** Height of the pack rocks' centre above their base pivot, model units. */
const ROCK_CENTRE = 0.87;

/**
 * Rough cave walls and ceiling. Placements were laid out for centred
 * boulders with any rotation, so each is shifted to put the model's centre
 * (not its base) on the spot, keeping the tunnel the size it was designed.
 */
export function CaveRock({ items }: { items: readonly Placement[] }) {
  const centred = useMemo(() => {
    const lift = new Vector3();
    const euler = new Euler();
    return items.map((it) => {
      const s = typeof it.scale === "number" ? it.scale : (it.scale?.[1] ?? 1);
      euler.set(...((it.rotation ?? [0, 0, 0]) as [number, number, number]));
      lift.set(0, ROCK_CENTRE * ROCK_SCALE * s, 0).applyEuler(euler);
      return { ...it, position: [it.position[0] - lift.x, it.position[1] - lift.y, it.position[2] - lift.z] as const };
    });
  }, [items]);
  return (
    <Suspense fallback={null}>
      <ModelMix urls={MODELS.rocks} items={centred} look={CAVE_LOOK} scale={ROCK_SCALE} castShadow={false} />
    </Suspense>
  );
}
