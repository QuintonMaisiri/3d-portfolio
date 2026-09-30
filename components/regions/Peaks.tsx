"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { BufferAttribute, Color, Object3D, Vector3, type InstancedMesh, type Points, type PointsMaterial } from "three";
import { problemCases } from "@/content/problems";
import { clamp01, easeOutCubic, smoothstep } from "@/lib/journey";
import { sceneBeat } from "@/lib/narrative";
import { mulberry32, between } from "@/lib/random";
import { regionById } from "@/lib/regions";
import { distanceTo } from "@/lib/timeline";
import { weather } from "@/lib/weather";
import {
  Beacon,
  BEACON_SIZE,
  Bolt,
  ClimbMarkers,
  Clouds,
  Mountain,
  MountainRange,
  DeadTrees,
  Pines,
  Rocks,
  Snow,
  type BoltHandle,
} from "./models/peaks";
import { Interactable } from "@/components/world/explore/Interaction";
import { ambientMotion, groundAt, RegionSlot, scatter, useRegionFrame } from "./shared";

const region = regionById.peaks;
const ground = groundAt(region);

/** The camera's resting spot, region-local: climbs face it. */
const CAMERA = new Vector3(
  region.waypoint.position[0] - region.center[0],
  region.waypoint.position[1],
  region.waypoint.position[2] - region.center[2],
);

/** One climbable peak per problem-solving case, rising left to right. */
// All left of the camera's route onward to the Ruins, which runs at x of about 4.5.
const PEAKS = problemCases.map((c, i) => {
  const x = -14 + i * 5.5;
  const z = -8 - (i % 2) * 5;
  const height = 11 + i * 3;
  return { id: c.id, x, z, height, radius: 4.5 + i * 0.4, base: ground(x, z) - 1 };
});

/** Clear of every climbable peak's base (region-local x/z). */
const offPeaks = (x: number, z: number) => PEAKS.every((p) => Math.hypot(x - p.x, z - p.z) > p.radius + 1.5);

/** Lanterns per climbing route. */
const MARKERS_PER_PEAK = 12;
/** Share of a case's beat spent climbing; the rest lights the summit. */
const CLIMB_SHARE = 0.8;

/** Lantern positions zigzagging up the camera-facing side of each peak. */
const MARKERS = PEAKS.flatMap((peak, p) => {
  const face = Math.atan2(CAMERA.x - peak.x, CAMERA.z - peak.z);
  return Array.from({ length: MARKERS_PER_PEAK }, (_, k) => {
    const h = peak.height * (0.08 + (0.8 * k) / (MARKERS_PER_PEAK - 1));
    const r = peak.radius * (1 - h / peak.height) + 0.25;
    const a = face + 0.45 * Math.sin(k * 1.1);
    return { peak: p, k, position: new Vector3(peak.x + r * Math.sin(a), peak.base + h, peak.z + r * Math.cos(a)) };
  });
});

const CLOUD_COUNT = 7;
const PUFFS = 5;
const CLOUD_SPAN = 70;
/** Seconds between lightning strikes (random within). */
const STRIKE_GAP = [5, 11] as const;
/** A second, weaker flicker this long after each strike: two flashes, never more. */
const FLICKER_DELAY = 0.12;

const SNOW = 300;
const SNOW_BOX = [25, 22, 22] as const;

const dummy = new Object3D();
// Unlit lanterns: a faint glow (they're additive), so the routes read before they light.
const off = new Color("#3a3f4a").multiplyScalar(0.35);
const on = new Color(region.palette.accent);
const tint = new Color();

/** Cloud layout, and snow and lightning state, advanced every frame (there is only one Peaks). */
const clouds = (() => {
  const rng = mulberry32(505);
  return Array.from({ length: CLOUD_COUNT }, () => ({
    x: between(rng, -35, 35),
    y: ground(0, 0) + between(rng, 16, 24),
    z: between(rng, -35, 5),
    speed: between(rng, 0.35, 0.8),
    puffs: Array.from({ length: PUFFS }, () => ({
      dx: between(rng, -3, 3),
      dy: between(rng, -0.6, 0.8),
      dz: between(rng, -2, 2),
      s: between(rng, 0.8, 1.4),
    })),
  }));
})();
const snow = (() => {
  const rng = mulberry32(506);
  return Array.from({ length: SNOW }, () => ({ speed: between(rng, 0.8, 1.6), drift: rng() * 6 }));
})();
const storm = { next: 3, flicker: -1, rng: mulberry32(507) };

