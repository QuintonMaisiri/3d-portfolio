"use client";

/**
 * The Forge with real models (Quaternius Fantasy Props MegaKit, Updated
 * Modular Dungeon and Stylized Nature MegaKit, CC0). Same exports as
 * ../placeholders/forge; the story pieces (lava, orbs, embers, hearth) stay custom.
 */
import { forwardRef, Suspense, useImperativeHandle, useRef } from "react";
import { Color, type MeshBasicMaterial } from "three";
import type { Placement } from "@/components/world/Scatter";
import { Model, ModelMix, type ModelLook } from "@/components/world/ModelScatter";
import { MODELS } from "@/lib/models";
import type { Vec3 } from "@/lib/types";
import type { GroupProps } from "../placeholders/common";
import type { PedestalHandle } from "../placeholders/forge";

export {
  CrustPlates,
  GlowPoints,
  Hearth,
  MoltenPool,
  SkillOrbs,
  type MoltenPoolHandle,
  type PedestalHandle,
} from "../placeholders/forge";

/** Scorched, soot-dark stone and iron, still warm enough to read in the lava light. */
const ROCK_LOOK: ModelLook = { other: "#7a6660" };
const IRON_LOOK: ModelLook = { other: "#c8b8b0" };
const PEDESTAL_LOOK: ModelLook = { other: "#a8948a" };

export function Rocks({ items }: { items: readonly Placement[]; color?: string }) {
  return (
    <Suspense fallback={null}>
      <ModelMix urls={MODELS.rocks} items={items} look={ROCK_LOOK} scale={0.62} />
    </Suspense>
  );
}

/** The anvil on its log stump, about 1.4 tall. */
export function Anvil(props: GroupProps) {
  return (
    <Suspense fallback={null}>
      <group {...props}>
        <Model url={MODELS.props.anvilLog} look={IRON_LOOK} scale={1.3} />
      </group>
    </Suspense>
  );
}

/** One piece of smithy dressing: which model, where (region-local, on the ground), facing and size. */
export interface ForgeProp {
  kind: keyof typeof FORGE_PROPS;
  position: Vec3;
  rotation?: number;
  scale?: number;
}
const FORGE_PROPS = {
  workbench: MODELS.props.workbench,
  weaponStand: MODELS.props.weaponStand,
  whetstone: MODELS.props.whetstone,
  barrel: MODELS.props.barrel,
  crate: MODELS.props.crateMetal,
  chain: MODELS.props.chainCoil,
  cauldron: MODELS.props.cauldron,
} as const;

/** The working smithy around the hearth: bench, racks, barrels and chain. */
export function Smithy({ props }: { props: readonly ForgeProp[] }) {
  return (
    <Suspense fallback={null}>
      {props.map((p, i) => (
        <Model
          key={i}
          url={FORGE_PROPS[p.kind]}
          look={IRON_LOOK}
          position={p.position}
          rotation={[0, p.rotation ?? 0, 0]}
          scale={p.scale ?? 1.25}
        />
      ))}
    </Suspense>
  );
}

/** The pack pedestal is 2.19 tall; scaled so its top meets `height` plus the old cap. */
const PEDESTAL_HEIGHT = 2.19;
const CAP = 0.24;

/** A stone pedestal for one skill domain, with a ring that lights in the group's colour. Pivot at the base. */
export const Pedestal = forwardRef<PedestalHandle, GroupProps & { color: string; height: number }>(function Pedestal(
  { color, height, ...props },
  ref,
) {
  const ring = useRef<MeshBasicMaterial>(null);
  const colors = useRef({ off: new Color("#3a2a22"), on: new Color(color) });

  useImperativeHandle(ref, () => ({
    setLit(amount) {
      ring.current?.color.lerpColors(colors.current.off, colors.current.on, amount);
    },
  }));

  return (
    <group {...props}>
      <Suspense fallback={null}>
        <Model url={MODELS.dungeon.pedestal} look={PEDESTAL_LOOK} scale={[1, (height + CAP) / PEDESTAL_HEIGHT, 1]} />
      </Suspense>
      <mesh position={[0, height + CAP + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.55, 0.72, 24]} />
        <meshBasicMaterial ref={ring} color="#3a2a22" />
      </mesh>
    </group>
  );
});
