"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import type { BufferAttribute, Group, Points, PointsMaterial } from "three";
import { clamp01, smoothstep } from "@/lib/journey";
import { mulberry32, between } from "@/lib/random";
import { regionById } from "@/lib/regions";
import { useCodex } from "@/lib/store";
import { arrival } from "@/lib/timeline";
import {
  CampGear,
  Fire,
  GlowPoints,
  LogBench,
  Moon,
  Raven,
  Stars,
  Stones,
  Tent,
  Trees,
  type CampProp,
  type RavenHandle,
} from "./models/campfire";
import { GrassField } from "@/components/world/GrassField";
import { Interactable } from "@/components/world/explore/Interaction";
import { useRegionMounted } from "@/lib/streaming";
import { ambientMotion, groundAt, RegionSlot, scatter, useRegionFrame } from "./shared";

const region = regionById.campfire;
const ground = groundAt(region);

// The fire sits right of centre so the left-hand contact panel never covers it.
const FIRE = { x: 1, z: 0 };
// In front of the fire, in clear view (not under the region map); the raven faces the moon it flies toward.
const PERCH = { x: -1.2, z: 3.2 };
const RAVEN_HEADING = 2.8;
const MOON: readonly [number, number, number] = [30, ground(0, 0) + 26, -90];
/** Seconds for the raven to fly out of sight, and before a new one perches. */
const FLIGHT_SECONDS = 2.4;
const RETURN_SECONDS = 6;
const SPARK_COUNT = 50;
/** Night grass around the camp, clear of the fire ring. */
const CAMP_GRASS = [-22, 24, -26, 14] as const;
const awayFromFire = (x: number, z: number) => Math.hypot(x - FIRE.x, z - FIRE.z) > 1.9;
const SPARK_HEIGHT = 4;
/** The bench the adventurer sits on to write (the first log bench, west of the fire). */
const BENCH = { x: FIRE.x - 2.4, z: FIRE.z - 1.2 };
/** The sit clip keeps the hips at standing height; this lowers the body onto the bench. */
const SEAT_DROP = 0.42;

/** Camp gear around the tent, behind the fire and clear of the raven's perch. */
const GEAR: readonly (Omit<CampProp, "position"> & { x: number; z: number })[] = [
  { kind: "wagon", x: 9.5, z: -7.5, rotation: 0.9 },
  { kind: "crate", x: 7.6, z: -2.8, rotation: 0.3 },
  { kind: "crate", x: 7.9, z: -1.7, rotation: 1.1, scale: 0.7 },
  { kind: "barrel", x: 3.2, z: -5.6, rotation: 0.4 },
  { kind: "bag", x: 3.6, z: -2.2, rotation: -0.6 },
  { kind: "pot", x: FIRE.x + 1.7, z: FIRE.z + 0.9, rotation: 0.8 },
];
const gear: CampProp[] = GEAR.map(({ x, z, ...p }) => ({ ...p, position: [x, ground(x, z) - 0.02, z] }));

/** Spark state, advanced every frame (there is only one Campfire). */
const sparks = (() => {
  const rng = mulberry32(803);
  return Array.from({ length: SPARK_COUNT }, () => ({
    x: between(rng, -0.35, 0.35),
    z: between(rng, -0.35, 0.35),
    y: rng() * SPARK_HEIGHT,
    speed: between(rng, 0.7, 1.6),
    drift: rng() * 6,
  }));
})();

