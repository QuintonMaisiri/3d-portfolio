"use client";

/**
 * The Enchanted Forest with real models (Quaternius Stylized Nature MegaKit,
 * CC0), built by `npm run models`. Same exports as ../placeholders/forest, so
 * Forest.tsx swaps between them by changing one import. While models load,
 * the placeholders stand in.
 */
import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { forwardRef, Suspense, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  LoopOnce,
  Mesh,
  MeshLambertMaterial,
  type Group,
  type MeshStandardMaterial,
  type MeshBasicMaterial as BasicMaterial,
  type PointsMaterial,
} from "three";
import { type Placement } from "@/components/world/Scatter";
import { ModelScatter, useModelParts, type ModelLook } from "@/components/world/ModelScatter";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { DRACO_PATH } from "@/lib/assets";
import { easeOutCubic } from "@/lib/journey";
import { regionById } from "@/lib/regions";
import { useCodex } from "@/lib/store";
import { windSway, withRim } from "@/lib/wind";
import { PROJECT_TREE_HEIGHT, type ProjectTreeHandle } from "../placeholders/forest";
import { useGeometry, useSoftDot, type GroupProps } from "../placeholders/common";
import { ModelWoodland } from "./woodland";

export { Fireflies, LightShaft, PROJECT_TREE_HEIGHT, type ProjectTreeHandle } from "../placeholders/forest";

const MODELS = "/models/forest";
const TWISTED = [1, 2, 3, 4, 5].map((n) => `${MODELS}/twisted-tree-${n}.glb`);
const UNDERGROWTH = {
  bush: `${MODELS}/bush.glb`,
  bushFlowers: `${MODELS}/bush-flowers.glb`,
  fern: `${MODELS}/fern.glb`,
  plant: `${MODELS}/plant.glb`,
  grass: `${MODELS}/grass.glb`,
  rocks: [1, 2, 3].map((n) => `${MODELS}/rock-${n}.glb`),
};

/** The forest's palette pull: slightly cool leaves, warm bark. Light enough to keep the pack's own greens. */
const WOODLAND_LOOK: ModelLook = { foliage: "#e2f2e8", other: "#e6dccf", wind: windSway(2, 0.03) };
const UNDERGROWTH_LOOK: ModelLook = { foliage: "#e6f4ea", other: "#ddd3c8", wind: windSway(0.2, 0.12) };
const ROCK_LOOK: ModelLook = { other: "#c4ccc6" };

/** Woodland: every tree a real model (none too close to the camera's route). */
export function ForestTrees({ items }: { items: readonly Placement[] }) {
  return <ModelWoodland region={regionById.forest} items={items} look={WOODLAND_LOOK} />;
}

/** Ferns, bushes, plants, grass and rocks on the forest floor. */
export function Undergrowth({ items }: { items: readonly Placement[] }) {
  const kinds = [UNDERGROWTH.bush, UNDERGROWTH.bushFlowers, UNDERGROWTH.fern, UNDERGROWTH.plant, UNDERGROWTH.grass, UNDERGROWTH.grass, ...UNDERGROWTH.rocks];
  return (
    <Suspense fallback={null}>
      {kinds.map((url, m) => (
        <ModelScatter
          key={`${url}-${m}`}
          url={url}
          items={items.filter((_, k) => k % kinds.length === m)}
          look={UNDERGROWTH.rocks.includes(url) ? ROCK_LOOK : UNDERGROWTH_LOOK}
          solid={UNDERGROWTH.rocks.includes(url)}
        />
      ))}
    </Suspense>
  );
}

const MUSHROOM_LOOK: ModelLook = { other: "#e8e2da" };

/** Mushroom clusters on the forest floor, in the pack's own colours so they sit with the trees. */
export function Mushrooms({ items }: { items: readonly Placement[]; color?: string }) {
  // Shelf fungus is ~1.4 across at scale 1: kept smaller than the caps beside it.
  const shelves = items.filter((_, k) => k % 3 === 2).map((it) => ({ ...it, scale: (typeof it.scale === "number" ? it.scale : 1) * 0.5 }));
  return (
    <Suspense fallback={null}>
      <ModelScatter url={`${MODELS}/mushroom.glb`} items={items.filter((_, k) => k % 3 !== 2)} look={MUSHROOM_LOOK} castShadow={false} solid={false} />
      <ModelScatter url={`${MODELS}/mushroom-shelf.glb`} items={shelves} look={MUSHROOM_LOOK} castShadow={false} solid={false} />
    </Suspense>
  );
}

