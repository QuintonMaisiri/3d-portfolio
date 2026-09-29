"use client";

/**
 * The Sunken Ruins with real models (Quaternius Ultimate Modular Ruins Pack,
 * CC0). Same exports as ../placeholders/ruins; the story pieces (tablets,
 * causeway, water, ripples, the "now" light) stay custom.
 */
import { forwardRef, Suspense } from "react";
import { BufferAttribute, BufferGeometry, type Points } from "three";
import type { Placement } from "@/components/world/Scatter";
import { Model, ModelMix, type ModelLook } from "@/components/world/ModelScatter";
import { MODELS } from "@/lib/models";
import { SoftPointsMaterial, useGeometry, type GroupProps } from "../placeholders/common";

export {
  Causeway,
  MilestoneTablet,
  Ripple,
  Water,
  type MilestoneTabletHandle,
} from "../placeholders/ruins";

/** Full glow size of the "you are here" light. */
export const NOW_SIZE = 1.6;

/** A soft light hovering over the latest milestone: "you are here". The region sets its opacity and moves it. */
export const NowMarker = forwardRef<Points, { color: string; position: readonly [number, number, number] }>(function NowMarker(
  { color, position },
  ref,
) {
  const geometry = useGeometry(() => new BufferGeometry().setAttribute("position", new BufferAttribute(new Float32Array(3), 3)));
  return (
    <points ref={ref} geometry={geometry} position={position}>
      <SoftPointsMaterial color={color} size={NOW_SIZE} opacity={0} additive />
    </points>
  );
});

/** Water-worn stone, pulled toward the lagoon's green. */
const STONE_LOOK: ModelLook = { foliage: "#c8dcc8", other: "#bccac2" };

const heightOf = (it: Placement) => (typeof it.scale === "number" ? it.scale : (it.scale?.[1] ?? 1));

/**
 * Broken columns of varying height (item scale y: 1 is 5 tall); pivot at the
 * base. Short stumps use the short column, so no capital is ever squashed flat.
 */
export function BrokenColumns({ items }: { items: readonly Placement[] }) {
  const tall = items.filter((it) => heightOf(it) >= 0.55);
  const short = items.filter((it) => heightOf(it) < 0.55);
  return (
    <Suspense fallback={null}>
      <ModelMix urls={[MODELS.ruins.column, MODELS.ruins.columnSquare]} items={tall} look={STONE_LOOK} scale={[1.7, 1.25, 1.7]} />
      <ModelMix urls={[MODELS.ruins.columnShort]} items={short} look={STONE_LOOK} scale={[2.25, 2.73, 2.25]} />
    </Suspense>
  );
}

/** Column drums lying where they fell (items are rotated onto their side). */
export function FallenColumns({ items }: { items: readonly Placement[] }) {
  return (
    <Suspense fallback={null}>
      <ModelMix urls={[MODELS.ruins.columnShort]} items={items} look={STONE_LOOK} scale={[2.2, 1.3, 2.2]} />
    </Suspense>
  );
}

/** A broken, overgrown archway, about 6.4 wide and tall. Pivot at the base centre. */
export function BrokenArch(props: GroupProps) {
  return (
    <Suspense fallback={null}>
      <group {...props}>
        <Model url={MODELS.ruins.archWallBroken} look={STONE_LOOK} scale={[1.6, 1.6, 2.5]} />
      </group>
    </Suspense>
  );
}

/**
 * Steps running down into the water (3.4 wide, 1.75 drop over 4.2); pivot at
 * the top step. The pack stairs rise toward +x, turned here to rise toward +z.
 */
export function SunkenSteps(props: GroupProps) {
  return (
    <Suspense fallback={null}>
      <group {...props}>
        <Model url={MODELS.ruins.stairs} look={STONE_LOOK} position={[0, -1.75, -2.1]} rotation={[0, -Math.PI / 2, 0]} scale={[2.1, 1.95, 1.6]} />
      </group>
    </Suspense>
  );
}

/** The old guardians, half sunk: a stag and a fox. */
export function Statues({ stag, fox }: { stag: GroupProps; fox: GroupProps }) {
  return (
    <Suspense fallback={null}>
      <group {...stag}>
        <Model url={MODELS.ruins.statueStag} look={STONE_LOOK} />
      </group>
      <group {...fox}>
        <Model url={MODELS.ruins.statueFox} look={STONE_LOOK} />
      </group>
    </Suspense>
  );
}

/** Stretches of broken wall standing in the water. */
export function BrokenWalls({ items }: { items: readonly Placement[] }) {
  return (
    <Suspense fallback={null}>
      <ModelMix urls={[MODELS.ruins.wallBroken]} items={items} look={STONE_LOOK} scale={1.4} />
    </Suspense>
  );
}
