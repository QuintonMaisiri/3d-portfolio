"use client";

import { forwardRef } from "react";
import type { Mesh } from "three";
import { Scatter, type Placement } from "@/components/world/Scatter";
import { ConeGeometry } from "three";
import { useGeometry, type MeshProps } from "./common";

export { GlowPoints } from "./forge";

/** Rough cave walls and ceiling. */
export function CaveRock({ items }: { items: readonly Placement[] }) {
  return (
    <Scatter items={items}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshLambertMaterial color="#2e2742" flatShading />
    </Scatter>
  );
}

/** A testimonial crystal. */
export const Crystal = forwardRef<Mesh, MeshProps & { color: string }>(function Crystal({ color, ...props }, ref) {
  return (
    <mesh ref={ref} {...props}>
      <octahedronGeometry args={[1, 0]} />
      <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.12} flatShading />
    </mesh>
  );
});

/** Small crystal clusters on the floor and walls. */
export function CrystalShards({ items, color }: { items: readonly Placement[]; color: string }) {
  return (
    <Scatter items={items}>
      <octahedronGeometry args={[0.35, 0]} />
      <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.35} flatShading />
    </Scatter>
  );
}

/** Stalactites hanging from the roof; pivot at the top (they point down). */
export function Stalactites({ items }: { items: readonly Placement[] }) {
  const geometry = useGeometry(() => new ConeGeometry(0.45, 2.6, 5).rotateX(Math.PI).translate(0, -1.3, 0));
  return (
    <Scatter items={items}>
      <primitive object={geometry} attach="geometry" />
      <meshLambertMaterial color="#3a3158" flatShading />
    </Scatter>
  );
}

/** Stalagmites rising from the floor; pivot at the base. */
export function Stalagmites({ items }: { items: readonly Placement[] }) {
  const geometry = useGeometry(() => new ConeGeometry(0.5, 2, 5).translate(0, 1, 0));
  return (
    <Scatter items={items}>
      <primitive object={geometry} attach="geometry" />
      <meshLambertMaterial color="#352c52" flatShading />
    </Scatter>
  );
}
