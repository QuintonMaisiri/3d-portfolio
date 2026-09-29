"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  ConeGeometry,
  TubeGeometry,
  Vector3,
  type InstancedMesh,
  type Mesh,
  type MeshBasicMaterial,
  type Points,
} from "three";
import { Scatter, type Placement } from "@/components/world/Scatter";
import { mulberry32, between } from "@/lib/random";
import { SoftPointsMaterial, useGeometry, type GroupProps, type MeshProps } from "./common";

/** A peak with a snow cap; pivot at the base. `height` and `radius` in world units. */
export function Mountain({ height, radius, ...props }: GroupProps & { height: number; radius: number }) {
  const capHeight = height * 0.28;
  return (
    <group {...props}>
      <mesh position={[0, height / 2, 0]}>
        <coneGeometry args={[radius, height, 7]} />
        <meshLambertMaterial color="#6a6e78" flatShading />
      </mesh>
      <mesh position={[0, height - capHeight / 2 + 0.02, 0]}>
        <coneGeometry args={[(radius * capHeight) / height + 0.05, capHeight, 7]} />
        <meshLambertMaterial color="#e9edf2" flatShading />
      </mesh>
    </group>
  );
}

/** Distant range: many instanced peaks with caps. Pivot at the base. */
export function MountainRange({ items }: { items: readonly Placement[] }) {
  const body = useGeometry(() => new ConeGeometry(6, 16, 6).translate(0, 8, 0));
  const cap = useGeometry(() => new ConeGeometry(1.85, 4.9, 6).translate(0, 16 - 2.45 + 0.02, 0));
  return (
    <>
      <Scatter items={items}>
        <primitive object={body} attach="geometry" />
        <meshLambertMaterial color="#5c616c" flatShading />
      </Scatter>
      <Scatter items={items}>
        <primitive object={cap} attach="geometry" />
        <meshLambertMaterial color="#dfe4ea" flatShading />
      </Scatter>
    </>
  );
}

/** A signal fire on a summit, lit when its problem-solving case appears. */
export const Beacon = forwardRef<Mesh, MeshProps & { color: string }>(function Beacon({ color, ...props }, ref) {
  return (
    <mesh ref={ref} {...props}>
      <octahedronGeometry args={[0.7, 0]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
});

/**
 * Small lanterns marking the climbing routes up the peaks. Instanced; the
 * region places them once and recolours each (dark = unlit) every frame.
 */
export const ClimbMarkers = forwardRef<InstancedMesh, { count: number }>(function ClimbMarkers({ count }, ref) {
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <octahedronGeometry args={[0.22, 0]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
});

/** Low-poly storm clouds: puffs placed and drifted by the region. */
export const Clouds = forwardRef<InstancedMesh, { count: number }>(function Clouds({ count }, ref) {
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshLambertMaterial color="#7f8898" flatShading />
    </instancedMesh>
  );
});

/** Light snow in a box around the peaks. The region advances it. */
export const Snow = forwardRef<Points, { count: number; box: readonly [number, number, number] }>(function Snow(
  { count, box },
  ref,
) {
  const geometry = useGeometry(() => {
    const rng = mulberry32(503);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = between(rng, -box[0], box[0]);
      positions[i * 3 + 1] = between(rng, 0, box[1]);
      positions[i * 3 + 2] = between(rng, -box[2], box[2]);
    }
    return new BufferGeometry().setAttribute("position", new BufferAttribute(positions, 3));
  });
  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <SoftPointsMaterial color="#f2f5fa" size={0.2} opacity={0.9} />
    </points>
  );
});

export interface BoltHandle {
  /** Build a new jagged bolt between two points (region-local). */
  strike: (from: Vector3, to: Vector3) => void;
  /** 0..1 visibility; 0 hides it. */
  setIntensity: (amount: number) => void;
}

/** A lightning bolt, rebuilt on each strike. */
export const Bolt = forwardRef<BoltHandle, object>(function Bolt(_props, ref) {
  const mesh = useRef<Mesh>(null);
  const material = useRef<MeshBasicMaterial>(null);
  const [rng] = useState(() => mulberry32(504));
  const geometry = useRef<TubeGeometry | null>(null);

  useEffect(() => () => geometry.current?.dispose(), []);

  useImperativeHandle(ref, () => ({
    strike(from, to) {
      const points: Vector3[] = [];
      const steps = 9;
      for (let k = 0; k <= steps; k++) {
        const p = from.clone().lerp(to, k / steps);
        if (k > 0 && k < steps) p.add(new Vector3(between(rng, -1.4, 1.4), between(rng, -0.4, 0.4), between(rng, -1, 1)));
        points.push(p);
      }
      const next = new TubeGeometry(new CatmullRomCurve3(points, false, "catmullrom", 0.1), 40, 0.09, 4, false);
      geometry.current?.dispose();
      geometry.current = next;
      if (mesh.current) mesh.current.geometry = next;
    },
    setIntensity(amount) {
      if (mesh.current) mesh.current.visible = amount > 0.05 && geometry.current !== null;
      if (material.current) material.current.opacity = Math.min(1, amount * 1.4);
    },
  }));

  return (
    <mesh ref={mesh} visible={false}>
      <meshBasicMaterial ref={material} color="#eef3ff" transparent depthWrite={false} fog={false} />
    </mesh>
  );
});