const PROJECT_TREE_SCALE = 0.34;

const LANTERNS = [
  [1.25, 3.3, 0.4],
  [-1.1, 3.5, -0.5],
  [0.3, 4.7, 1.0],
  [-0.7, 4.9, 0.6],
  [0.8, 6.0, -0.4],
] as const;
const LANTERN_SIZE = 0.9;

/** A twisted tree from the pack, wearing the project tree's lanterns and root ring. */
const ModelProjectTree = forwardRef<ProjectTreeHandle, GroupProps & { accent: string; variant: number }>(
  function ModelProjectTree({ accent, variant, ...props }, ref) {
    // The twisted trees' own autumn reds set the project trees apart from the green woodland; no tint.
    const parts = useModelParts(TWISTED[variant % TWISTED.length]!, { wind: windSway(6, 0.012) });
    const ring = useRef<Mesh>(null);
    const ringMaterial = useRef<BasicMaterial>(null);
    const lanternMaterial = useRef<PointsMaterial>(null);
    const dot = useSoftDot();
    const lanternGeometry = useGeometry(() =>
      new BufferGeometry().setAttribute("position", new BufferAttribute(new Float32Array(LANTERNS.flat()), 3)),
    );
    const colors = useRef({
      dormant: new Color("#000000"),
      // A faint warm glow, not a wash: the lanterns and root ring carry the "project" signal.
      lit: new Color("#ffb070").multiplyScalar(0.06),
      hover: new Color("#ffb070").multiplyScalar(0.16),
      lanternOff: new Color("#1a2622"),
      lanternOn: new Color(accent),
      lanternHot: new Color("#ffffff"),
      scratch: new Color(),
    });

    useImperativeHandle(ref, () => ({
      setGlow(lit, hover) {
        const c = colors.current;
        if (ringMaterial.current) ringMaterial.current.opacity = 0.12 + 0.68 * lit + 0.2 * hover;
        ring.current?.scale.setScalar(0.75 + 0.25 * lit + 0.15 * hover);
        c.scratch.lerpColors(c.dormant, c.lit, lit).lerp(c.hover, hover);
        parts.forEach((p) => p.foliage && p.material.emissive.copy(c.scratch));
        const lantern = lanternMaterial.current;
        if (lantern) {
          lantern.color.lerpColors(c.lanternOff, c.lanternOn, lit).lerp(c.lanternHot, hover * 0.35);
          lantern.size = LANTERN_SIZE * (0.8 + 0.2 * lit + 0.3 * hover);
        }
      },
    }));

    return (
      <group {...props}>
        <group scale={PROJECT_TREE_SCALE}>
          {parts.map((p, i) => (
            <mesh key={i} geometry={p.geometry} material={p.material} castShadow receiveShadow userData={{ walkThrough: p.foliage }} />
          ))}
        </group>
        {/* Lanterns: soft additive glows hanging in the branches. */}
        <points geometry={lanternGeometry}>
          <pointsMaterial
            ref={lanternMaterial}
            map={dot}
            color="#1a2622"
            size={LANTERN_SIZE * 0.8}
            sizeAttenuation
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </points>
        <mesh ref={ring} position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.1, 1.35, 20]} />
          <meshBasicMaterial ref={ringMaterial} color={accent} transparent opacity={0.12} />
        </mesh>
        {/* Hit area: invisible (no colour or depth writes) but raycastable. */}
        <mesh position={[0, PROJECT_TREE_HEIGHT / 2, 0]}>
          <cylinderGeometry args={[1.7, 1.7, PROJECT_TREE_HEIGHT, 8]} />
          <meshBasicMaterial colorWrite={false} depthWrite={false} />
        </mesh>
      </group>
    );
  },
);

/** A project tree (appears once its model has loaded, a moment after page load). */
export const ProjectTree = forwardRef<ProjectTreeHandle, GroupProps & { accent: string; variant?: number }>(
  function ProjectTree({ variant = 0, ...props }, ref) {
    return (
      <Suspense fallback={null}>
        <ModelProjectTree ref={ref} variant={variant} {...props} />
      </Suspense>
    );
  },
);

export interface ProjectChestHandle {
  /** 0 = closed, rising to 1 as its project is discovered: the lid opens, light spills, the scroll rises. */
  setOpen: (amount: number) => void;
}

