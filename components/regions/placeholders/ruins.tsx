"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshBasicMaterial,
} from "three";
import { Scatter, type Placement } from "@/components/world/Scatter";
import { waterShimmer } from "@/lib/wind";
import { useGeometry, type GroupProps, type MeshProps } from "./common";

export const Water = forwardRef<Mesh, MeshProps & { radius: number; color: string }>(function Water(
  { radius, color, ...props },
  ref,
) {
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} {...props}>
      <circleGeometry args={[radius, 24]} />
      <meshLambertMaterial color={color} transparent opacity={0.82} flatShading {...waterShimmer} />
    </mesh>
  );
});

export interface MilestoneTabletHandle {
  /** 0..1: its milestone has appeared; the inscription lights. */
  setLit: (amount: number) => void;
  /** Height of the tablet's base (it rises out of the water). */
  setY: (y: number) => void;
}

/** A milestone tablet with a carved inscription band; pivot at the base. */
export const MilestoneTablet = forwardRef<MilestoneTabletHandle, GroupProps & { glow: string }>(
  function MilestoneTablet({ glow, ...props }, ref) {
    const group = useRef<Group>(null);
    const bands = useRef<(MeshBasicMaterial | null)[]>([]);
    const colors = useRef({ cut: new Color("#51605a"), lit: new Color(glow) });

    useImperativeHandle(ref, () => ({
      setY(y) {
        if (group.current) group.current.position.y = y;
      },
      setLit(amount) {
        const { cut, lit } = colors.current;
        bands.current.forEach((m, k) => m?.color.lerpColors(cut, lit, Math.min(1, Math.max(0, amount * 2 - k))));
      },
    }));

    return (
      <group ref={group} {...props}>
        <mesh position={[0, 1.4, 0]}>
          <boxGeometry args={[1.8, 2.8, 0.35]} />
          <meshLambertMaterial color="#8a9a90" flatShading />
        </mesh>
        <mesh position={[0, 2.95, 0]}>
          <boxGeometry args={[2.1, 0.3, 0.5]} />
          <meshLambertMaterial color="#76867c" flatShading />
        </mesh>
        {[2.2, 1.8].map((y, k) => (
          <mesh key={y} position={[0, y, 0.18]}>
            <boxGeometry args={[k === 0 ? 1.3 : 0.9, 0.1, 0.02]} />
            <meshBasicMaterial
              ref={(m) => {
                bands.current[k] = m;
              }}
              color="#51605a"
            />
          </mesh>
        ))}
      </group>
    );
  },
);

/** Broken columns of varying height (scale y); pivot at the base. */
export function BrokenColumns({ items }: { items: readonly Placement[] }) {
  const geometry = useGeometry(() => new CylinderGeometry(0.5, 0.6, 5, 8).translate(0, 2.5, 0));
  return (
    <Scatter items={items}>
      <primitive object={geometry} attach="geometry" />
      <meshLambertMaterial color="#7b8a82" flatShading />
    </Scatter>
  );
}

/** Column drums lying where they fell. */
export function FallenColumns({ items }: { items: readonly Placement[] }) {
  return (
    <Scatter items={items}>
      <cylinderGeometry args={[0.55, 0.55, 2.4, 8]} />
      <meshLambertMaterial color="#748379" flatShading />
    </Scatter>
  );
}

/** A broken archway: one full pillar, one snapped, and half a lintel. Pivot at the base centre. */
export function BrokenArch(props: GroupProps) {
  return (
    <group {...props}>
      <mesh position={[-2.4, 3, 0]}>
        <boxGeometry args={[1, 6, 1]} />
        <meshLambertMaterial color="#7f8e86" flatShading />
      </mesh>
      <mesh position={[2.4, 1.7, 0]} rotation={[0, 0, 0.06]}>
        <boxGeometry args={[1, 3.4, 1]} />
        <meshLambertMaterial color="#7f8e86" flatShading />
      </mesh>
      <mesh position={[-1.1, 6.4, 0]} rotation={[0, 0, -0.08]}>
        <boxGeometry args={[3.6, 0.8, 1.1]} />
        <meshLambertMaterial color="#72827a" flatShading />
      </mesh>
    </group>
  );
}

/** Steps running down into the water; pivot at the top step. */
export function SunkenSteps(props: GroupProps) {
  const step = useGeometry(() => new BoxGeometry(3.4, 0.35, 0.9));
  return (
    <group {...props}>
      {[0, 1, 2, 3, 4].map((k) => (
        <mesh key={k} geometry={step} position={[0, -k * 0.35, -k * 0.85]}>
          <meshLambertMaterial color="#7a8a80" flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** Causeway stones joining the tablets in order. Instanced; the region recolours each as the timeline is walked. */
export const Causeway = forwardRef<InstancedMesh, { count: number }>(function Causeway({ count }, ref) {
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <cylinderGeometry args={[0.45, 0.5, 0.16, 6]} />
      <meshLambertMaterial flatShading emissive="#0b1614" />
    </instancedMesh>
  );
});

/** An expanding ring on the water. The region scales and fades it. */
export const Ripple = forwardRef<Mesh, MeshProps & { color: string }>(function Ripple({ color, ...props }, ref) {
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} {...props}>
      <ringGeometry args={[0.9, 1, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0} depthWrite={false} />
    </mesh>
  );
});

/** A small light hovering over the latest milestone: "you are here". */
export const NowMarker = forwardRef<Mesh, MeshProps & { color: string }>(function NowMarker({ color, ...props }, ref) {
  return (
    <mesh ref={ref} {...props}>
      <octahedronGeometry args={[0.32, 0]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
});
