"use client";

import { useCodex } from "./store";

/**
 * True on low-power devices (phones, few cores, data saver) and after the
 * performance monitor has degraded the visit: scenery then draws less
 * (thinner grass, lighter distant trees, fewer shadow casters).
 */
export function useLite() {
  return useCodex((s) => s.quality === "low" || s.degraded);
}

/** Share of grass blades and woodland trees kept in lite mode. */
export const LITE_SHARE = 0.4;
