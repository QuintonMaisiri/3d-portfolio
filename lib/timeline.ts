import gsap from "gsap";
import { clamp01 } from "./journey";
import { DWELL_RATIO, REGION_COUNT } from "./regions";

/**
 * World state written by the master timeline every frame. Mutable on purpose:
 * read it inside useFrame, never copy it into React state.
 */
export const journey = {
  /**
   * Where the camera is along the route, 0..REGION_COUNT-1. A whole number
   * while dwelling at a region, fractional while travelling to the next.
   * Camera, fog and lights are all interpolated from this one value.
   */
  position: 0,
  /**
   * Per region: `progress` is linear through its eighth; `shot` runs 0..1
   * across the dwell and drives the region's slow camera move.
   */
  regions: Array.from({ length: REGION_COUNT }, () => ({ progress: 0, shot: 0 })),
};

/**
 * The master timeline, one unit long so it can be scrubbed directly by scroll
 * progress. Each region owns an eighth: for the first DWELL_RATIO the camera
 * is at the region, drifting through its shot; then it eases on to the next.
 */
export function createMasterTimeline() {
  const tl = gsap.timeline({ paused: true, defaults: { ease: "none", immediateRender: false } });
  const span = 1 / REGION_COUNT;

  journey.regions.forEach((region, i) => {
    const start = i * span;
    tl.fromTo(region, { progress: 0 }, { progress: 1, duration: span }, start);
    tl.fromTo(region, { shot: 0 }, { shot: 1, duration: span * DWELL_RATIO, ease: "sine.inOut" }, start);
    if (i < REGION_COUNT - 1) {
      tl.fromTo(
        journey,
        { position: i },
        { position: i + 1, duration: span * (1 - DWELL_RATIO), ease: "sine.inOut" },
        start + span * DWELL_RATIO,
      );
    }
  });

  return tl;
}

/** 0 until travel toward region `index` begins, 1 on arrival and while dwelling there. */
export const arrival = (index: number) => clamp01(journey.position - (index - 1));

/** How far the camera is from region `index`, in regions. */
export const distanceTo = (index: number) => Math.abs(journey.position - index);
