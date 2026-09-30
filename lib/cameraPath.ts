import { CatmullRomCurve3, Vector3 } from "three";
import { regions } from "./regions";
import type { RegionConfig } from "./types";

/**
 * The camera's route: one curve through every region's waypoint, and one
 * through the look targets. getPoint(i / (n - 1)) lands exactly on waypoint i.
 */
export const cameraPath = new CatmullRomCurve3(
  regions.map((r) => new Vector3(...r.waypoint.position)),
  false,
  "centripetal",
);

export const cameraAim = new CatmullRomCurve3(
  regions.map((r) => new Vector3(...r.waypoint.target)),
  false,
  "centripetal",
);

/** Where each region's reading drift (its `shot`) takes the camera and its aim, relative to the waypoint. */
function shotMove(region: RegionConfig) {
  const position = new Vector3(...region.waypoint.position);
  const target = new Vector3(...region.waypoint.target);
  const { dolly = 0, rise = 0, orbit = 0 } = region.shot ?? {};
  const end = position.clone().sub(target).applyAxisAngle(new Vector3(0, 1, 0), orbit).add(target);
  end.add(target.clone().sub(end).normalize().multiplyScalar(dolly));
  end.y += rise;
  return {
    move: end.sub(position),
    // Aim tilts with a crane so the framing follows the move.
    aim: new Vector3(0, rise * 0.35, 0),
  };
}

export const shots = regions.map(shotMove);

/**
 * Ground-plane samples of everywhere the camera actually goes: the route,
 * plus each region's drift from its waypoint (the camera leaves the curve
 * while reading, and blends back during travel).
 */
const samples = [
  ...cameraPath.getPoints(600),
  ...regions.flatMap((r, i) =>
    Array.from({ length: 21 }, (_, k) => new Vector3(...r.waypoint.position).addScaledVector(shots[i]!.move, k / 20)),
  ),
].map((p) => [p.x, p.z] as const);

/** True if world point (x, z) is at least `radius` from the camera's route, measured on the ground plane. */
export function clearOfCamera(x: number, z: number, radius: number): boolean {
  const r2 = radius * radius;
  for (const [px, pz] of samples) {
    const dx = x - px;
    const dz = z - pz;
    if (dx * dx + dz * dz < r2) return false;
  }
  return true;
}

/** The road on the ground: the camera route, evenly spaced, for the worn trail and keeping grass off it. */
const road = cameraPath.getSpacedPoints(900);
const TRAIL_CELL = 1;
const trailCache = new Map<number, number>();

/**
 * Signed ground-plane distance from (x, z) to the road (sign = which side),
 * clamped to +-12. Exact; `trailDistanceCached` is the fast approximation
 * (per 1-unit cell) for scattering thousands of things.
 */
export function trailDistance(x: number, z: number) {
  let best = Infinity;
  let side = 1;
  for (let i = 0; i < road.length - 1; i++) {
    const a = road[i]!;
    const b = road[i + 1]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)));
    const px = a.x + dx * t - x;
    const pz = a.z + dz * t - z;
    const d = px * px + pz * pz;
    if (d < best) {
      best = d;
      side = Math.sign(dx * (z - a.z) - dz * (x - a.x)) || 1;
    }
  }
  return Math.min(12, Math.sqrt(best)) * side;
}

export function trailDistanceCached(x: number, z: number) {
  const key = Math.round(x / TRAIL_CELL) * 100003 + Math.round(z / TRAIL_CELL);
  let d = trailCache.get(key);
  if (d === undefined) {
    d = Math.abs(trailDistance(Math.round(x / TRAIL_CELL) * TRAIL_CELL, Math.round(z / TRAIL_CELL) * TRAIL_CELL));
    trailCache.set(key, d);
  }
  return d;
}

const ARC_DIVISIONS = 2000;
// getPointAt maps through the same table, so waypoints land exactly.
cameraPath.arcLengthDivisions = ARC_DIVISIONS;
const arcLengths = cameraPath.getLengths(ARC_DIVISIONS);
const arcTotal = arcLengths[ARC_DIVISIONS]!;

/**
 * Each waypoint's position along the route as a fraction of its arc length.
 * Interpolating in this space (with getPointAt) moves the camera at an even
 * speed, however unevenly the waypoints are spaced.
 */
export const waypointU = regions.map(
  (_, i) => arcLengths[Math.round((i / (regions.length - 1)) * ARC_DIVISIONS)]! / arcTotal,
);