const CHEST_URL = "/models/props/chest-wood.glb";
const SCROLL_URL = "/models/props/scroll-1.glb";
const CHEST_LOOK: ModelLook = { other: "#e8dcc8" };
/** Where the scroll floats once risen, above the chest's base. */
const SCROLL_RISE = [0.35, 1.5] as const;

/** The chest at a project tree's roots (Fantasy Props MegaKit, rigged with Chest_Open). */
const ChestModel = forwardRef<ProjectChestHandle, GroupProps & { glow: string }>(function ChestModel({ glow, ...props }, ref) {
  const { scene, animations } = useGLTF(CHEST_URL, DRACO_PATH);
  // Six chests share one file: each needs its own skeleton.
  const copy = useMemo(() => {
    const c = cloneSkinned(scene);
    c.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const source = o.material as MeshStandardMaterial;
      o.material = Object.assign(
        new MeshLambertMaterial({ map: source.map, color: source.color.clone().multiply(new Color(CHEST_LOOK.other)) }),
        withRim(),
      );
      o.castShadow = true;
      o.frustumCulled = false;
    });
    return c;
  }, [scene]);
  useEffect(
    () => () =>
      copy.traverse((o) => {
        if (o instanceof Mesh) (o.material as MeshLambertMaterial).dispose();
      }),
    [copy],
  );
  const body = useRef<Group>(null);
  const { actions } = useAnimations(animations, body);
  const scroll = useModelParts(SCROLL_URL, CHEST_LOOK);
  const artifact = useRef<Group>(null);
  const spill = useRef<PointsMaterial>(null);
  const halo = useRef<PointsMaterial>(null);
  const opened = useRef<boolean | null>(null);
  const amount = useRef(0);
  const dot = useSoftDot();
  const spillGeometry = useGeometry(() => new BufferGeometry().setAttribute("position", new BufferAttribute(new Float32Array([0, 0.55, 0]), 3)));

  useImperativeHandle(ref, () => ({
    setOpen(value) {
      amount.current = value;
      const open = value > 0.02;
      if (open === opened.current) return;
      // Already open when first seen (a returning visitor): rest open, don't replay.
      const clip = open ? (opened.current === null && value >= 1 ? "Chest_Opened" : "Chest_Open") : "Chest_Closed";
      opened.current = open;
      for (const a of Object.values(actions)) a?.stop();
      const action = actions[clip];
      if (!action) return;
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
      action.reset().play();
    },
  }));

  useFrame(({ clock }) => {
    const a = easeOutCubic(amount.current);
    const t = clock.elapsedTime;
    const still = useCodex.getState().reducedMotion;
    if (artifact.current) {
      artifact.current.visible = a > 0.01;
      artifact.current.position.y = SCROLL_RISE[0] + (SCROLL_RISE[1] - SCROLL_RISE[0]) * a + (still ? 0 : Math.sin(t * 1.6) * 0.06 * a);
      if (!still) artifact.current.rotation.y = t * 0.7;
    }
    if (spill.current) spill.current.opacity = a * (0.75 + (still ? 0 : 0.15 * Math.sin(t * 3.1)));
    if (halo.current) halo.current.opacity = a * 0.9;
  });

  return (
    <group {...props} userData={{ walkThrough: true }}>
      <group ref={body}>
        <primitive object={copy} />
      </group>
      {/* Light spilling out of the open lid, and a halo round the rising scroll. */}
      <points geometry={spillGeometry}>
        <pointsMaterial ref={spill} map={dot} color={glow} size={2.8} sizeAttenuation transparent opacity={0} depthWrite={false} blending={AdditiveBlending} />
      </points>
      <group ref={artifact} visible={false}>
        <group rotation={[0, 0, Math.PI / 2]} scale={3}>
          {scroll.map((p, i) => (
            <mesh key={i} geometry={p.geometry} material={p.material} />
          ))}
        </group>
        <points geometry={spillGeometry} position={[0, -0.55, 0]}>
          <pointsMaterial ref={halo} map={dot} color="#fff3d6" size={1.3} sizeAttenuation transparent opacity={0} depthWrite={false} blending={AdditiveBlending} />
        </points>
      </group>
    </group>
  );
});

/** A project's chest (appears once its model has loaded). */
export const ProjectChest = forwardRef<ProjectChestHandle, GroupProps & { glow: string }>(function ProjectChest(props, ref) {
  return (
    <Suspense fallback={null}>
      <ChestModel ref={ref} {...props} />
    </Suspense>
  );
});
