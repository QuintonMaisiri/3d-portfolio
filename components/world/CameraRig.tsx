"use client";

import { useFrame } from "@react-three/fiber";
import { Vector3 } from "three";
import { cameraAim, cameraPath, shots, waypointU } from "@/lib/cameraPath";
import { easeOutCubic, lerp } from "@/lib/journey";
import { narrative } from "@/lib/narrative";
import { REGION_COUNT } from "@/lib/regions";
import { useCodex } from "@/lib/store";
import { journey } from "@/lib/timeline";

/** How far ahead along the route the camera looks mid-travel (fraction of the whole route). */
const LOOK_AHEAD = 0.035;
/** How strongly mid-travel aim favours the road ahead over the next region's target. */
const LOOK_AHEAD_WEIGHT = 0.65;
/** Where the camera starts the opening, relative to its resting pose: higher and further back. */
const INTRO_OFFSET = new Vector3(0, 2.5, 7);

// Scratch vectors, reused every frame (there is only ever one camera rig).
const ahead = new Vector3();
const aim = new Vector3();
/** Where the camera is looking this frame. Read-only for others (the sun follows it). */
export const cameraLookAt: Readonly<Vector3> = aim;

/**
 * The camera, as a film camera:
 * - Travel runs at an even speed along the route (arc-length interpolation)
 *   and looks ahead down the road, turning to the next scene as it arrives.
 * - While reading, it drifts through the region's `shot` (push-in, crane,
 *   orbit), then carries that drift smoothly into the next travel.
 */
export function CameraRig() {
  useFrame(({ camera, clock }) => {
    const p = journey.position;
    const i = Math.min(Math.floor(p), REGION_COUNT - 2);
    const m = p - i;

    const u = lerp(waypointU[i]!, waypointU[i + 1]!, m);
    cameraPath.getPointAt(u, camera.position);
    cameraAim.getPoint(p / (REGION_COUNT - 1), aim);

    // Mid-travel, look down the road rather than at the destination.
    const lookAhead = Math.sin(Math.PI * m) * LOOK_AHEAD_WEIGHT;
    if (lookAhead > 0.001) {
      cameraPath.getPointAt(Math.min(1, u + LOOK_AHEAD), ahead);
      ahead.y -= 0.6;
      aim.lerp(ahead, lookAhead);
    }

    // The shot of the region we're leaving fades out over the travel; the
    // next region's shot is still 0 until its dwell starts.
    for (const [k, weight] of [
      [i, journey.regions[i]!.shot * (1 - m)],
      [i + 1, journey.regions[i + 1]!.shot],
    ] as const) {
      if (weight <= 0) continue;
      camera.position.addScaledVector(shots[k]!.move, weight);
      aim.addScaledVector(shots[k]!.aim, weight);
    }

    // Opening: ease in and down out of the fog.
    const opening = 1 - easeOutCubic(narrative.intro);
    if (opening > 0) camera.position.addScaledVector(INTRO_OFFSET, opening);

    if (!useCodex.getState().reducedMotion) {
      const s = clock.elapsedTime;
      camera.position.x += Math.sin(s * 0.23) * 0.08;
      camera.position.y += Math.sin(s * 0.31) * 0.06;
    }
    camera.lookAt(aim);
  });

  return null;
}
