"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { BufferAttribute, Color, Object3D, type Group, type InstancedMesh, type Points } from "three";
import { skillGroups } from "@/content/skills";
import { easeOutCubic, lerp } from "@/lib/journey";
import { sceneBeat } from "@/lib/narrative";
import { mulberry32, between } from "@/lib/random";
import { regionById, SKILL_GROUP_COLORS } from "@/lib/regions";
import {
  Anvil,
  CrustPlates,
  GlowPoints,
  Hearth,
  MoltenPool,
  Pedestal,
  Rocks,
  SkillOrbs,
  Smithy,
  type ForgeProp,
  type MoltenPoolHandle,
  type PedestalHandle,
} from "./models/forge";
import { Interactable } from "@/components/world/explore/Interaction";
import { ambientMotion, groundAt, RegionSlot, scatter, useRegionFrame } from "./shared";

const region = regionById.forge;
const ground = groundAt(region);

/*
 * Layout: the wide Skills panel covers the right ~60% of the frame, so the
 * scene is composed in the open left side. At depth d the visible band runs
 * from about x = 6.5 - 0.75d (frame edge) to 6.5 - 0.28d (panel edge).
 */
const POOL = { x: 1, z: 3, radius: 4 };
const POOL_RADIUS = POOL.radius;
const POOL_Y = ground(POOL.x, POOL.z) + 0.08;
const ANVIL = { x: -2.4, z: -0.4 };
const HEARTH = { x: -4, z: -10 };
const EMBER_COUNT = 160;
const EMBER_HEIGHT = 7;
/** Orbs float this high above their pedestal's top. */
const HOVER = 1.1;
/** Peak height of each orb's arc out of the lava, above a straight path. */
const ARC = 2.2;

/** The working smithy, gathered around the hearth and anvil, clear of the pool and pedestals. */
const SMITHY: readonly (Omit<ForgeProp, "position"> & { x: number; z: number })[] = [
  { kind: "workbench", x: -8.6, z: -8, rotation: 0.5 },
  { kind: "weaponStand", x: 0.6, z: -9.4, rotation: -0.4 },
  { kind: "barrel", x: -8.4, z: -10.8, rotation: 0.3 },
  { kind: "barrel", x: -9.3, z: -10.2, rotation: 1.4, scale: 1.1 },
  { kind: "crate", x: 1.4, z: -11.2, rotation: 0.2 },
  { kind: "whetstone", x: -6.6, z: -1.4, rotation: 1.1 },
  { kind: "chain", x: -3.6, z: 1.2, rotation: 0.7 },
  { kind: "cauldron", x: -7.4, z: -5.8, rotation: 0.4 },
];
const smithy: ForgeProp[] = SMITHY.map(({ x, z, ...p }) => ({ ...p, position: [x, ground(x, z) - 0.02, z] }));

const groupColor = (g: number) => SKILL_GROUP_COLORS[g % SKILL_GROUP_COLORS.length]!;

/** One pedestal per skill group, on a shallow arc behind the pool in the open part of the frame. */
const PEDESTALS = skillGroups.map((group, g) => {
  const a = lerp(-1, 1, skillGroups.length === 1 ? 0.5 : g / (skillGroups.length - 1));
  const x = -2.2 + Math.sin(a) * 3.8;
  const z = -1.5 - Math.cos(a) * 3;
  const height = 1.2 + (g % 2) * 0.5;
  return { id: group.id, x, z, height, top: ground(x, z) + height };
});

interface Orb {
  /** Resting spot above the pedestal. */
  x: number;
  y: number;
  z: number;
  /** Where it surfaces from the lava. */
  sx: number;
  sz: number;
  group: number;
  phase: number;
}

