"use client";

import { useMemo, useRef } from "react";
import { Vector3, type Mesh, type MeshBasicMaterial } from "three";
import { cameraPath, waypointU } from "@/lib/cameraPath";
import { easeOutCubic, lerp, smoothstep } from "@/lib/journey";
import { narrative, sceneBeat } from "@/lib/narrative";
import { mulberry32, between } from "@/lib/random";
import { regionById } from "@/lib/regions";
import { GrassField } from "@/components/world/GrassField";
import type { Vec3 } from "@/lib/types";
import {
  Cairn,
  Crows,
  DeadTrees,
  Heather,
  MistSheet,
  Rocks,
  StandingStones,
  StoneTablet,
  TrailStones,
  type CrowsHandle,
  type StoneTabletHandle,
} from "./models/highlands";
import { Interactable } from "@/components/world/explore/Interaction";
import { ambientMotion, groundAt, RegionSlot, scatter, useRegionFrame } from "./shared";

const region = regionById.highlands;
const ground = groundAt(region);

// The tablet sits left of the centred hero panel, where it stays visible.
const TABLET_X = -9;
const TABLET_Z = -4;
/** Hero beats: eyebrow, name, role, tagline, ... The tablet carves with the tagline. */
const TAGLINE_BEAT = 3;

// Kept within the flat valley floor (|x| small): wider sheets would slice into
// the low-poly hills, whose facets show as a stepped edge through the mist.
const MIST = [
  { x: -5, y: 0, z: -8, opacity: 0.35 },
  { x: 6, y: 0.6, z: -15, opacity: 0.3 },
  { x: -6, y: 1.2, z: -24, opacity: 0.3 },
  { x: 3, y: 0.3, z: 3, opacity: 0.22 },
  { x: 9, y: 0, z: -3, opacity: 0.26 },
  { x: -9, y: 0.4, z: 5, opacity: 0.24 },
  { x: 2, y: 1.8, z: -34, opacity: 0.3 },
];
/** Where moor grass grows (region-local), covering what the camera sees. */
const MOOR_GRASS = [-30, 30, -32, 18] as const;

/** Mist is this much thicker on the opening's first frame. */
const INTRO_MIST = 2.4;
/** Sheets are 6 tall: lifting the centre this far keeps the feathered bottom edge clear of the ground. */
const MIST_LIFT = 2.9;
/** Sheets fade out as the camera nears them, so flying through mist never pops. */
const MIST_NEAR = [5, 14] as const;

/**
 * Stepping stones along the ground beneath the camera's route to the Archive,
 * starting just in front of the resting camera, so the eye is led onward.
 */
function trailStones() {
  const rng = mulberry32(131);
  const point = new Vector3();
  const stones: { position: Vec3; rotation: Vec3; scale: Vec3 }[] = [];
  const [from, to] = [waypointU[0]!, lerp(waypointU[0]!, waypointU[1]!, 0.72)];
  for (let u = from; u < to; u += 0.0021) {
    cameraPath.getPointAt(u, point);
    const x = point.x - region.center[0] + between(rng, -0.5, 0.5);
    const z = point.z - region.center[2];
    if (z > 7) continue; // under or behind the resting camera: never seen
    const s = between(rng, 0.7, 1.15);
    stones.push({ position: [x, ground(x, z) + 0.03, z], rotation: [0, rng() * 3, 0], scale: [s, 1, s * between(rng, 0.8, 1.1)] });
  }
  return stones;
}

export function Highlands() {
  const rocks = useMemo(
    () => scatter(region, { seed: 101, count: 55, area: [-45, 45, -40, 30], scale: [0.4, 1.8], sink: 0.45 }),
    [],
  );
  const heather = useMemo(
    () =>
      scatter(region, { seed: 102, count: 140, area: [-45, 45, -40, 25], scale: [0.5, 1.4], sink: 0.08, tilt: 0.1 }).map((h) => {
        const s = h.scale as number;
        return { ...h, scale: [s, s * 0.45, s] as const };
      }),
    [],
  );
  const trail = useMemo(() => trailStones(), []);
  // Bare trees far back in the mist: silhouettes, never near the route.
  const deadTrees = useMemo(
    () => scatter(region, { seed: 105, count: 7, area: [-45, 45, -42, -16], scale: [0.45, 0.75], sink: 0.05, tilt: 0.05 }),
    [],
  );
  const stones = useMemo(
    () =>
      [-1.2, -0.6, 0, 0.6, 1.2].map((a, i) => {
        const x = TABLET_X + Math.sin(a) * 6;
        const z = TABLET_Z - Math.cos(a) * 6;
        return {
          position: [x, ground(x, z) - 0.3, z] as const,
          rotation: [0.05 * (i - 2), a, 0.04] as const,
          scale: [1, 0.8 + (i % 2) * 0.35, 1] as const,
        };
      }),
    [],
  );

  const mist = useRef<(Mesh | null)[]>([]);
  const tablet = useRef<StoneTabletHandle>(null);
  const crows = useRef<CrowsHandle>(null);

  useRegionFrame(region, ({ clock, camera }) => {
    const t = clock.elapsedTime;
    const ambient = ambientMotion();

    // The tagline carves itself into the stone as it appears in the panel.
    tablet.current?.setCarving(easeOutCubic(sceneBeat(region.index, TAGLINE_BEAT)));

    // Mist hangs thick in the opening and thins as the name emerges.
    const thickness = lerp(INTRO_MIST, 1, easeOutCubic(narrative.intro));
    mist.current.forEach((sheet, i) => {
      if (!sheet) return;
      const m = MIST[i]!;
      if (ambient) sheet.position.x = m.x + Math.sin(t * 0.05 + i * 1.7) * 5;
      // Sheets face +z, so distance to the plane (not its centre) is what matters.
      const near = Math.abs(camera.position.z - (region.center[2] + sheet.position.z));
      (sheet.material as MeshBasicMaterial).opacity =
        Math.min(0.9, m.opacity * thickness) * smoothstep(MIST_NEAR[0], MIST_NEAR[1], near);
    });

    crows.current?.update(ambient ? t : 0, ambient);
  });

  return (
    <RegionSlot region={region}>
      <StoneTablet
        ref={tablet}
        glow={region.palette.accent}
        position={[TABLET_X, ground(TABLET_X, TABLET_Z) - 0.2, TABLET_Z]}
        rotation={[0, 0.35, 0]}
      />
      <Interactable
        id="highlands:tablet"
        region={region}
        position={[TABLET_X + 1.2, ground(TABLET_X + 1.2, TABLET_Z + 1.4), TABLET_Z + 1.4]}
        pages={["hero"]}
        prompt="Read the tablet"
        markerHeight={3.6}
      />
      <StandingStones items={stones} />
      <Cairn position={[12, ground(12, -7) - 0.2, -7]} />
      <TrailStones items={trail} />
      <Heather items={heather} />
      <DeadTrees items={deadTrees} />
      <GrassField region={region} count={22000} area={MOOR_GRASS} root="#3d4b33" tip="#a4ae72" seed={104} />
      <Rocks items={rocks} color="#6b6e66" />
      <Crows ref={crows} count={5} radius={16} position={[2, ground(2, -10) + 13, -10]} />
      {MIST.map((m, i) => (
        <MistSheet
          key={i}
          ref={(el) => {
            mist.current[i] = el;
          }}
          position={[m.x, ground(m.x, m.z) + MIST_LIFT + m.y * 0.3, m.z]}
        />
      ))}
    </RegionSlot>
  );
}
