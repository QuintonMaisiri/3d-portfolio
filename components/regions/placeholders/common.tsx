"use client";

import type { ThreeElements } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { AdditiveBlending, CanvasTexture, NormalBlending, type BufferGeometry } from "three";
import { Scatter, type Placement } from "@/components/world/Scatter";

export type GroupProps = ThreeElements["group"];
export type MeshProps = ThreeElements["mesh"];

/**
 * Builds a geometry once (e.g. pre-translated so its pivot sits at the base)
 * and disposes it on unmount. Pass the result as <primitive attach="geometry" />.
 */
export function useGeometry<T extends BufferGeometry>(factory: () => T): T {
  const [geometry] = useState(factory);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

/** Generic boulders, shared by several regions. */
export function Rocks({ items, color }: { items: readonly Placement[]; color: string }) {
  return (
    <Scatter items={items}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshLambertMaterial color={color} flatShading />
    </Scatter>
  );
}

/** Alpha stops, centre to edge: "glow" has a bright core and wide falloff (a point of light); "halo" is an even soft disc. */
const DOT_PROFILES = {
  glow: [
    [0, 1],
    [0.12, 0.9],
    [0.3, 0.35],
    [0.6, 0.08],
    [1, 0],
  ],
  halo: [
    [0, 1],
    [0.35, 0.55],
    [1, 0],
  ],
} as const;

/**
 * Soft round dot (white, alpha falling to 0 at the edge) for glows, halos and
 * embers drawn as points. Use as a PointsMaterial `map`.
 */
export function useSoftDot(profile: keyof typeof DOT_PROFILES = "glow") {
  const [texture] = useState(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    for (const [at, alpha] of DOT_PROFILES[profile]) g.addColorStop(at, `rgba(255,255,255,${alpha})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    return new CanvasTexture(canvas);
  });
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/**
 * Material for points drawn as soft round glows instead of hard squares
 * (fireflies, dust, spores, snow, stars). `additive` for things that emit light.
 */
export function SoftPointsMaterial({
  color,
  size,
  opacity = 1,
  additive = false,
  fog = true,
}: {
  color: string;
  size: number;
  opacity?: number;
  additive?: boolean;
  fog?: boolean;
}) {
  const dot = useSoftDot();
  return (
    <pointsMaterial
      map={dot}
      color={color}
      size={size}
      sizeAttenuation
      transparent
      opacity={opacity}
      depthWrite={false}
      blending={additive ? AdditiveBlending : NormalBlending}
      fog={fog}
    />
  );
}
