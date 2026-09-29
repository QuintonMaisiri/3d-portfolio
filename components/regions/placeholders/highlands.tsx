"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
} from "three";
import { Scatter, type Placement } from "@/components/world/Scatter";
import { mulberry32, between } from "@/lib/random";
import { windSway } from "@/lib/wind";
import { useGeometry, type GroupProps, type MeshProps } from "./common";

const grassWind = windSway(0, 0.18);

export { Rocks } from "./common";

const CARVED_LINES = [
  { y: 2.55, width: 2.3 },
  { y: 2.0, width: 2.6 },
  { y: 1.45, width: 1.8 },
];

export interface StoneTabletHandle {
  /** 0..1: carved lines light one after another as the tagline appears. */
  setCarving: (amount: number) => void;
}

/** The stone tablet that echoes the hero tagline, with carved lines that glow. */
export const StoneTablet = forwardRef<StoneTabletHandle, GroupProps & { glow: string }>(function StoneTablet(
  { glow, ...props },
  ref,
) {
  const lines = useRef<(MeshBasicMaterial | null)[]>([]);
  const colors = useRef({ cut: new Color("#4f514b"), lit: new Color(glow) });

  useImperativeHandle(ref, () => ({
    setCarving(amount) {
      const { cut, lit } = colors.current;
      lines.current.forEach((m, k) => {
        const t = Math.min(1, Math.max(0, amount * CARVED_LINES.length - k));
        m?.color.lerpColors(cut, lit, t);
      });
    },
  }));

  return (
    <group {...props}>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[4.2, 0.5, 1.4]} />
        <meshLambertMaterial color="#6f716a" flatShading />
      </mesh>
      <group rotation={[-0.06, 0, 0.02]}>
        <mesh position={[0, 1.95, 0]}>
          <boxGeometry args={[3.2, 3, 0.5]} />
          <meshLambertMaterial color="#9a9c93" flatShading />
        </mesh>
        {CARVED_LINES.map((line, k) => (
          <mesh key={k} position={[0, line.y, 0.26]}>
            <boxGeometry args={[line.width, 0.12, 0.02]} />
            <meshBasicMaterial
              ref={(m) => {
                lines.current[k] = m;
              }}
              color="#4f514b"
            />
          </mesh>
        ))}
      </group>
    </group>
  );
});

/** Tall weathered stones; pivot at the base. */
export function StandingStones({ items }: { items: readonly Placement[] }) {
  const geometry = useGeometry(() => new BoxGeometry(0.9, 3.4, 0.6).translate(0, 1.5, 0));
  return (
    <Scatter items={items}>
      <primitive object={geometry} attach="geometry" />
      <meshLambertMaterial color="#7d8079" flatShading />
    </Scatter>
  );
}

/** Low mounds of heather. */
export function Heather({ items }: { items: readonly Placement[] }) {
  return (
    <Scatter items={items}>
      <icosahedronGeometry args={[0.8, 0]} />
      <meshLambertMaterial color="#6e5a78" flatShading />
    </Scatter>
  );
}

/** Tufts of moor grass; pivot at the base. */
export function GrassTufts({ items }: { items: readonly Placement[] }) {
  const geometry = useGeometry(() => new CylinderGeometry(0, 0.16, 0.7, 3).translate(0, 0.3, 0));
  return (
    <Scatter items={items}>
      <primitive object={geometry} attach="geometry" />
      <meshLambertMaterial color="#8a9660" flatShading {...grassWind} />
    </Scatter>
  );
}

/** Flat stepping stones marking the trail onward. */
export function TrailStones({ items }: { items: readonly Placement[] }) {
  const geometry = useGeometry(() => new CylinderGeometry(0.5, 0.56, 0.14, 6));
  return (
    <Scatter items={items}>
      <primitive object={geometry} attach="geometry" />
      <meshLambertMaterial color="#8f918a" flatShading />
    </Scatter>
  );
}

