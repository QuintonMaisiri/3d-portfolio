"use client";

/**
 * The Storm Peaks with real models on the slopes (Quaternius Stylized Nature
 * MegaKit, CC0). Same exports as ../placeholders/peaks; the climbable
 * mountains, beacons, clouds, snow and lightning stay custom.
 */
import { forwardRef, Suspense } from "react";
import { BufferAttribute, BufferGeometry, type Points } from "three";
import type { Placement } from "@/components/world/Scatter";
import { ModelMix, type ModelLook } from "@/components/world/ModelScatter";
import { MODELS } from "@/lib/models";
import { regionById } from "@/lib/regions";
import { windSway } from "@/lib/wind";
import { SoftPointsMaterial, useGeometry } from "../placeholders/common";
import { FAR_PINE_MODELS, ModelWoodland, PINE_MODELS } from "./woodland";

export { GlowPoints as ClimbMarkers } from "../placeholders/forge";
export {
  Bolt,
  Clouds,
  Mountain,
  MountainRange,
  Snow,
  type BoltHandle,
} from "../placeholders/peaks";

/** Full glow size of a lit summit beacon. */
export const BEACON_SIZE = 4.5;

/**
 * A signal fire on a summit: one soft glow. Starts dark; the region sets its
 * material's opacity and size as the case's climb completes.
 */
export const Beacon = forwardRef<Points, { color: string; position: readonly [number, number, number] }>(function Beacon(
  { color, position },
  ref,
) {
  const geometry = useGeometry(() => new BufferGeometry().setAttribute("position", new BufferAttribute(new Float32Array(position), 3)));
  return (
    <points ref={ref} geometry={geometry}>
      <SoftPointsMaterial color={color} size={BEACON_SIZE} opacity={0} additive />
    </points>
  );
});

/** Cold storm light: frosted needles, blue-grey stone. */
const PINE_LOOK: ModelLook = { foliage: "#b4c6c8", other: "#a8a4a4", wind: windSway(2, 0.05) };
const STONE_LOOK: ModelLook = { other: "#b8bec8" };
const DEAD_TREE_LOOK: ModelLook = { other: "#a8a8ac", wind: windSway(3, 0.015) };

export function Rocks({ items }: { items: readonly Placement[]; color?: string }) {
  return (
    <Suspense fallback={null}>
      <ModelMix urls={MODELS.rocks} items={items} look={STONE_LOOK} scale={0.62} />
    </Suspense>
  );
}

/** Wind-bent pines on the lower slopes. */
export function Pines({ items }: { items: readonly Placement[] }) {
  return <ModelWoodland region={regionById.peaks} items={items} look={PINE_LOOK} models={PINE_MODELS} farModels={FAR_PINE_MODELS} />;
}

/** Lightning-struck bare trees. */
export function DeadTrees({ items }: { items: readonly Placement[] }) {
  return (
    <Suspense fallback={null}>
      <ModelMix urls={MODELS.deadTrees} items={items} look={DEAD_TREE_LOOK} castShadow={false} />
    </Suspense>
  );
}
