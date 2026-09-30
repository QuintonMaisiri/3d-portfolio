import { Vector3 } from "three";
import { smoothstep } from "./journey";
import { REGION_COUNT, REGION_SPACING, regions } from "./regions";
import { groundHeight, pathAt } from "./terrain";
import type { RegionId } from "./types";

/** The adventurer, in world units. The pack model is 2.82 tall; scaled to about 2. */
export const PLAYER = {
  scale: 0.71,
  height: 2,
  /** Collision radius on the ground plane. */
  radius: 0.45,
  walkSpeed: 3.4,
  runSpeed: 7,
  /** How far either side of the valley's centre line you can walk before the hills get too steep. */
  maxOffPath: 20,
};

/**
 * The adventurer's live state. Mutable on purpose, like `journey`: written by
 * the Player every frame, read by the camera, director and world in useFrame.
 */
export const player = {
  position: new Vector3(),
  velocity: new Vector3(),
  /** Facing, radians around y: 0 faces +z, PI faces -z (down the road). */
  heading: Math.PI,
  /** Ground speed this frame. */
  speed: 0,
  /** Where a click or tap asked to walk to, if anywhere. */
  target: null as Vector3 | null,
  /** Set when the player was placed directly (spawn, fast travel): the camera snaps instead of gliding. */
  teleported: true,
  /** Whether the visitor has moved yet; the controls hint fades once they have. */
  moved: false,
  /** A one-off clip to play (using something); the body clears it when it finishes. */
  action: null as "PickUp" | null,
};

/**
 * Each region's glade is anchored a little in front of its centre, where v1's
 * camera looked at the scene from. Standing anywhere from about 24 units in
 * front of a centre to 8 beyond it counts as being in that region.
 */
const GLADE_ANCHOR = 8;
const anchorZ = (i: number) => regions[i]!.center[2] + GLADE_ANCHOR;

/**
 * Where the player is along the journey, 0..REGION_COUNT-1, from how far down
 * the road they've walked: whole while inside a glade, blending across the
 * middle of each road. Drives atmosphere and which regions render, exactly as
 * scroll progress did in v1.
 */
export function journeyPositionAt(z: number) {
  const at = (anchorZ(0) - z) / REGION_SPACING;
  if (at <= 0) return 0;
  if (at >= REGION_COUNT - 1) return REGION_COUNT - 1;
  const i = Math.floor(at);
  return i + smoothstep(0.35, 0.65, at - i);
}

/** Where a visitor arriving at a region stands: v1's camera spot for it (always clear of props), facing the scene. */
export function spawnPoint(id: RegionId, out = new Vector3()) {
  const region = regions.find((r) => r.id === id)!;
  const [x, , z] = region.waypoint.position;
  return out.set(x, groundHeight(x, z), z - 2);
}

/** Keeps a point on the walkable valley: off the steep hillsides and inside the journey's two ends. */
export function clampToValley(p: Vector3) {
  const zMax = regions[0]!.center[2] + 24;
  const zMin = regions[REGION_COUNT - 1]!.center[2] - 22;
  p.z = Math.min(zMax, Math.max(zMin, p.z));
  const { x: px } = pathAt(p.z);
  p.x = Math.min(px + PLAYER.maxOffPath, Math.max(px - PLAYER.maxOffPath, p.x));
  return p;
}

/** The region the player counts as being in (for the header, map and narrative). */
export const playerRegionIndex = (position: number) => Math.round(position);
