"use client";

import { useEffect, useMemo, useState } from "react";
import { LITE_SHARE, useLite } from "@/lib/lite";
import { BufferAttribute, BufferGeometry, Color, DoubleSide, MeshLambertMaterial } from "three";
import { mulberry32, between } from "@/lib/random";
import { groundHeight } from "@/lib/terrain";
import type { RegionConfig } from "@/lib/types";
import { windSway } from "@/lib/wind";
import { Scatter, type Placement } from "./Scatter";

/** Grass bends from the root, most at the tip. */
const GRASS_WIND = windSway(0, 0.3);

/**
 * One tapered blade: five vertices, three triangles, darker at the root and
 * lighter at the tip (vertex colours), pivot at the root.
 */
function bladeGeometry(root: Color, tip: Color) {
  const w = 0.045;
  const h = 0.55;
  const positions = new Float32Array([-w, 0, 0, w, 0, 0, -w * 0.6, h * 0.5, 0.02, w * 0.6, h * 0.5, 0.02, 0, h, 0.06]);
  const mid = root.clone().lerp(tip, 0.55);
  const colors = new Float32Array([...root.toArray(), ...root.toArray(), ...mid.toArray(), ...mid.toArray(), ...tip.toArray()]);
  const geometry = new BufferGeometry()
    .setAttribute("position", new BufferAttribute(positions, 3))
    .setAttribute("color", new BufferAttribute(colors, 3))
    .setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A field of grass blades over a region's terrain: thousands of instances in
 * one draw call, each a slightly different height, lean and tone, all
 * swaying in the wind. Receives shadows; doesn't cast (too fine to matter).
 */
export function GrassField({
  region,
  count,
  area,
  root,
  tip,
  seed = 1,
  keep = () => true,
}: {
  region: RegionConfig;
  count: number;
  /** Region-local bounds: [minX, maxX, minZ, maxZ]. */
  area: readonly [number, number, number, number];
  root: string;
  tip: string;
  seed?: number;
  keep?: (x: number, z: number) => boolean;
}) {
  const [geometry] = useState(() => bladeGeometry(new Color(root), new Color(tip)));
  const [material] = useState(() => {
    const m = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide });
    return Object.assign(m, GRASS_WIND);
  });
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const lite = useLite();
  const target = lite ? Math.round(count * LITE_SHARE) : count;
  const blades = useMemo(() => {
    const rng = mulberry32(seed);
    const items: Placement[] = [];
    let attempts = 0;
    while (items.length < target && attempts++ < target * 3) {
      const x = between(rng, area[0], area[1]);
      const z = between(rng, area[2], area[3]);
      if (!keep(x, z)) continue;
      const h = between(rng, 0.7, 1.5);
      items.push({
        position: [x, groundHeight(region.center[0] + x, region.center[2] + z) - 0.03, z],
        rotation: [between(rng, -0.25, 0.25), rng() * Math.PI * 2, between(rng, -0.25, 0.25)],
        scale: [between(rng, 0.8, 1.3), h, 1],
      });
    }
    return items;
  }, [region, target, area, seed, keep]);

  return (
    <Scatter items={blades} vary={0.25} receiveShadow userData={{ walkThrough: true }}>
      <primitive object={geometry} attach="geometry" />
      <primitive object={material} attach="material" />
    </Scatter>
  );
}
