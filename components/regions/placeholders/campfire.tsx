"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { BufferAttribute, BufferGeometry, type Group, type Points } from "three";
import { Scatter, type Placement } from "@/components/world/Scatter";
import { mulberry32 } from "@/lib/random";
import { SoftPointsMaterial, useGeometry, type GroupProps } from "./common";

export { GlowPoints } from "./forge";

export { ForestTrees as Trees } from "./forest";

/** Crossed logs and stacked flames. The region flickers `flames`. */
export const Fire = forwardRef<Group, GroupProps>(function Fire(props, flames) {
  return (
    <group {...props}>
      {[0, 1.05, 2.1].map((a) => (
        <mesh key={a} position={[0, 0.2, 0]} rotation={[0, a, Math.PI / 2]}>
          <cylinderGeometry args={[0.16, 0.2, 2, 6]} />
          <meshLambertMaterial color="#4a2f1d" flatShading />
        </mesh>
      ))}
      <group ref={flames} position={[0, 0.3, 0]}>
        <mesh position={[0, 0.55, 0]}>
          <coneGeometry args={[0.55, 1.3, 6]} />
          <meshBasicMaterial color="#ff7a2a" />
        </mesh>
        <mesh position={[0.1, 0.65, 0.05]}>
          <coneGeometry args={[0.3, 1, 6]} />
          <meshBasicMaterial color="#ffc15a" />
        </mesh>
      </group>
    </group>
  );
});

export function Tent(props: GroupProps) {
  return (
    <group {...props}>
      <mesh position={[0, 1.2, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.9, 2.4, 4]} />
        <meshLambertMaterial color="#6b5a45" flatShading />
      </mesh>
    </group>
  );
}

export interface RavenHandle {
  /**
   * Pose the raven. `flight` null = perched; 0..1 = taking off and flying away
   * (hidden at 1). `perch` 0..1 fades it back onto its log afterwards.
   */
  update: (flight: number | null, perch: number, time: number) => void;
}

/** The raven that carries your message: a low-poly bird that can take flight. Local +z is its heading. */
export const Raven = forwardRef<RavenHandle, GroupProps>(function Raven(props, ref) {
  const bird = useRef<Group>(null);
  const wings = useRef<(Group | null)[]>([]);

  useImperativeHandle(ref, () => ({
    update(flight, perch, time) {
      const b = bird.current;
      if (!b) return;
      if (flight === null) {
        b.position.set(0, 0, 0);
        b.rotation.set(0, 0, 0);
        b.scale.setScalar(Math.max(0.001, perch));
        // Perched: wings folded down along the body.
        wings.current.forEach((w, k) => w?.rotation.set(0, 0, k === 0 ? -1.35 : 1.35));
        return;
      }
      // Up and away: a climbing arc forward, off into the night.
      const f = flight;
      b.position.set(0, 1.5 * f + 9 * f * f, 14 * f);
      b.rotation.set(-0.5 * Math.min(1, f * 4), 0, Math.sin(f * 6) * 0.15);
      b.scale.setScalar(f >= 1 ? 0.001 : 1);
      const beat = Math.sin(time * 16) * 0.8;
      wings.current.forEach((w, k) => w?.rotation.set(0, 0, k === 0 ? beat : -beat));
    },
  }));

  return (
    <group {...props}>
      <group ref={bird}>
        <mesh position={[0, 0.25, 0]} scale={[0.6, 0.55, 1]}>
          <octahedronGeometry args={[0.4, 0]} />
          <meshLambertMaterial color="#15161c" flatShading />
        </mesh>
        <mesh position={[0, 0.5, 0.28]}>
          <octahedronGeometry args={[0.16, 0]} />
          <meshLambertMaterial color="#15161c" flatShading />
        </mesh>
        <mesh position={[0, 0.48, 0.48]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.05, 0.18, 4]} />
          <meshLambertMaterial color="#3a3326" flatShading />
        </mesh>
        {[1, -1].map((side, k) => (
          // Wings hinge at the shoulders and flap by rolling.
          <group
            key={side}
            ref={(g) => {
              wings.current[k] = g;
            }}
            position={[side * 0.12, 0.35, 0]}
          >
            <mesh position={[side * 0.35, 0, -0.05]}>
              <boxGeometry args={[0.7, 0.03, 0.35]} />
              <meshLambertMaterial color="#1b1c22" flatShading />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
});

/** A fallen log to sit on; pivot at its centre on the ground. */
export function LogBench(props: GroupProps) {
  return (
    <group {...props}>
      <mesh position={[0, 0.28, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.28, 0.32, 2.4, 7]} />
        <meshLambertMaterial color="#4a2f1d" flatShading />
      </mesh>
    </group>
  );
}

/** A low moon (unfogged, so it shows through the night haze). */
export function Moon(props: GroupProps) {
  return (
    <group {...props}>
      <mesh>
        <icosahedronGeometry args={[4, 2]} />
        <meshBasicMaterial color="#f1ecd8" fog={false} />
      </mesh>
    </group>
  );
}

export function Stones({ items }: { items: readonly Placement[] }) {
  return (
    <Scatter items={items}>
      <dodecahedronGeometry args={[0.3, 0]} />
      <meshLambertMaterial color="#4b4f5a" flatShading />
    </Scatter>
  );
}

/**
 * Stars on a far dome. Not fogged, so they stay crisp above the night haze.
 * Transparent so the region can fade them in on arrival.
 */
export const Stars = forwardRef<Points, { count: number; radius: number }>(function Stars({ count, radius }, ref) {
  const geometry = useGeometry(() => {
    const rng = mulberry32(801);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(rng() * 0.9); // upper hemisphere, a little above the horizon
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    return new BufferGeometry().setAttribute("position", new BufferAttribute(positions, 3));
  });
  return (
    <points ref={ref} geometry={geometry}>
      <SoftPointsMaterial color="#f4f1ff" size={1.8} opacity={0} additive fog={false} />
    </points>
  );
});
