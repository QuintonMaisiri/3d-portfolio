import { smoothstep } from "./journey";
import { regions } from "./regions";

const centers = regions.map((r) => r.center);

export interface PathSample {
  /** x of the path's centre line. */
  x: number;
  /** Ground baseline. */
  base: number;
  /** Region before this z, and how far (0..1) toward the next. */
  index: number;
  mix: number;
}

/**
 * The path's centre line and ground baseline at a given z. Flat around each
 * region centre, blending between neighbours halfway along each stretch.
 */
export function pathAt(z: number): PathSample {
  for (let i = 0; i < centers.length - 1; i++) {
    const a = centers[i]!;
    const b = centers[i + 1]!;
    if (z > a[2]) return { x: a[0], base: a[1], index: i, mix: 0 };
    if (z >= b[2]) {
      const s = smoothstep(0.2, 0.8, (a[2] - z) / (a[2] - b[2]));
      return { x: a[0] + (b[0] - a[0]) * s, base: a[1] + (b[1] - a[1]) * s, index: i, mix: s };
    }
  }
  const last = centers[centers.length - 1]!;
  return { x: last[0], base: last[1], index: centers.length - 1, mix: 0 };
}

/**
 * Terrain height. A gentle walkable valley along the path, rising into hills
 * on either side, with low-frequency undulation so it reads as landscape.
 */
export function groundHeight(x: number, z: number): number {
  const { x: px, base } = pathAt(z);
  const d = Math.abs(x - px);
  const banks = smoothstep(8, 34, d) * (6 + 3 * Math.sin(z * 0.045 + x * 0.02));
  const roll =
    Math.sin(x * 0.21 + z * 0.07) * 0.9 +
    Math.sin(x * 0.07 - z * 0.13) * 1.3 +
    Math.sin(x * 0.53 + z * 0.41) * 0.25;
  return base + banks + roll * (0.25 + 0.75 * smoothstep(5, 22, d));
}
