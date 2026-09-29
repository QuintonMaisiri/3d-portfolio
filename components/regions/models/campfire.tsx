"use client";

/**
 * The Campfire with real models (Quaternius Stylized Nature, Fantasy Props,
 * Medieval Village and Updated Modular Dungeon packs, CC0). Same exports as
 * ../placeholders/campfire; the raven, moon, stars and tent stay custom.
 */
import { forwardRef, Suspense } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, type Group } from "three";
import type { Placement } from "@/components/world/Scatter";
import { Model, ModelMix, type ModelLook } from "@/components/world/ModelScatter";
import { MODELS } from "@/lib/models";
import { regionById } from "@/lib/regions";
import type { Vec3 } from "@/lib/types";
import { windSway } from "@/lib/wind";
import { useGeometry, useSoftDot, type GroupProps } from "../placeholders/common";
import { ModelWoodland } from "./woodland";

export { GlowPoints, Moon, Raven, Stars, Tent, type RavenHandle } from "../placeholders/campfire";

/** Night woodland: the same trees, cooled and dimmed toward the campfire's blue dark. */
const NIGHT_LOOK: ModelLook = { foliage: "#9cb0b8", other: "#a89c92", wind: windSway(2, 0.02) };
/** Camp gear by firelight: warm, a little dim. */
const CAMP_LOOK: ModelLook = { other: "#d8c4b0" };
const STONE_LOOK: ModelLook = { other: "#a8a8b4" };
const WOODFIRE_LOOK: ModelLook = { other: "#ffffff", glow: { match: /fire/, color: "#ff8a3a" } };

export function Trees({ items }: { items: readonly Placement[] }) {
  return <ModelWoodland region={regionById.campfire} items={items} look={NIGHT_LOOK} />;
}

/** Soft flame glows stacked over the logs: [height, size, colour]. */
const FLAMES: readonly (readonly [number, number, string])[] = [
  [0.45, 2.6, "#ff6a1a"],
  [0.75, 1.7, "#ffa040"],
  [0.95, 1.0, "#ffe0a0"],
];

/** One soft additive glow. */
function FlameGlow({ y, size, color }: { y: number; size: number; color: string }) {
  const dot = useSoftDot();
  const geometry = useGeometry(() => new BufferGeometry().setAttribute("position", new BufferAttribute(new Float32Array([0, y, 0]), 3)));
  return (
    <points geometry={geometry}>
      <pointsMaterial map={dot} color={color} size={size} sizeAttenuation transparent depthWrite={false} blending={AdditiveBlending} />
    </points>
  );
}

/** The pack woodfire (logs and a low flame), with soft glows rising from it. The region flickers `flames`. */
export const Fire = forwardRef<Group, GroupProps>(function Fire(props, flames) {
  return (
    <group {...props}>
      <Suspense fallback={null}>
        <Model url={MODELS.dungeon.woodfire} look={WOODFIRE_LOOK} scale={1.7} />
      </Suspense>
      <group ref={flames} position={[0, 0.3, 0]}>
        {FLAMES.map(([y, size, color]) => (
          <FlameGlow key={color} y={y} size={size} color={color} />
        ))}
      </group>
    </group>
  );
});

/** A bench to sit on; pivot at its centre on the ground. */
export function LogBench(props: GroupProps) {
  return (
    <Suspense fallback={null}>
      <group {...props}>
        <Model url={MODELS.props.bench} look={CAMP_LOOK} scale={0.9} />
      </group>
    </Suspense>
  );
}

/** Fire-ring stones. */
export function Stones({ items }: { items: readonly Placement[] }) {
  return (
    <Suspense fallback={null}>
      <ModelMix urls={MODELS.rocks} items={items} look={STONE_LOOK} scale={[0.2, 0.16, 0.2]} castShadow={false} />
    </Suspense>
  );
}

/** One piece of camp gear: which model, where (region-local, on the ground), facing and size. */
export interface CampProp {
  kind: keyof typeof CAMP_PROPS;
  position: Vec3;
  rotation?: number;
  scale?: number;
}
const CAMP_PROPS = {
  wagon: MODELS.village.wagon,
  crate: MODELS.village.crate,
  barrel: MODELS.props.barrel,
  bag: MODELS.props.bag,
  pot: MODELS.props.pot,
} as const;

/** The travellers' camp: wagon, crates, barrels and packs. */
export function CampGear({ props }: { props: readonly CampProp[] }) {
  return (
    <Suspense fallback={null}>
      {props.map((p, i) => (
        <Model
          key={i}
          url={CAMP_PROPS[p.kind]}
          look={CAMP_LOOK}
          position={p.position}
          rotation={[0, p.rotation ?? 0, 0]}
          scale={p.scale ?? 1}
        />
      ))}
    </Suspense>
  );
}
