"use client";

/**
 * The Storm Peaks with real models on the slopes (Quaternius Stylized Nature
 * MegaKit, CC0). Same exports as ../placeholders/peaks; the climbable
 * mountains, beacons, clouds, snow and lightning stay custom.
 */
import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { forwardRef, Suspense, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  LoopOnce,
  Mesh,
  MeshLambertMaterial,
  type Group,
  type MeshStandardMaterial,
  type Points,
} from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { DRACO_PATH } from "@/lib/assets";
import { easeOutCubic } from "@/lib/journey";
import type { Placement } from "@/components/world/Scatter";
import { Model, ModelMix, type ModelLook } from "@/components/world/ModelScatter";
import { MODELS } from "@/lib/models";
import { regionById } from "@/lib/regions";
import { windSway, withRim } from "@/lib/wind";
import { SoftPointsMaterial, useGeometry } from "../placeholders/common";
import { FAR_PINE_MODELS, ModelWoodland, PINE_MODELS } from "./woodland";

export { GlowPoints as ClimbMarkers } from "../placeholders/forge";
export {
  Bolt,
  Clouds,
  Mountain,
  MountainRange,
  Snow,
  type BoltHandle,
} from "../placeholders/peaks";

/** Full glow size of a lit summit beacon. */
export const BEACON_SIZE = 4.5;

/**
 * A signal fire on a summit: one soft glow. Starts dark; the region sets its
 * material's opacity and size as the case's climb completes.
 */
export const Beacon = forwardRef<Points, { color: string; position: readonly [number, number, number] }>(function Beacon(
  { color, position },
  ref,
) {
  const geometry = useGeometry(() => new BufferGeometry().setAttribute("position", new BufferAttribute(new Float32Array(position), 3)));
  return (
    <points ref={ref} geometry={geometry}>
      <SoftPointsMaterial color={color} size={BEACON_SIZE} opacity={0} additive />
    </points>
  );
});

/** Cold storm light: frosted needles, blue-grey stone. */
const PINE_LOOK: ModelLook = { foliage: "#b4c6c8", other: "#a8a4a4", wind: windSway(2, 0.05) };
const STONE_LOOK: ModelLook = { other: "#b8bec8" };
const DEAD_TREE_LOOK: ModelLook = { other: "#a8a8ac", wind: windSway(3, 0.015) };

export function Rocks({ items }: { items: readonly Placement[]; color?: string }) {
  return (
    <Suspense fallback={null}>
      <ModelMix urls={MODELS.rocks} items={items} look={STONE_LOOK} scale={0.62} />
    </Suspense>
  );
}

/** Wind-bent pines on the lower slopes. */
export function Pines({ items }: { items: readonly Placement[] }) {
  return <ModelWoodland region={regionById.peaks} items={items} look={PINE_LOOK} models={PINE_MODELS} farModels={FAR_PINE_MODELS} />;
}

/** Lightning-struck bare trees. */
export function DeadTrees({ items }: { items: readonly Placement[] }) {
  return (
    <Suspense fallback={null}>
      <ModelMix urls={MODELS.deadTrees} items={items} look={DEAD_TREE_LOOK} castShadow={false} />
    </Suspense>
  );
}

export interface BugRockHandle {
  /** 0 = the bug asleep under its boulder; rising to 1 as its case is discovered: the boulder rolls aside, the bug wakes and scuttles out. */
  setFound: (amount: number) => void;
}

const BEETLE_URL = "/models/creatures/ox-beetle.glb";
/** The pack beetle is ~6 long; bugs here are about knee-high to the adventurer. */
const BEETLE_SCALE = 0.19;
const BOULDER_URL = "/models/forest/rock-2.glb";
const BOULDER_SCALE = 0.42;
/** How far the bug runs out from under the boulder, and the boulder rolls aside. */
const RUN_OUT = 2.4;
const ROLL_ASIDE = 1.5;
const BEETLE_LOOK = "#d8d0d0";
/** The bug bolts off to one side of whoever lifted the boulder (radians from straight at them), the boulder rolls to the other. */
const BOLT_ANGLE = 1.1;