const CAIRN = [
  { y: 0.45, s: 0.9 },
  { y: 1.25, s: 0.7 },
  { y: 1.85, s: 0.55 },
  { y: 2.3, s: 0.42 },
  { y: 2.62, s: 0.3 },
];

/** A traveller's cairn: stacked stones, largest at the bottom. */
export function Cairn(props: GroupProps) {
  return (
    <group {...props}>
      {CAIRN.map((st, i) => (
        <mesh key={i} position={[(i % 2) * 0.08, st.y, 0]} rotation={[i, i * 1.7, 0]} scale={[st.s, st.s * 0.7, st.s]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshLambertMaterial color="#84867e" flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** Feathered alpha so mist banks have no visible edges. */
function useMistTexture() {
  const [texture] = useState(() => {
    // Square gradient, stretched by the plane into a soft ellipse fading to every edge.
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    // alphaMap reads the green channel, so paint opaque greyscale (white = solid, black = clear).
    const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.55, "#737373");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new CanvasTexture(canvas);
  });
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** A soft bank of low mist, drifted (and thickened in the opening) by the region. */
export const MistSheet = forwardRef<Mesh, MeshProps>(function MistSheet(props, ref) {
  const alpha = useMistTexture();
  return (
    <mesh ref={ref} {...props}>
      <planeGeometry args={[24, 6]} />
      <meshBasicMaterial color="#e8eef2" alphaMap={alpha} transparent opacity={0.35} depthWrite={false} />
    </mesh>
  );
});

export interface CrowsHandle {
  /** Advance the flock. With `flap` false the wings hold still (reduced motion). */
  update: (time: number, flap: boolean) => void;
}

/** A few crows circling high over the moor. */
export const Crows = forwardRef<CrowsHandle, GroupProps & { count: number; radius: number }>(function Crows(
  { count, radius, ...props },
  ref,
) {
  const birds = useRef<(Group | null)[]>([]);
  const wings = useRef<(Group | null)[]>([]);
  const [flight] = useState(() => {
    const rng = mulberry32(111);
    return Array.from({ length: count }, () => ({
      radius: radius * between(rng, 0.6, 1),
      speed: between(rng, 0.08, 0.14),
      phase: rng() * Math.PI * 2,
      height: between(rng, -1.5, 1.5),
    }));
  });

  useImperativeHandle(ref, () => ({
    update(time, flap) {
      flight.forEach((f, i) => {
        const bird = birds.current[i];
        if (!bird) return;
        const a = f.phase + time * f.speed;
        bird.position.set(Math.cos(a) * f.radius, f.height + Math.sin(time * 0.3 + i) * 0.4, Math.sin(a) * f.radius);
        bird.rotation.set(0, -a, 0.25); // heading along the circle, banked into the turn
        const beat = flap ? Math.sin(time * 7 + i * 1.3) * 0.55 : 0.12;
        const left = wings.current[i * 2];
        const right = wings.current[i * 2 + 1];
        if (left) left.rotation.z = beat;
        if (right) right.rotation.z = -beat;
      });
    },
  }));

  return (
    <group {...props}>
      {flight.map((_, i) => (
        <group
          key={i}
          ref={(g) => {
            birds.current[i] = g;
          }}
        >
          <mesh scale={[0.18, 0.14, 0.5]}>
            <octahedronGeometry args={[1, 0]} />
            <meshLambertMaterial color="#1b1c20" flatShading />
          </mesh>
          {[1, -1].map((side, k) => (
            // Each wing hinges at the body and flaps by rolling its pivot.
            <group
              key={side}
              ref={(g) => {
                wings.current[i * 2 + k] = g;
              }}
            >
              <mesh position={[side * 0.45, 0, 0]}>
                <boxGeometry args={[0.9, 0.02, 0.3]} />
                <meshLambertMaterial color="#1b1c20" />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
});
