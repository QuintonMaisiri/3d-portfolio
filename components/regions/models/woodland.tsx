"use client";

import { Suspense } from "react";
import { type Placement } from "@/components/world/Scatter";
import { ModelScatter, type ModelLook } from "@/components/world/ModelScatter";
import { clearOfCamera } from "@/lib/cameraPath";
import { LITE_SHARE, useLite } from "@/lib/lite";
import type { RegionConfig } from "@/lib/types";

const MODELS = "/models/forest";
/** Common trees and pines from the Stylized Nature MegaKit (CC0). */
export const WOODLAND_MODELS = [
  ...[1, 2, 3, 4, 5].map((n) => `${MODELS}/common-tree-${n}.glb`),
  ...[1, 2, 3, 4, 5].map((n) => `${MODELS}/pine-${n}.glb`),
];

/** Pines only, for the high slopes. */
export const PINE_MODELS = [1, 2, 3, 4, 5].map((n) => `${MODELS}/pine-${n}.glb`);
export const FAR_PINE_MODELS = [1, 2, 4, 5].map((n) => `${MODELS}/pine-${n}.glb`);

/** The lightest variants (about 1,300 to 3,400 triangles each), used for distant trees deep in the fog. */
export const FAR_MODELS = [
  `${MODELS}/common-tree-3.glb`,
  `${MODELS}/common-tree-5.glb`,
  `${MODELS}/pine-1.glb`,
  `${MODELS}/pine-2.glb`,
  `${MODELS}/pine-4.glb`,
  `${MODELS}/pine-5.glb`,
];

/** Pack trees are ~7 to 9 units tall; the scatter scales were tuned for ~6. */
const TREE_SCALE = 0.85;
/** Model crowns are ~2.8 units across, so trees keep this far from the camera's route (else they're dropped). */
const CLEARANCE = 6;
/** Only trees this close to the resting camera cast shadows; further out, fog hides the difference. */
const SHADOW_RADIUS = 32;

const scaled = (it: Placement, k: number): Placement => {
  const s = it.scale ?? 1;
  return { ...it, scale: typeof s === "number" ? s * k : ([s[0] * k, s[1] * k, s[2] * k] as const) };
};

/**
 * A woodland made entirely of real tree models, spread across the variants.
 * Trees too close to the camera's route are left out rather than replaced.
 * Nothing renders until the models have loaded (a moment after page load).
 */
export function ModelWoodland({
  region,
  items,
  look,
  models = WOODLAND_MODELS,
  farModels = FAR_MODELS,
}: {
  region: RegionConfig;
  items: readonly Placement[];
  look: ModelLook;
  models?: readonly string[];
  farModels?: readonly string[];
}) {
  const lite = useLite();
  const camX = region.waypoint.position[0] - region.center[0];
  const camZ = region.waypoint.position[2] - region.center[2];
  const kept = items.filter((it) => clearOfCamera(region.center[0] + it.position[0], region.center[2] + it.position[2], CLEARANCE));
  const near = kept.filter((it) => Math.hypot(it.position[0] - camX, it.position[2] - camZ) < SHADOW_RADIUS);
  // Lite: only a share of the distant trees, and near trees use the light models too.
  const farAll = kept.filter((it) => !near.includes(it));
  const far = lite ? farAll.filter((_, k) => k % Math.round(1 / LITE_SHARE) === 0) : farAll;
  const split = (list: readonly Placement[], models: readonly string[], m: number) =>
    list.filter((_, k) => k % models.length === m).map((it) => scaled(it, TREE_SCALE));

  const nearModels = lite ? farModels : models;

  return (
    <Suspense fallback={null}>
      {nearModels.map((url, m) => (
        <ModelScatter key={`near-${url}`} url={url} items={split(near, nearModels, m)} look={look} />
      ))}
      {farModels.map((url, m) => (
        // Distant trees: lightest models, no shadow pass.
        <ModelScatter key={`far-${url}`} url={url} items={split(far, farModels, m)} look={look} castShadow={false} />
      ))}
    </Suspense>
  );
}
