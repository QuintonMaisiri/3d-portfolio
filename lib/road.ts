import { Vector3 } from "three";
import { cameraPath, waypointU } from "./cameraPath";

/**
 * The road between regions, on the ground plane: v1's camera route (which
 * every prop keeps clear of and the worn trail follows), sampled evenly by
 * arc length. Travel scenes walk the adventurer along it.
 */
const SAMPLES = 1200;
export const road = cameraPath.getSpacedPoints(SAMPLES);
const step = cameraPath.getLength() / SAMPLES;

/** Road index of each region's resting spot. */
export const regionRoadIndex = waypointU.map((u) => Math.round(u * SAMPLES));

/**
 * The gates on the road out of region i toward i + 1: walking forward past
 * `exit` (a little way out of the glade) starts travel on to i + 1; walking
 * back past `back` starts travel back to i. Fractions of the stretch.
 */
const EXIT = 0.24;
const BACK = 0.76;
/** Where travel ends, as a fraction of the stretch from the region being left (forward) or arrived at (back). */
const ARRIVE_FORWARD = 0.88;
const ARRIVE_BACK = 0.14;

export function gates(i: number) {
  const a = regionRoadIndex[i]!;
  const b = regionRoadIndex[i + 1]!;
  return {
    exit: a + (b - a) * EXIT,
    back: a + (b - a) * BACK,
    arriveForward: a + (b - a) * ARRIVE_FORWARD,
    arriveBack: a + (b - a) * ARRIVE_BACK,
  };
}

/** Nearest road sample to (x, z) and its ground-plane distance; searches near `hint` when given. */
export function nearestRoad(x: number, z: number, hint = -1) {
  const from = hint < 0 ? 0 : Math.max(0, hint - 60);
  const to = hint < 0 ? SAMPLES : Math.min(SAMPLES, hint + 60);
  let best = Infinity;
  let index = from;
  for (let i = from; i <= to; i++) {
    const p = road[i]!;
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < best) {
      best = d;
      index = i;
    }
  }
  return { index, distance: Math.sqrt(best) };
}

/** A point on the road at a fractional index (ground-plane x/z; y is the camera route's and should be ignored). */
export function roadPoint(index: number, out = new Vector3()) {
  const i = Math.max(0, Math.min(SAMPLES - 1, Math.floor(index)));
  const t = Math.max(0, Math.min(1, index - i));
  return out.lerpVectors(road[i]!, road[i + 1]!, t);
}

/** Road indices per world unit walked. */
export const indexPerUnit = 1 / step;

/**
 * A travel scene in progress: the adventurer walks the road by themselves
 * while the camera films from the side. Mutable, read in frame loops.
 */
export const travel = {
  active: false,
  /** +1 toward the next region, -1 back toward the previous. */
  dir: 1 as 1 | -1,
  /** Current fractional road index. */
  index: 0,
  /** Road index where the scene ends. */
  end: 0,
  /** Stretch being travelled (region it starts from, going forward). */
  stretch: 0,
  /** 0..1 how much the travel camera has taken over (eased in and out). */
  weight: 0,
  /** The nearest road index last frame (to detect walking through a gate). */
  last: -1,
};
