"use client";

import { useFrame } from "@react-three/fiber";
import { BrightnessContrast, HueSaturation, Vignette } from "@react-three/postprocessing";
import { useRef } from "react";
import type { BrightnessContrastEffect, HueSaturationEffect } from "postprocessing";
import { lerp } from "@/lib/journey";
import { REGION_COUNT } from "@/lib/regions";
import { journey } from "@/lib/timeline";

/**
 * Per-region colour grade, in region order: [saturation, contrast], each -1..1
 * with 0 unchanged. Subtle on purpose: the palettes do the work, the grade
 * gives each place its temperature (misty and muted highlands, rich forge,
 * cold storm, jewel-bright caves).
 */
const GRADES: readonly (readonly [number, number])[] = [
  [-0.08, 0.04], // highlands
  [0.06, 0.08], // archive
  [0.14, 0.1], // forge
  [0.1, 0.06], // forest
  [-0.16, 0.1], // peaks
  [0.06, 0.05], // ruins
  [0.16, 0.1], // caves
  [0.02, 0.08], // campfire
];

/** Colour grade and vignette, blended between regions as the journey moves (high tier only, inside the composer). */
export function Grade() {
  const hue = useRef<HueSaturationEffect>(null);
  const bc = useRef<BrightnessContrastEffect>(null);

  useFrame(() => {
    const p = journey.position;
    const i = Math.min(Math.floor(p), REGION_COUNT - 2);
    const m = p - i;
    const a = GRADES[i]!;
    const b = GRADES[i + 1]!;
    if (hue.current) hue.current.saturation = lerp(a[0], b[0], m);
    if (bc.current) bc.current.contrast = lerp(a[1], b[1], m);
  });

  return (
    <>
      <HueSaturation ref={hue} saturation={GRADES[0]![0]} />
      <BrightnessContrast ref={bc} contrast={GRADES[0]![1]} />
      <Vignette offset={0.32} darkness={0.42} />
    </>
  );
}
