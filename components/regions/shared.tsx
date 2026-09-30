"use client";

import { useFrame, type RootState } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode } from "react";
import type { Group } from "three";
import { clearOfCamera } from "@/lib/cameraPath";
import { mulberry32, between } from "@/lib/random";
import { applyShadowFlags } from "@/lib/shadows";
import { useCodex } from "@/lib/store";
import { shaderCompile, useRegionMounted } from "@/lib/streaming";
import { groundHeight } from "@/lib/terrain";
import { distanceTo } from "@/lib/timeline";
import type { RegionConfig, Vec3 } from "@/lib/types";
import type { Placement } from "@/components/world/Scatter";

/** Regions further than this (in regions) from the camera are hidden and frozen. */
export const VISIBLE_RANGE = 1.5;

/**
 * Positions a region at its centre. Its scenery is only built while the
 * camera is near (see lib/streaming), and hidden (skipping render and its
 * frame callbacks via useRegionFrame) unless it's close enough to be seen.
 */
export function RegionSlot({ region, children }: { region: RegionConfig; children: ReactNode }) {
  const ref = useRef<Group>(null);
  const mounted = useRegionMounted(region.index);
  useFrame(() => {
    if (ref.current) ref.current.visible = distanceTo(region.index) < VISIBLE_RANGE;
  });
  // Newly built scenery: shadow flags for its primitives (models set their own), and compile its shaders ahead of view.
  useEffect(() => {
    if (!mounted || !ref.current) return;
    applyShadowFlags(ref.current);
    shaderCompile.requested = true;
  }, [mounted]);
  return (
    <group ref={ref} position={[region.center[0], 0, region.center[2]]}>
      {mounted ? children : null}
    </group>
  );
}

/** useFrame that only runs while the region is near the camera. */
export function useRegionFrame(region: RegionConfig, callback: (state: RootState, delta: number) => void) {
  useFrame((state, delta) => {
    if (distanceTo(region.index) < VISIBLE_RANGE) callback(state, delta);
  });
}

/** Ambient motion (bobbing, flicker, drift) is off under prefers-reduced-motion. */
export const ambientMotion = () => !useCodex.getState().reducedMotion;

/** Terrain height at a point given in region-local x/z. */
export const groundAt = (region: RegionConfig) => (x: number, z: number) =>
  groundHeight(region.center[0] + x, region.center[2] + z);

/** Props never stand closer than this to the camera's route (ground plane). */
export const CAMERA_CLEARANCE = 4;

/**
 * Deterministic scatter of props around a region, sitting on the terrain.
 * Spots near the camera's route are always rejected; `keep` can reject more.
 */
export function scatter(
  region: RegionConfig,
  {
    seed,
    count,
    area,
    scale: [minScale, maxScale],
    sink = 0,
    tilt = 0.4,
    keep = () => true,
  }: {
    seed: number;
    count: number;
    /** Local bounds: [minX, maxX, minZ, maxZ]. */
    area: readonly [number, number, number, number];
    scale: readonly [number, number];
    /** How far to push each prop into the ground, as a fraction of its scale. */
    sink?: number;
    /** Maximum lean in radians. Keep tall props (trees) near upright, or their tops swing into the camera's path. */
    tilt?: number;
    keep?: (x: number, z: number) => boolean;
  },
): Placement[] {
  const rng = mulberry32(seed);
  const ground = groundAt(region);
  const items: Placement[] = [];
  let attempts = 0;
  while (items.length < count && attempts++ < count * 20) {
    const x = between(rng, area[0], area[1]);
    const z = between(rng, area[2], area[3]);
    if (!keep(x, z) || !clearOfCamera(region.center[0] + x, region.center[2] + z, CAMERA_CLEARANCE)) continue;
    const s = between(rng, minScale, maxScale);
    const position: Vec3 = [x, ground(x, z) - s * sink, z];
    items.push({ position, rotation: [rng() * tilt, rng() * Math.PI * 2, rng() * tilt], scale: s });
  }
  return items;
}
