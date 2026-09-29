"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  OctahedronGeometry,
  type Mesh,
  type Points,
} from "three";
import { Scatter, type Placement } from "@/components/world/Scatter";
import { mulberry32, between } from "@/lib/random";
import { SoftPointsMaterial, useGeometry, type GroupProps } from "./common";

/** Tall bookcases; pivot at the base. */
export function Bookshelves({ items }: { items: readonly Placement[] }) {
  const body = useGeometry(() => new BoxGeometry(3, 5.5, 0.9).translate(0, 2.75, 0));
  const books = useGeometry(() => new BoxGeometry(2.6, 4.6, 0.5).translate(0, 2.8, 0.25));
  return (
    <>
      <Scatter items={items}>
        <primitive object={body} attach="geometry" />
        <meshLambertMaterial color="#5a3b26" flatShading />
      </Scatter>
      <Scatter items={items}>
        <primitive object={books} attach="geometry" />
        <meshLambertMaterial color="#7a4a3a" flatShading />
      </Scatter>
    </>
  );
}

/** Stone columns; pivot at the base. */
export function Pillars({ items }: { items: readonly Placement[] }) {
  const geometry = useGeometry(() => new CylinderGeometry(0.55, 0.65, 8, 8).translate(0, 4, 0));
  return (
    <Scatter items={items}>
      <primitive object={geometry} attach="geometry" />
      <meshLambertMaterial color="#6e6258" flatShading />
    </Scatter>
  );
}

/** Worn stone steps; pivot at the top face. */
export function Steps({ items }: { items: readonly Placement[] }) {
  const geometry = useGeometry(() => new BoxGeometry(4.2, 0.5, 1.1).translate(0, -0.25, 0));
  return (
    <Scatter items={items}>
      <primitive object={geometry} attach="geometry" />
      <meshLambertMaterial color="#7a6e62" flatShading />
    </Scatter>
  );
}

/** The threshold into the Archive; the camera passes beneath it. Pivot at the base centre. */
export function Archway({ height, span, ...props }: GroupProps & { height: number; span: number }) {
  return (
    <group {...props}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * span) / 2, height / 2, 0]}>
          <boxGeometry args={[1.3, height, 1.3]} />
          <meshLambertMaterial color="#6e6258" flatShading />
        </mesh>
      ))}
      <mesh position={[0, height + 0.6, 0]}>
        <boxGeometry args={[span + 2.2, 1.2, 1.6]} />
        <meshLambertMaterial color="#62574e" flatShading />
      </mesh>
      <mesh position={[0, height + 1.5, 0]}>
        <boxGeometry args={[span * 0.5, 0.6, 1.2]} />
        <meshLambertMaterial color="#584e46" flatShading />
      </mesh>
    </group>
  );
}

export function Lectern(props: GroupProps) {
  return (
    <group {...props}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.25, 0.4, 1.2, 6]} />
        <meshLambertMaterial color="#4a3020" flatShading />
      </mesh>
      <mesh position={[0, 1.3, 0]} rotation={[-0.5, 0, 0]}>
        <boxGeometry args={[1.8, 0.12, 1.1]} />
        <meshLambertMaterial color="#5a3b26" flatShading />
      </mesh>
    </group>
  );
}

/** Book sizes and colours, bottom to top, with the y each one rests at. */
const BOOKS = [
  { h: 0.22, w: 1.0, d: 0.7, c: "#6b2f2a" },
  { h: 0.18, w: 0.9, d: 0.65, c: "#2f4a5a" },
  { h: 0.25, w: 0.95, d: 0.7, c: "#5a4a2a" },
  { h: 0.16, w: 0.8, d: 0.6, c: "#3f2f4a" },
].map((b, i, all) => ({ ...b, y: all.slice(0, i).reduce((sum, x) => sum + x.h, 0) + b.h / 2 }));