type BugClip = "SleepLoop" | "SleepEnd" | "Run" | "Idle" | "Fidget";

/**
 * A problem's bug: an ox beetle (Sketchfab, CC-BY-4.0, credited) asleep
 * under a boulder at the foot of its trail. Found, the boulder tips and
 * rolls aside, the beetle wakes, runs out toward the path and settles.
 * `out` is the direction (radians) it runs, toward the approaching visitor.
 */
const BugRockModel = forwardRef<BugRockHandle, { position: readonly [number, number, number]; out: number }>(function BugRockModel(
  { position, out },
  ref,
) {
  const { scene, animations } = useGLTF(BEETLE_URL, DRACO_PATH);
  const beetle = useMemo(() => {
    const c = cloneSkinned(scene);
    c.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const source = o.material as MeshStandardMaterial;
      o.material = Object.assign(
        new MeshLambertMaterial({ map: source.map, color: source.color.clone().multiply(new Color(BEETLE_LOOK)) }),
        withRim(),
      );
      o.castShadow = true;
      o.frustumCulled = false;
    });
    return c;
  }, [scene]);
  useEffect(
    () => () =>
      beetle.traverse((o) => {
        if (o instanceof Mesh) (o.material as MeshLambertMaterial).dispose();
      }),
    [beetle],
  );
  const body = useRef<Group>(null);
  const rig = useRef<Group>(null);
  const boulder = useRef<Group>(null);
  const { actions } = useAnimations(animations, rig);
  const clip = useRef<BugClip | null>(null);
  const amount = useRef(0);

  const play = (next: BugClip) => {
    if (clip.current === next) return;
    const action = actions[next];
    if (!action) return;
    // Waking plays once; the run takes over before it ends.
    if (next === "SleepEnd") action.setLoop(LoopOnce, 1);
    action.reset().fadeIn(0.25).play();
    if (clip.current) actions[clip.current]?.fadeOut(0.25);
    clip.current = next;
  };

  useImperativeHandle(ref, () => ({
    setFound(value) {
      amount.current = value;
    },
  }));

  useFrame(({ clock }) => {
    const a = amount.current;
    const t = clock.elapsedTime;
    const bolt = out + BOLT_ANGLE;
    const dx = Math.sin(bolt);
    const dz = Math.cos(bolt);
    // The boulder tips up and rolls aside the other way, over the first part.
    const roll = easeOutCubic(Math.min(1, a / 0.45));
    const away = out - BOLT_ANGLE;
    if (boulder.current) {
      boulder.current.position.set(Math.sin(away) * ROLL_ASIDE * roll, 0, Math.cos(away) * ROLL_ASIDE * roll);
      boulder.current.rotation.set(0, out, roll * 1.9);
    }
    // The bug wakes as light reaches it, then runs out and settles.
    const run = Math.min(1, Math.max(0, (a - 0.3) / 0.6));
    const eased = run * run * (3 - 2 * run);
    if (body.current) {
      body.current.position.set(dx * RUN_OUT * eased, 0, dz * RUN_OUT * eased);
      body.current.rotation.y = bolt;
    }
    if (a < 0.02) play("SleepLoop");
    else if (a < 0.3) play("SleepEnd");
    else if (a < 0.98) play("Run");
    else play(Math.sin(t * 0.21 + out * 3) > 0.93 ? "Fidget" : "Idle");
  });

  return (
    <group position={position} userData={{ walkThrough: true }}>
      <group ref={body}>
        <group ref={rig} scale={BEETLE_SCALE}>
          <primitive object={beetle} />
        </group>
      </group>
      <group ref={boulder}>
        <Suspense fallback={null}>
          <Model url={BOULDER_URL} look={STONE_LOOK} scale={BOULDER_SCALE} position={[0, -0.05, 0]} />
        </Suspense>
      </group>
    </group>
  );
});

/** A bug under its boulder (appears once the models have loaded). */
export const BugRock = forwardRef<BugRockHandle, { position: readonly [number, number, number]; out: number }>(function BugRock(
  props,
  ref,
) {
  return (
    <Suspense fallback={null}>
      <BugRockModel ref={ref} {...props} />
    </Suspense>
  );
});
