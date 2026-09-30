"use client";

import { useMemo, useRef } from "react";
import { Vector3, type Group, type Points } from "three";
import { cameraPath, clearOfCamera, waypointU } from "@/lib/cameraPath";
import { easeOutCubic, lerp } from "@/lib/journey";
import { narrative, sceneBeat } from "@/lib/narrative";
import { mulberry32, between } from "@/lib/random";
import { regionById } from "@/lib/regions";
import type { Vec3 } from "@/lib/types";
import {
  Archway,
  BookStack,
  Bookshelves,
  Candles,
  DustMotes,
  FloorMosaic,
  HangingScroll,
  Lectern,
  Pillars,
  Rubble,
  SCROLL_PARAGRAPHS,
  Steps,
  type ScrollHandle,
} from "./models/archive";
import { Interactable } from "@/components/world/explore/Interaction";
import { ambientMotion, groundAt, RegionSlot, scatter, useRegionFrame } from "./shared";

const region = regionById.archive;
const ground = groundAt(region);

/** Full unrolled length of the scroll, world units. */
const SCROLL_LENGTH = 3.4;
const SCROLL_TOP = 5;
/** Steps run down the last stretch of the route from the Highlands (fractions of that stretch). */
const STEPS_FROM = 0.72;
const STEPS_TO = 0.96;
const STEP_SPACING = 1.25;
/** Where along that stretch the camera passes under the archway. */
const ARCH_AT = 0.86;
/** Clearance between the camera and the underside of the arch. */
const ARCH_CLEARANCE = 1.6;

/** Clear of the camera's route (region-local x/z), so it never flies through a prop. */
const offRoute = (x: number, z: number, radius: number) =>
  clearOfCamera(region.center[0] + x, region.center[2] + z, radius);

/** Points on an arc behind the region centre, facing inward, skipping any on the camera's route. */
function arc(count: number, radius: number, from: number, to: number) {
  return Array.from({ length: count }, (_, i) => {
    const a = lerp(from, to, count === 1 ? 0.5 : i / (count - 1));
    return { x: Math.sin(a) * radius, z: -Math.cos(a) * radius, facing: -a };
  }).filter(({ x, z }) => offRoute(x, z, 3.2));
}

/** A point on the route from the Highlands (t = 0..1 of that stretch), in region-local coordinates, with its heading. */
function onDescent(t: number) {
  const u = lerp(waypointU[0]!, waypointU[1]!, t);
  const point = cameraPath.getPointAt(u, new Vector3());
  const tangent = cameraPath.getTangentAt(u, new Vector3());
  const x = point.x - region.center[0];
  const z = point.z - region.center[2];
  return { x, z, cameraY: point.y, heading: Math.atan2(tangent.x, tangent.z) };
}

function descentSteps() {
  const stretch = (waypointU[1]! - waypointU[0]!) * cameraPath.getLength();
  const steps: { position: Vec3; rotation: Vec3 }[] = [];
  for (let d = STEPS_FROM * stretch; d < STEPS_TO * stretch; d += STEP_SPACING) {
    const { x, z, heading } = onDescent(d / stretch);
    steps.push({ position: [x, ground(x, z) + 0.12, z], rotation: [0, heading, 0] });
  }
  return steps;
}

function archway() {
  const { x, z, cameraY, heading } = onDescent(ARCH_AT);
  const base = ground(x, z);
  return { position: [x, base - 0.2, z] as Vec3, heading, height: Math.max(6, cameraY - base + ARCH_CLEARANCE) };
}

export function Archive() {
  const shelves = useMemo(
    () => [
      ...arc(11, 10, -1.5, 1.5).map(({ x, z, facing }) => ({
        position: [x, ground(x, z) - 0.2, z] as const,
        rotation: [0, facing, 0] as const,
      })),
      // A taller outer ring behind the pillars, for depth.
      ...arc(14, 16, -1.9, 1.9).map(({ x, z, facing }) => ({
        position: [x, ground(x, z) - 0.2, z] as const,
        rotation: [0, facing, 0] as const,
        scale: [1, 1.35, 1] as const,
      })),
    ],
    [],
  );
  const pillars = useMemo(
    () => arc(8, 13.5, -1.6, 1.6).map(({ x, z }) => ({ position: [x, ground(x, z) - 0.3, z] as const })),
    [],
  );
  const candles = useMemo(() => {
    const rng = mulberry32(202);
    return Array.from({ length: 34 }, () => {
      const x = between(rng, -8, 8);
      const z = between(rng, -9, 2);
      return { position: [x, ground(x, z) + between(rng, 3, 6.5), z] as const, rotation: [0, rng() * 6, 0] as const };
    }).filter(({ position: [x, , z] }) => offRoute(x, z, 1.6));
  }, []);
  const rubble = useMemo(
    () =>
      scatter(region, {
        seed: 203,
        count: 30,
        area: [-30, 30, -30, 20],
        scale: [0.3, 1.2],
        sink: 0.15,
        keep: (x, z) => Math.hypot(x, z) > 17,
      }),
    [],
  );
  const steps = useMemo(() => descentSteps(), []);
  const arch = useMemo(() => archway(), []);
  const floorY = useMemo(() => {
    // Highest ground under the mosaic, so it never sinks below the terrain.
    let top = -Infinity;
    for (let a = 0; a < Math.PI * 2; a += 0.5) for (const r of [0, 3.5, 7]) top = Math.max(top, ground(Math.cos(a) * r, Math.sin(a) * r));
    return top + 0.04;
  }, []);

  const scroll = useRef<ScrollHandle>(null);
  const candleGroup = useRef<Group>(null);
  const dust = useRef<Points>(null);
  const ink = useRef<number[]>(Array.from({ length: SCROLL_PARAGRAPHS }, () => 0));

  useRegionFrame(region, ({ clock }) => {
    // The scroll unrolls with the About panel, then each paragraph's ink writes
    // itself as that paragraph appears (beat 0 is the header).
    const panel = narrative.panels[region.index]!;
    ink.current.forEach((_, i) => {
      ink.current[i] = sceneBeat(region.index, i + 1);
    });
    scroll.current?.update(easeOutCubic(panel.reveal), ink.current);

    if (!ambientMotion()) return;
    const t = clock.elapsedTime;
    if (candleGroup.current) candleGroup.current.position.y = Math.sin(t * 0.6) * 0.15;
    if (dust.current) {
      dust.current.rotation.y = t * 0.012;
      dust.current.position.y = Math.sin(t * 0.25) * 0.25;
    }
  });

  return (
    <RegionSlot region={region}>
      <Steps items={steps} />
      <Archway position={arch.position} rotation={[0, arch.heading, 0]} height={arch.height} span={6} />
      <FloorMosaic radius={7} position={[0, floorY, 0]} />
      <Bookshelves items={shelves} />
      <Pillars items={pillars} />
      <Lectern position={[0, floorY, 0]} />
      <Interactable id="archive:scroll" region={region} position={[0, floorY, 0.6]} pages={["about"]} prompt="Read the scroll" markerHeight={2.4} />
      <BookStack position={[1.9, floorY, 0.9]} />
      <HangingScroll ref={scroll} length={SCROLL_LENGTH} position={[0, floorY + SCROLL_TOP, -2]} />
      <group ref={candleGroup}>
        <Candles items={candles} />
      </group>
      <group position={[0, floorY, 0]}>
        <DustMotes ref={dust} count={220} />
      </group>
      <Rubble items={rubble} />
    </RegionSlot>
  );
}
