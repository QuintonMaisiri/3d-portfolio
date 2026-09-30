"use client";

import { useEffect, useMemo, type Ref } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, type PointsMaterial } from "three";
import { useSoftDot } from "@/components/regions/placeholders/common";
import type { Vec3 } from "@/lib/types";

/**
 * One soft additive glow at a point (light spilling from a chest or cabinet,
 * a candle flame). Starts invisible unless `opacity` is given; drive its
 * material's opacity through `materialRef`.
 */
export function GlowDot({
  position,
  color,
  size,
  opacity = 0,
  materialRef,
}: {
  position: Vec3;
  color: string;
  size: number;
  opacity?: number;
  materialRef?: Ref<PointsMaterial>;
}) {
  const dot = useSoftDot();
  const geometry = useMemo(
    () => new BufferGeometry().setAttribute("position", new BufferAttribute(new Float32Array([0, 0, 0]), 3)),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry} position={position}>
      <pointsMaterial
        ref={materialRef}
        map={dot}
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </points>
  );
}