const cloudX = (c: (typeof clouds)[number], t: number) =>
  ((((c.x + 40 + t * c.speed) % CLOUD_SPAN) + CLOUD_SPAN) % CLOUD_SPAN) - 40;

export function Peaks() {
  const range = useMemo(
    () =>
      scatter(region, {
        seed: 501,
        count: 18,
        area: [-75, 75, -45, 15],
        scale: [0.9, 1.8],
        sink: 0.6,
        // Flanking ranges only: the path continues straight on to the ruins.
        keep: (x) => Math.abs(x) > 30,
      }),
    [],
  );
  // Pines and bare trees on the lower slopes, clear of the climbable peaks.
  const pines = useMemo(
    () => scatter(region, { seed: 503, count: 46, area: [-40, 40, -34, 18], scale: [0.55, 1.05], tilt: 0.05, keep: offPeaks }),
    [],
  );
  const deadTrees = useMemo(
    () => scatter(region, { seed: 504, count: 9, area: [-40, 40, -30, 18], scale: [0.3, 0.5], tilt: 0.08, keep: offPeaks }),
    [],
  );
  const boulders = useMemo(
    () => scatter(region, { seed: 502, count: 40, area: [-35, 35, -20, 25], scale: [0.5, 1.8], sink: 0.4 }),
    [],
  );

  const beacons = useRef<(Points | null)[]>([]);
  const markers = useRef<Points>(null);
  const cloudMesh = useRef<InstancedMesh>(null);
  const snowPoints = useRef<Points>(null);
  const bolt = useRef<BoltHandle>(null);

  useLayoutEffect(() => {
    const points = markers.current;
    if (!points) return;
    const position = points.geometry.getAttribute("position") as BufferAttribute;
    const color = points.geometry.getAttribute("color") as BufferAttribute;
    MARKERS.forEach((m, i) => {
      position.setXYZ(i, m.position.x, m.position.y, m.position.z);
      color.setXYZ(i, off.r, off.g, off.b);
    });
    position.needsUpdate = true;
    color.needsUpdate = true;
  }, []);

  useRegionFrame(region, ({ clock }, delta) => {
    const t = clock.elapsedTime;
    const ambient = ambientMotion();

    // The climb: each case lights its route from the base upward as it builds
    // into the panel (beat 0 is the header), then its summit beacon ignites.
    const beat = PEAKS.map((_, p) => sceneBeat(region.index, p + 1));
    const points = markers.current;
    if (points) {
      const color = points.geometry.getAttribute("color") as BufferAttribute;
      MARKERS.forEach((m, i) => {
        const climb = clamp01(beat[m.peak]! / CLIMB_SHARE) * MARKERS_PER_PEAK;
        tint.lerpColors(off, on, clamp01(climb - m.k));
        color.setXYZ(i, tint.r, tint.g, tint.b);
      });
      color.needsUpdate = true;
    }
    beacons.current.forEach((b, p) => {
      if (!b) return;
      const lit = easeOutCubic(smoothstep(CLIMB_SHARE - 0.05, 1, beat[p]!));
      const flicker = ambient ? 1 + Math.sin(t * 3 + p) * 0.08 : 1;
      const material = b.material as PointsMaterial;
      material.opacity = lit;
      material.size = BEACON_SIZE * (0.5 + 0.5 * lit) * flicker;
    });

    // Clouds drift across on the wind. They belong to the peaks' storm, so they
    // only show once you're nearly there (the fog hides the moment they appear).
    const cm = cloudMesh.current;
    if (cm) cm.visible = distanceTo(region.index) < 0.75;
    if (cm?.visible) {
      clouds.forEach((c, ci) => {
        const cx = ambient ? cloudX(c, t) : c.x;
        c.puffs.forEach((puff, pi) => {
          dummy.position.set(cx + puff.dx, c.y + puff.dy, c.z + puff.dz);
          dummy.rotation.set(pi, ci, 0);
          dummy.scale.set(2.2 * puff.s, 1.1 * puff.s, 1.6 * puff.s);
          dummy.updateMatrix();
          cm.setMatrixAt(ci * PUFFS + pi, dummy.matrix);
        });
      });
      cm.instanceMatrix.needsUpdate = true;
    }

    // Reduced motion: no falling snow, no lightning.
    bolt.current?.setIntensity(ambient ? weather.flash : 0);
    if (!ambient) return;

    const sp = snowPoints.current?.geometry.getAttribute("position") as BufferAttribute | undefined;
    if (sp) {
      snow.forEach((flake, i) => {
        let y = sp.getY(i) - flake.speed * delta;
        if (y < 0) y += SNOW_BOX[1];
        sp.setY(i, y);
        sp.setX(i, sp.getX(i) + Math.sin(t * 0.8 + flake.drift) * 0.01);
      });
      sp.needsUpdate = true;
    }

    // Lightning, only while the camera is at the peaks: a strike, then one
    // weaker flicker. Rare and brief, well under three flashes a second.
    if (distanceTo(region.index) > 0.6) return;
    if (storm.flicker > 0 && t >= storm.flicker) {
      weather.flash = Math.max(weather.flash, 0.6);
      storm.flicker = -1;
    }
    if (t >= storm.next) {
      const c = clouds[Math.floor(storm.rng() * CLOUD_COUNT)]!;
      const peak = PEAKS[Math.floor(storm.rng() * PEAKS.length)]!;
      bolt.current?.strike(
        new Vector3(cloudX(c, t), c.y - 1, c.z),
        new Vector3(peak.x + between(storm.rng, -2, 2), peak.base + peak.height * between(storm.rng, 0.5, 0.9), peak.z),
      );
      weather.flash = 1;
      // Show it this frame too: on a slow device the flash may have faded by the next.
      bolt.current?.setIntensity(1);
      storm.flicker = t + FLICKER_DELAY;
      storm.next = t + between(storm.rng, STRIKE_GAP[0], STRIKE_GAP[1]);
    }
  });

  return (
    <RegionSlot region={region}>
      {PEAKS.map((peak, i) => (
        <Beacon
          key={`${peak.id}-beacon`}
          ref={(el) => {
            beacons.current[i] = el;
          }}
          color={region.palette.accent}
          position={[peak.x, peak.base + peak.height + 0.8, peak.z]}
        />
      ))}
      {PEAKS.map((peak) => (
        <Mountain key={peak.id} height={peak.height} radius={peak.radius} position={[peak.x, peak.base, peak.z]} />
      ))}
      <ClimbMarkers ref={markers} count={MARKERS.length} size={0.9} profile="glow" />
      {PEAKS.map((peak, p) => {
        // At the foot of the trail, on the camera-facing side, just out from the first lantern.
        const foot = MARKERS.find((m) => m.peak === p && m.k === 0)!.position;
        const out = Math.atan2(foot.x - peak.x, foot.z - peak.z);
        const x = foot.x + Math.sin(out) * 1.4;
        const z = foot.z + Math.cos(out) * 1.4;
        return (
          <Interactable
            key={`use-${peak.id}`}
            id={`peaks:${peak.id}`}
            region={region}
            position={[x, ground(x, z), z]}
            pages={[`problem:${peak.id}`]}
            prompt="Start the climb"
            markerHeight={1.6}
            color={region.palette.accent}
          />
        );
      })}
      <MountainRange items={range} />
      <Rocks items={boulders} color="#6f727b" />
      <Pines items={pines} />
      <DeadTrees items={deadTrees} />
      <Clouds ref={cloudMesh} count={CLOUD_COUNT * PUFFS} />
      <group position={[0, ground(0, 0), 0]}>
        <Snow ref={snowPoints} count={SNOW} box={SNOW_BOX} />
      </group>
      <Bolt ref={bolt} />
    </RegionSlot>
  );
}