/** One orb per skill, clustered above its group's pedestal. */
function layoutOrbs(): Orb[] {
  const orbs: Orb[] = [];
  skillGroups.forEach((group, g) => {
    const p = PEDESTALS[g]!;
    group.skills.forEach((_, k) => {
      const spin = k * 2.39996; // golden angle
      const r = k === 0 ? 0 : 0.3 + 0.28 * Math.sqrt(k);
      orbs.push({
        x: p.x + Math.cos(spin) * r,
        z: p.z + Math.sin(spin) * r * 0.7,
        y: p.top + HOVER + (k % 3) * 0.42,
        sx: POOL.x + (p.x - POOL.x) * 0.35,
        sz: POOL.z + (p.z - POOL.z) * 0.35,
        group: g,
        phase: g * 1.3 + k * 0.7,
      });
    });
  });
  return orbs;
}

/** Ember state, advanced every frame (there is only one Forge). */
const embers = (() => {
  const rng = mulberry32(305);
  return Array.from({ length: EMBER_COUNT }, () => {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * POOL_RADIUS * 0.9;
    return { x: POOL.x + Math.cos(a) * r, z: POOL.z + Math.sin(a) * r, y: rng() * EMBER_HEIGHT, speed: between(rng, 0.5, 1.4), drift: rng() * 6 };
  });
})();

const dummy = new Object3D();
const tint = new Color();

