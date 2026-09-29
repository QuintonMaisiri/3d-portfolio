"use client";

import { useEffect } from "react";
import { clamp01, damp } from "@/lib/journey";
import { getRegion, regionShownAt } from "@/lib/regions";
import { useCodex } from "@/lib/store";

/** How quickly smoothProgress catches up with rawProgress, per second. */
const SMOOTHING = 3.5;
/**
 * A single jump bigger than this (a deep-link hash applied after load, a view
 * switch) snaps the world instead of flying the whole route. Smooth anchor
 * scrolling arrives in small steps, so it still travels.
 */
const SNAP_JUMP = 1.5 / 8;

/**
 * Turns window scroll into the single 0..1 progress value that drives the world.
 * rawProgress follows scroll exactly; smoothProgress eases toward it in a rAF
 * loop that only runs while the two differ.
 */
export function ScrollDriver() {
  useEffect(() => {
    const { setRawProgress, setSmoothProgress, setActiveRegion } = useCodex.getState();
    let frame = 0;
    let last = 0;

    const read = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return max > 0 ? clamp01(window.scrollY / max) : 0;
    };

    const tick = (now: number) => {
      const { rawProgress, smoothProgress, reducedMotion } = useCodex.getState();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      let next = reducedMotion ? rawProgress : damp(smoothProgress, rawProgress, SMOOTHING, dt);
      if (Math.abs(next - rawProgress) < 1e-5) next = rawProgress;
      setSmoothProgress(next);
      frame = next === rawProgress ? 0 : requestAnimationFrame(tick);
    };

    const update = () => {
      const p = read();
      setRawProgress(p);
      if (Math.abs(p - useCodex.getState().smoothProgress) > SNAP_JUMP) setSmoothProgress(p);
      setActiveRegion(getRegion(regionShownAt(p)).id);
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    // Start where the page is (deep link, view switch) rather than easing in from 0.
    const initial = read();
    setRawProgress(initial);
    setSmoothProgress(initial);
    setActiveRegion(getRegion(regionShownAt(initial)).id);

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
