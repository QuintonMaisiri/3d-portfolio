import { groundHeight } from "./terrain";

/**
 * Flat surfaces the adventurer stands on above the terrain: the Ruins
 * lagoon (waded knee-deep), raised floors. Circles on the ground plane.
 */
interface Surface {
  x: number;
  z: number;
  radius: number;
  /** Height the adventurer's feet rest at inside it. */
  y: number;
}

const surfaces = new Map<string, Surface>();

export const registerSurface = (id: string, surface: Surface) => {
  surfaces.set(id, surface);
  return () => void surfaces.delete(id);
};

/** Where the adventurer's feet rest at (x, z): the terrain, or a surface above it. */
export function floorAt(x: number, z: number) {
  let y = groundHeight(x, z);
  for (const s of surfaces.values()) if (s.y > y && Math.hypot(x - s.x, z - s.z) < s.radius) y = s.y;
  return y;
}