export function Forge() {
  const orbs = useMemo(() => layoutOrbs(), []);
  const rocks = useMemo(
    () =>
      scatter(region, {
        seed: 303,
        count: 60,
        area: [-40, 40, -35, 25],
        scale: [0.5, 2.2],
        sink: 0.4,
        keep: (x, z) =>
          Math.hypot(x - POOL.x, z - POOL.z) > POOL_RADIUS + 1.5 &&
          PEDESTALS.every((p) => Math.hypot(x - p.x, z - p.z) > 2.2) &&
          Math.hypot(x - ANVIL.x, z - ANVIL.z) > 2,
      }),
    [],
  );
  const poolRim = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        const x = POOL.x + Math.cos(a) * (POOL_RADIUS + 0.4);
        const z = POOL.z + Math.sin(a) * (POOL_RADIUS + 0.4);
        // Base-pivoted rocks: tip only a little, sink a little, so none float or flip.
        return { position: [x, POOL_Y - 0.3, z] as const, rotation: [0.15 * Math.sin(a * 3), a * 2, 0] as const, scale: 0.45 + (i % 3) * 0.15 };
      }),
    [],
  );
  const crust = useMemo(() => {
    const rng = mulberry32(306);
    return Array.from({ length: 9 }, () => {
      const a = rng() * Math.PI * 2;
      const r = between(rng, 1.2, POOL_RADIUS - 0.8);
      return {
        position: [Math.cos(a) * r, 0, Math.sin(a) * r] as const,
        rotation: [0, rng() * 6, 0] as const,
        scale: [between(rng, 0.6, 1.3), 1, between(rng, 0.6, 1.3)] as const,
      };
    });
  }, []);

  const orbMesh = useRef<InstancedMesh>(null);
  const halos = useRef<Points>(null);
  const sparks = useRef<Points>(null);
  const pool = useRef<MoltenPoolHandle>(null);
  const crustGroup = useRef<Group>(null);
  const pedestals = useRef<(PedestalHandle | null)[]>([]);

  useLayoutEffect(() => {
    const mesh = orbMesh.current;
    if (!mesh) return;
    orbs.forEach((orb, i) => mesh.setColorAt(i, tint.set(groupColor(orb.group))));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [orbs]);

  useRegionFrame(region, ({ clock }, delta) => {
    const t = clock.elapsedTime;
    const ambient = ambientMotion();

    // Each group rises from the lava with its line in the Skills panel (beat 0
    // is the header), arcs over and settles above its pedestal, which lights.
    const rise = skillGroups.map((_, g) => easeOutCubic(sceneBeat(region.index, g + 1)));
    rise.forEach((r, g) => pedestals.current[g]?.setLit(r));

    const mesh = orbMesh.current;
    const halo = halos.current;
    if (mesh && halo) {
      const hp = halo.geometry.getAttribute("position") as BufferAttribute;
      const hc = halo.geometry.getAttribute("color") as BufferAttribute;
      orbs.forEach((orb, i) => {
        const r = rise[orb.group]!;
        const bob = ambient ? Math.sin(t * 1.1 + orb.phase) * 0.1 : 0;
        const x = lerp(orb.sx, orb.x, r);
        const z = lerp(orb.sz, orb.z, r);
        const y = lerp(POOL_Y - 1.2, orb.y, r) + Math.sin(Math.PI * r) * ARC + bob * r;
        dummy.position.set(x, y, z);
        dummy.scale.setScalar(Math.max(0.001, lerp(0.35, 1, r)));
        dummy.rotation.set(0, (ambient ? t * 0.3 : 0) + orb.phase, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        hp.setXYZ(i, x, y, z);
        tint.set(groupColor(orb.group)).multiplyScalar(0.55 * r);
        hc.setXYZ(i, tint.r, tint.g, tint.b);
      });
      mesh.instanceMatrix.needsUpdate = true;
      hp.needsUpdate = true;
      hc.needsUpdate = true;
    }

    const spark = sparks.current;
    if (!ambient) {
      // Reduced motion: no rising embers.
      if (spark) spark.visible = false;
      return;
    }

    pool.current?.setHeat(0.5 + 0.5 * Math.sin(t * 0.9));
    if (crustGroup.current) crustGroup.current.rotation.y = t * 0.03;

    // Embers rise from the lava, drift, fade out and respawn.
    if (spark) {
      spark.visible = true;
      const sp = spark.geometry.getAttribute("position") as BufferAttribute;
      const sc = spark.geometry.getAttribute("color") as BufferAttribute;
      embers.forEach((e, i) => {
        e.y += e.speed * delta;
        if (e.y > EMBER_HEIGHT) e.y = 0;
        const fade = 1 - e.y / EMBER_HEIGHT;
        sp.setXYZ(i, e.x + Math.sin(t * 0.7 + e.drift) * 0.12 * e.y, POOL_Y + e.y, e.z + Math.cos(t * 0.6 + e.drift) * 0.3);
        sc.setXYZ(i, fade, 0.55 * fade, 0.2 * fade);
      });
      sp.needsUpdate = true;
      sc.needsUpdate = true;
    }
  });

  return (
    <RegionSlot region={region}>
      <MoltenPool ref={pool} radius={POOL_RADIUS} position={[POOL.x, POOL_Y, POOL.z]} />
      <group ref={crustGroup} position={[POOL.x, POOL_Y + 0.04, POOL.z]}>
        <CrustPlates items={crust} />
      </group>
      <Rocks items={poolRim} color="#2a2220" />
      <Rocks items={rocks} color="#3a302c" />
      <Hearth position={[HEARTH.x, ground(HEARTH.x, HEARTH.z) - 0.2, HEARTH.z]} rotation={[0, 0.25, 0]} />
      <Smithy props={smithy} />
      <Anvil position={[ANVIL.x, ground(ANVIL.x, ANVIL.z), ANVIL.z]} rotation={[0, 0.9, 0]} />
      {PEDESTALS.map((p, g) => (
        <Pedestal
          key={p.id}
          ref={(el) => {
            pedestals.current[g] = el;
          }}
          color={groupColor(g)}
          height={p.height}
          position={[p.x, ground(p.x, p.z) - 0.05, p.z]}
        />
      ))}
      {PEDESTALS.map((p, g) => (
        <Interactable
          key={`use-${p.id}`}
          id={`forge:${p.id}`}
          region={region}
          position={[p.x, ground(p.x, p.z), p.z]}
          pages={[`skill:${p.id}`]}
          prompt={`Kindle ${skillGroups[g]!.name}`}
          radius={2}
          markerHeight={p.height + 0.6}
          color={groupColor(g)}
        />
      ))}
      <SkillOrbs ref={orbMesh} count={orbs.length} />
      <GlowPoints ref={halos} count={orbs.length} size={1.5} />
      <GlowPoints ref={sparks} count={EMBER_COUNT} size={0.3} profile="glow" />
    </RegionSlot>
  );
}
