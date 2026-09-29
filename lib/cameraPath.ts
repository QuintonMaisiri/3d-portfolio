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