export function Campfire() {
  const ring = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const x = FIRE.x + Math.cos(a) * 1.4;
        const z = FIRE.z + Math.sin(a) * 1.4;
        return { position: [x, ground(x, z) - 0.05, z] as const, rotation: [0.1 * Math.sin(a * 2), a, 0] as const };
      }),
    [],
  );
  const trees = useMemo(
    () =>
      scatter(region, {
        seed: 802,
        count: 70,
        area: [-45, 45, -40, 25],
        scale: [0.8, 1.5],
        tilt: 0.06,
        keep: (x, z) => Math.hypot(x - FIRE.x, z - FIRE.z) > 9,
      }),
    [],
  );

  const flames = useRef<Group>(null);
  const stars = useRef<Points>(null);
  const raven = useRef<RavenHandle>(null);
  const embers = useRef<Points>(null);
  const halo = useRef<Points>(null);

  // The moon's halo: one big soft glow, set once.
  // Rerun when the scenery is (re)built as the camera approaches.
  const mounted = useRegionMounted(region.index);
  useLayoutEffect(() => {
    const h = halo.current;
    if (!h) return;
    const position = h.geometry.getAttribute("position") as BufferAttribute;
    const color = h.geometry.getAttribute("color") as BufferAttribute;
    position.setXYZ(0, ...MOON);
    color.setXYZ(0, 0.35, 0.34, 0.3);
    position.needsUpdate = true;
    color.needsUpdate = true;
  }, [mounted]);

  useRegionFrame(region, ({ clock }, delta) => {
    const t = clock.elapsedTime;
    const ambient = ambientMotion();

    // Stars come out only once you leave the caves, never through the cave roof.
    if (stars.current) (stars.current.material as PointsMaterial).opacity = smoothstep(0.55, 1, arrival(region.index));

    // The raven takes the contact form's message: flies off, then a new one perches.
    const sentAt = useCodex.getState().ravenSentAt;
    const since = sentAt === null ? Infinity : (performance.now() - sentAt) / 1000;
    if (since < FLIGHT_SECONDS) raven.current?.update(clamp01(since / FLIGHT_SECONDS), 1, t);
    else if (since < RETURN_SECONDS) raven.current?.update(1, 0, t);
    else raven.current?.update(null, sentAt === null ? 1 : clamp01((since - RETURN_SECONDS) / 0.6), t);

    const spark = embers.current;
    if (!ambient) {
      if (spark) spark.visible = false;
      return;
    }
    if (flames.current) {
      flames.current.scale.set(1 + Math.sin(t * 11) * 0.06, 1 + Math.sin(t * 7.3) * 0.12, 1 + Math.cos(t * 9) * 0.06);
    }
    // Sparks rise from the fire, drift and fade.
    if (spark) {
      spark.visible = true;
      const sp = spark.geometry.getAttribute("position") as BufferAttribute;
      const sc = spark.geometry.getAttribute("color") as BufferAttribute;
      const base = ground(FIRE.x, FIRE.z) + 0.6;
      sparks.forEach((s, i) => {
        s.y += s.speed * delta;
        if (s.y > SPARK_HEIGHT) s.y = 0;
        const fade = 1 - s.y / SPARK_HEIGHT;
        sp.setXYZ(i, FIRE.x + s.x + Math.sin(t * 1.3 + s.drift) * 0.15 * s.y, base + s.y, FIRE.z + s.z + Math.cos(t + s.drift) * 0.1 * s.y);
        sc.setXYZ(i, fade, 0.6 * fade, 0.25 * fade);
      });
      sp.needsUpdate = true;
      sc.needsUpdate = true;
    }
  });

  return (
    <RegionSlot region={region}>
      <Fire ref={flames} position={[FIRE.x, ground(FIRE.x, FIRE.z), FIRE.z]} />
      <Interactable
        id="campfire:fire"
        region={region}
        position={[FIRE.x, ground(FIRE.x, FIRE.z), FIRE.z + 1.9]}
        pages={["contact"]}
        prompt="Sit by the fire and write a letter"
        action="sit"
        seat={{ x: BENCH.x, z: BENCH.z, facing: Math.atan2(FIRE.x - BENCH.x, FIRE.z - BENCH.z), drop: SEAT_DROP }}
        markerHeight={1.5}
        color={region.palette.accent}
      />
      <GlowPoints ref={embers} count={SPARK_COUNT} size={0.26} profile="glow" />
      <Stones items={ring} />
      <CampGear props={gear} />
      <Tent position={[5, ground(5, -4), -4]} rotation={[0, 0.3, 0]} />
      <mesh position={[PERCH.x, ground(PERCH.x, PERCH.z) + 0.25, PERCH.z]} rotation={[0, RAVEN_HEADING + Math.PI / 2, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.28, 2.2, 6]} />
        <meshLambertMaterial color="#4a2f1d" flatShading />
      </mesh>
      <Raven ref={raven} position={[PERCH.x, ground(PERCH.x, PERCH.z) + 0.5, PERCH.z]} rotation={[0, RAVEN_HEADING, 0]} />
      <LogBench position={[FIRE.x - 2.4, ground(FIRE.x - 2.4, FIRE.z - 1.2), FIRE.z - 1.2]} rotation={[0, 1.2, 0]} />
      <LogBench position={[FIRE.x + 0.6, ground(FIRE.x + 0.6, FIRE.z - 2.8), FIRE.z - 2.8]} rotation={[0, 0.1, 0]} />
      <Trees items={trees} />
      <GrassField region={region} count={12000} area={CAMP_GRASS} root="#121a1b" tip="#3b4e46" seed={804} keep={awayFromFire} />
      <Moon position={MOON} />
      <GlowPoints ref={halo} count={1} size={34} fog={false} />
      <group position={[0, ground(0, 0), 0]}>
        <Stars ref={stars} count={1400} radius={160} />
      </group>
    </RegionSlot>
  );
}
