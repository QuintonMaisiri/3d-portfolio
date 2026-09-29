"use client";

/**
 * The Archive with real models (Quaternius Fantasy Props MegaKit and
 * Ultimate Modular Ruins Pack, CC0). Same exports as ../placeholders/archive;
 * the story pieces (scroll, floor mosaic, dust) stay custom.
 */
import { Suspense } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry } from "three";
import type { Placement } from "@/components/world/Scatter";
import { Model, ModelMix, type ModelLook } from "@/components/world/ModelScatter";
import { MODELS } from "@/lib/models";
import { useGeometry, useSoftDot, type GroupProps } from "../placeholders/common";

export {
  DustMotes,
  FloorMosaic,
  HangingScroll,
  SCROLL_PARAGRAPHS,
  type ScrollHandle,
} from "../placeholders/archive";

/** Warm candlelit wood and stone, a touch darker than the packs' daylight colours. */
const WOOD_LOOK: ModelLook = { other: "#d8c8b4" };
const STONE_LOOK: ModelLook = { other: "#c8bcb0" };
const RUBBLE_LOOK: ModelLook = { other: "#9a8a7c" };

/**
 * Tall bookcases (about 3 x 5.5 x 0.9 at scale 1, pivot at the base, facing +z),
 * alternating the two pack designs.
 */
export function Bookshelves({ items }: { items: readonly Placement[] }) {
  const full = items.filter((_, k) => k % 2 === 0);
  const plain = items.filter((_, k) => k % 2 === 1);
  return (
    <Suspense fallback={null}>
      <ModelMix urls={[MODELS.ruins.bookcase]} items={full} look={WOOD_LOOK} scale={[1.45, 2.07, 1.4]} />
      <ModelMix urls={[MODELS.props.bookcase]} items={plain} look={WOOD_LOOK} scale={[2.05, 2.16, 2.1]} />
    </Suspense>
  );
}

/** Stone columns, 8 tall; pivot at the base. */
export function Pillars({ items }: { items: readonly Placement[] }) {
  return (
    <Suspense fallback={null}>
      <ModelMix urls={[MODELS.ruins.column]} items={items} look={STONE_LOOK} scale={[1.8, 2, 1.8]} />
    </Suspense>
  );
}

/** Worn stone steps (4.2 x 1.1); pivot at the top face. */
export function Steps({ items }: { items: readonly Placement[] }) {
  return (
    <Suspense fallback={null}>
      <group position={[0, -0.27, 0]}>
        <ModelMix urls={[MODELS.pathSlab]} items={items} look={STONE_LOOK} scale={[2.1, 1.5, 0.55]} castShadow={false} />
      </group>
    </Suspense>
  );
}

/** The pack arch's opening: 1.03 either side of centre, 2.92 high. */
const ARCH_OPENING = { halfWidth: 1.03, top: 2.92 };

/**
 * The threshold into the Archive; the camera passes beneath it. Pivot at the
 * base centre. The opening is scaled to `span` (less the pillars) and `height`.
 */
export function Archway({ height, span, ...props }: GroupProps & { height: number; span: number }) {
  const sx = (span / 2 - 0.65) / ARCH_OPENING.halfWidth;
  return (
    <Suspense fallback={null}>
      <group {...props}>
        <Model url={MODELS.ruins.arch} look={STONE_LOOK} scale={[sx, height / ARCH_OPENING.top, 2.2]} />
      </group>
    </Suspense>
  );
}

export function Lectern(props: GroupProps) {
  return (
    <Suspense fallback={null}>
      <group {...props}>
        <Model url={MODELS.props.bookStand} look={WOOD_LOOK} scale={1.1} />
      </group>
    </Suspense>
  );
}

/** A small stack of books by the lectern. Pivot at the base. */
export function BookStack(props: GroupProps) {
  return (
    <Suspense fallback={null}>
      <group {...props}>
        <Model url={MODELS.props.bookStacks[0]!} scale={3} rotation={[0, -0.4, 0]} />
        <Model url={MODELS.props.bookStacks[1]!} scale={2.6} position={[0.05, 0.6, 0]} rotation={[0, 0.5, 0]} />
      </group>
    </Suspense>
  );
}

/** Wax height at scale 1 (the pack candle, scaled to match the old placeholder). */
const CANDLE_SCALE = 1.8;
const FLAME_Y = 0.25 * CANDLE_SCALE + 0.08;

/** Floating candles, each with a soft additive flame. Pivot at the wax base. */
export function Candles({ items }: { items: readonly Placement[] }) {
  const dot = useSoftDot();
  const flames = useGeometry(() => {
    const positions = new Float32Array(items.length * 3);
    items.forEach((it, i) => {
      const s = typeof it.scale === "number" ? it.scale : (it.scale?.[1] ?? 1);
      positions.set([it.position[0], it.position[1] + FLAME_Y * s, it.position[2]], i * 3);
    });
    return new BufferGeometry().setAttribute("position", new BufferAttribute(positions, 3));
  });
  return (
    <>
      <Suspense fallback={null}>
        <ModelMix urls={[MODELS.props.candle]} items={items} scale={CANDLE_SCALE} castShadow={false} />
      </Suspense>
      <points geometry={flames}>
        <pointsMaterial
          map={dot}
          color="#ffc86a"
          size={0.55}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </>
  );
}

/** Fallen masonry around the edges: broken bricks, pots and dark rocks. */
export function Rubble({ items }: { items: readonly Placement[] }) {
  const rocks = items.filter((_, k) => k % 3 === 0);
  const bricks = items.filter((_, k) => k % 3 === 1);
  const pots = items.filter((_, k) => k % 3 === 2);
  return (
    <Suspense fallback={null}>
      <ModelMix urls={MODELS.rocks} items={rocks} look={RUBBLE_LOOK} scale={0.5} />
      <ModelMix urls={[MODELS.ruins.bricks]} items={bricks} look={RUBBLE_LOOK} />
      <ModelMix urls={MODELS.ruins.pots} items={pots} look={RUBBLE_LOOK} castShadow={false} />
    </Suspense>
  );
}
