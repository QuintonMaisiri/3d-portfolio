"use client";

import type { ThreeElements } from "@react-three/fiber";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Color, Object3D, type InstancedMesh } from "three";
import type { Vec3 } from "@/lib/types";

export interface Placement {
  position: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
}

type Props = Omit<ThreeElements["instancedMesh"], "args" | "children"> & {
  items: readonly Placement[];
  /** Geometry and material, e.g. <coneGeometry /><meshLambertMaterial />. */
  children: ReactNode;
  /** How much each copy's brightness may vary (0 = identical). */
  vary?: number;
};

const dummy = new Object3D();
const tone = new Color();

/** One draw call for many copies of the same prop: rocks, trees, crystals. */
export function Scatter({ items, children, vary = 0.14, ...props }: Props) {
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((item, i) => {
      dummy.position.set(...item.position);
      dummy.rotation.set(...(item.rotation ?? [0, 0, 0]));
      const s = item.scale ?? 1;
      if (typeof s === "number") dummy.scale.setScalar(s);
      else dummy.scale.set(...s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (vary > 0) {
        // Deterministic per-instance tone from its position: slightly lighter or darker, a touch warmer or cooler.
        const h = Math.sin(item.position[0] * 12.9898 + item.position[2] * 78.233) * 43758.5453;
        const r = h - Math.floor(h);
        const shade = 1 - vary / 2 + vary * r;
        mesh.setColorAt(i, tone.setRGB(shade * (1 + vary * 0.15 * (r - 0.5)), shade, shade * (1 - vary * 0.15 * (r - 0.5))));
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, vary]);

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} {...props}>
      {children}
    </instancedMesh>
  );
}