/** A small stack of books by the lectern. Pivot at the base. */
export function BookStack(props: GroupProps) {
  return (
    <group {...props}>
      {BOOKS.map((b, i) => (
        <mesh key={i} position={[0, b.y, 0]} rotation={[0, i * 0.35 - 0.4, 0]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshLambertMaterial color={b.c} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** Inlaid floor: a raised disc with pale rings. Its sides sink into uneven ground. */
export function FloorMosaic({ radius, ...props }: GroupProps & { radius: number }) {
  return (
    <group {...props}>
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[radius, radius, 0.8, 24]} />
        <meshLambertMaterial color="#54402f" flatShading />
      </mesh>
      {[radius * 0.78, radius * 0.4].map((r) => (
        <mesh key={r} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r - 0.25, r, 32]} />
          <meshLambertMaterial color="#9c7c48" />
        </mesh>
      ))}
    </group>
  );
}

/** Ink lines on the scroll: [paragraph, depth below the top roller, width]. */
const INK: readonly (readonly [number, number, number])[] = [
  [0, 0.35, 1.8],
  [0, 0.55, 1.6],
  [0, 0.75, 1.1],
  [1, 1.1, 1.7],
  [1, 1.3, 1.8],
  [1, 1.5, 1.4],
  [2, 1.85, 1.8],
  [2, 2.05, 1.5],
  [2, 2.25, 0.9],
  [3, 2.6, 1.2],
  [3, 2.8, 1.6],
];
/** Each ink line's order within its paragraph, and that paragraph's line count. */
const INK_ORDER = INK.map(([para], k) => ({
  order: INK.slice(0, k).filter((l) => l[0] === para).length,
  count: INK.filter((l) => l[0] === para).length,
}));
/** How many paragraphs of ink the scroll holds. */
export const SCROLL_PARAGRAPHS = 4;

export interface ScrollHandle {
  /** Unroll 0..1, and how far each paragraph's ink has been written, 0..1 each. */
  update: (unroll: number, ink: readonly number[]) => void;
}

/**
 * A hanging scroll: top roller, parchment and bottom roller. It unrolls
 * downward, then ink writes itself across it left to right, paragraph by
 * paragraph.
 */
export const HangingScroll = forwardRef<ScrollHandle, GroupProps & { length: number }>(function HangingScroll(
  { length, ...props },
  ref,
) {
  const sheet = useRef<Mesh>(null);
  const bottom = useRef<Mesh>(null);
  const lines = useRef<(Mesh | null)[]>([]);
  const sheetGeometry = useGeometry(() => new BoxGeometry(2.3, 1, 0.03).translate(0, -0.5, 0));
  // Pivot at the left end, so scaling x writes the line from the left.
  const inkGeometry = useGeometry(() => new BoxGeometry(1, 0.07, 0.01).translate(0.5, 0, 0));

  useImperativeHandle(ref, () => ({
    update(unroll, ink) {
      const drop = Math.max(0.02, length * unroll);
      if (sheet.current) sheet.current.scale.y = drop;
      if (bottom.current) bottom.current.position.y = -drop;
      INK.forEach(([para, depth, width], k) => {
        const line = lines.current[k];
        if (!line) return;
        const { order, count } = INK_ORDER[k]!;
        const written = Math.min(1, Math.max(0, (ink[para] ?? 0) * count - order));
        line.visible = written > 0.001 && drop > depth;
        line.scale.x = Math.max(0.001, width * written);
      });
    },
  }));

  return (
    <group {...props}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.14, 0.14, 2.6, 8]} />
        <meshLambertMaterial color="#6b4a2e" flatShading />
      </mesh>
      <mesh ref={sheet} geometry={sheetGeometry}>
        <meshLambertMaterial color="#d9c89c" emissive="#1c160c" />
      </mesh>
      {INK.map(([, depth], k) => (
        <mesh
          key={k}
          ref={(m) => {
            lines.current[k] = m;
          }}
          geometry={inkGeometry}
          position={[-0.95, -depth, 0.025]}
          visible={false}
        >
          <meshBasicMaterial color="#3a2616" />
        </mesh>
      ))}
      <mesh ref={bottom} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.16, 0.16, 2.6, 8]} />
        <meshLambertMaterial color="#6b4a2e" flatShading />
      </mesh>
    </group>
  );
});

/** Floating candles: wax and flame share placements. Pivot at the wax base. */
export function Candles({ items }: { items: readonly Placement[] }) {
  const wax = useGeometry(() => new CylinderGeometry(0.07, 0.08, 0.45, 6).translate(0, 0.225, 0));
  const flame = useGeometry(() => new OctahedronGeometry(0.075, 0).scale(1, 1.8, 1).translate(0, 0.56, 0));
  return (
    <>
      <Scatter items={items}>
        <primitive object={wax} attach="geometry" />
        <meshLambertMaterial color="#efe3c8" emissive="#3a2a12" flatShading />
      </Scatter>
      <Scatter items={items}>
        <primitive object={flame} attach="geometry" />
        <meshBasicMaterial color="#ffd27a" />
      </Scatter>
    </>
  );
}

/** Dust drifting in the candlelight. */
export const DustMotes = forwardRef<Points, { count: number }>(function DustMotes({ count }, ref) {
  const geometry = useGeometry(() => {
    const rng = mulberry32(204);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = between(rng, -10, 10);
      positions[i * 3 + 1] = between(rng, 0.5, 7);
      positions[i * 3 + 2] = between(rng, -10, 6);
    }
    return new BufferGeometry().setAttribute("position", new BufferAttribute(positions, 3));
  });
  return (
    <points ref={ref} geometry={geometry}>
      <SoftPointsMaterial color="#ffdca8" size={0.16} opacity={0.55} additive />
    </points>
  );
});
