"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, Color, Object3D, type InstancedMesh, type Mesh, type MeshBasicMaterial, type Points, type PointsMaterial } from "three";
import { milestones } from "@/content/experience";
import { clamp01, easeOutCubic, lerp } from "@/lib/journey";
import { sceneBeat } from "@/lib/narrative";
import { mulberry32, between } from "@/lib/random";
import { regionById } from "@/lib/regions";
import { SoftPointsMaterial, useGeometry } from "./placeholders/common";
import {
  BrokenArch,
  BrokenColumns,
  BrokenWalls,
  Causeway,
  FallenColumns,
  MilestoneTablet,
  NowMarker,
  Ripple,
  Statues,
  SunkenSteps,
  Water,
  type MilestoneTabletHandle,
} from "./models/ruins";
import { clearOfCamera } from "@/lib/cameraPath";
import { registerSurface } from "@/lib/surfaces";
import { Interactable } from "@/components/world/explore/Interaction";
import { ambientMotion, RegionSlot, useRegionFrame } from "./shared";

const region = regionById.ruins;
const WATER_Y = region.center[1] + 0.75;
const SUNK = WATER_Y - 3.4;
const RISEN = WATER_Y - 0.4;

/** Tablets in career order, stepping away from the viewer on the right. */
const TABLETS = milestones.map((m, i) => ({ id: m.id, x: -1 + i * 2.6, z: -2 - i * 2.2 }));
/** Causeway stones between consecutive tablets. */
const STONES_BETWEEN = 3;
const CAUSEWAY = TABLETS.slice(1).flatMap((to, i) => {
  const from = TABLETS[i]!;
  return Array.from({ length: STONES_BETWEEN }, (_, k) => {
    const t = (k + 1) / (STONES_BETWEEN + 1);
    return { leg: i, k, x: lerp(from.x, to.x, t), z: lerp(from.z, to.z, t) + 0.9 };
  });
});
const MOTES = 120;

/** Broken wall stretches on an outer ring, sunk to their knees; any near the camera's route are left out. */
const WALLS = [-2.1, -1.4, -0.7, 0.9, 1.6, 2.2]
  .map((a, i) => {
    const r = 20 + (i % 2) * 4;
    return { position: [Math.sin(a) * r, WATER_Y - 0.9, -Math.cos(a) * r + 2] as const, rotation: [0, -a + 0.3 * (i % 3), 0.05] as const };
  })
  .filter(({ position: [x, , z] }) => clearOfCamera(region.center[0] + x, region.center[2] + z, 5));

const dummy = new Object3D();
const stoneOff = new Color("#56645e");
const stoneOn = new Color(region.palette.accent).multiplyScalar(0.8);
const tint = new Color();

export function Ruins() {
  const columns = useMemo(() => {
    const rng = mulberry32(601);
    return Array.from({ length: 22 }, () => {
      const a = between(rng, -2.4, 2.4);
      const r = between(rng, 9, 22);
      return {
        position: [Math.sin(a) * r, WATER_Y - 1.2, -Math.cos(a) * r + 2] as const,
        rotation: [between(rng, -0.12, 0.12), rng() * 6, between(rng, -0.12, 0.12)] as const,
        scale: [1, between(rng, 0.25, 1.1), 1] as const,
      };
    });
  }, []);
  const fallen = useMemo(() => {
    const rng = mulberry32(602);
    return Array.from({ length: 7 }, () => ({
      position: [between(rng, -3, 14), WATER_Y - 0.15, between(rng, -16, -4)] as const,
      rotation: [0, rng() * 6, Math.PI / 2] as const,
    }));
  }, []);
  const motes = useGeometry(() => {
    const rng = mulberry32(603);
    const p = new Float32Array(MOTES * 3);
    for (let i = 0; i < MOTES; i++) {
      p[i * 3] = between(rng, -6, 16);
      p[i * 3 + 1] = between(rng, 0.3, 3.5);
      p[i * 3 + 2] = between(rng, -18, 4);
    }
    return new BufferGeometry().setAttribute("position", new BufferAttribute(p, 3));
  });

  const tablets = useRef<(MilestoneTabletHandle | null)[]>([]);
  const ripples = useRef<(Mesh | null)[]>([]);
  const causeway = useRef<InstancedMesh>(null);
  const now = useRef<Points>(null);
  const water = useRef<Mesh>(null);
  const moteGroup = useRef<Points>(null);

  // Wading depth: the adventurer's feet rest this far below the water.
  useEffect(
    () => registerSurface("ruins:lagoon", { x: region.center[0], z: region.center[2] - 4, radius: 46, y: WATER_Y - 0.55 }),
    [],
  );

  useLayoutEffect(() => {
    const mesh = causeway.current;
    if (!mesh) return;
    CAUSEWAY.forEach((s, i) => {
      dummy.position.set(s.x, WATER_Y + 0.02, s.z);
      dummy.rotation.set(0, i, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, stoneOff);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  useRegionFrame(region, ({ clock }) => {
    const t = clock.elapsedTime;
    const ambient = ambientMotion();
    // Each milestone's beat (beat 0 is the header): its tablet rises from the
    // water and its inscription lights; the causeway to it lights on the way.
    const beat = TABLETS.map((_, i) => sceneBeat(region.index, i + 1));

    TABLETS.forEach((_, i) => {
      const rise = easeOutCubic(beat[i]!);
      const tablet = tablets.current[i];
      tablet?.setY(lerp(SUNK, RISEN, rise) + (ambient ? Math.sin(t * 0.8 + i) * 0.04 : 0));
      tablet?.setLit(smoothRise(beat[i]!));

      // A ripple spreads from each risen tablet.
      const ripple = ripples.current[i];
      if (ripple) {
        const phase = ambient ? (t * 0.35 + i * 0.37) % 1 : 0.5;
        ripple.scale.setScalar(1 + phase * 2.6);
        (ripple.material as MeshBasicMaterial).opacity = rise > 0.9 ? (1 - phase) * 0.35 : 0;
      }
    });

    const mesh = causeway.current;
    if (mesh) {
      CAUSEWAY.forEach((s, i) => {
        // Stones light in turn as the next milestone arrives.
        const walk = clamp01(beat[s.leg + 1]! * (STONES_BETWEEN + 1) - s.k);
        mesh.setColorAt(i, tint.lerpColors(stoneOff, stoneOn, walk));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }

    // "You are here" over the latest milestone.
    if (now.current) {
      const last = beat[TABLETS.length - 1]!;
      (now.current.material as PointsMaterial).opacity = easeOutCubic(clamp01((last - 0.6) / 0.4));
      now.current.position.y = RISEN + 3.9 + (ambient ? Math.sin(t * 1.4) * 0.15 : 0);
    }

    if (!ambient) return;
    if (water.current) water.current.position.y = WATER_Y + Math.sin(t * 0.5) * 0.05;
    if (moteGroup.current) {
      moteGroup.current.rotation.y = Math.sin(t * 0.05) * 0.2;
      moteGroup.current.position.y = Math.sin(t * 0.3) * 0.2;
    }
  });

  const last = TABLETS[TABLETS.length - 1]!;

  return (
    <RegionSlot region={region}>
      <Water ref={water} radius={48} color="#2f6f78" position={[0, WATER_Y, -4]} />
      <BrokenColumns items={columns} />
      <FallenColumns items={fallen} />
      <BrokenWalls items={WALLS} />
      <Statues
        stag={{ position: [-12, WATER_Y - 1.1, -13], rotation: [0.04, 0.6, 0], scale: 1.3 }}
        fox={{ position: [17, WATER_Y - 0.9, -4], rotation: [0, -1.1, -0.05], scale: 1.2 }}
      />
      <BrokenArch position={[8, WATER_Y - 1.2, -16]} rotation={[0, -0.4, 0]} />
      <SunkenSteps position={[-3.5, WATER_Y + 0.2, 3]} rotation={[0, 0.5, 0]} />
      <Causeway ref={causeway} count={CAUSEWAY.length} />
      {TABLETS.map((tab) => (
        <Interactable
          key={`use-${tab.id}`}
          id={`ruins:${tab.id}`}
          region={region}
          position={[tab.x + 1.3, WATER_Y, tab.z + 1]}
          pages={[`milestone:${tab.id}`]}
          prompt="Raise the tablet"
          markerHeight={2.2}
          color={region.palette.accent}
        />
      ))}
      {TABLETS.map((tab, i) => (
        <group key={tab.id}>
          <MilestoneTablet
            ref={(el) => {
              tablets.current[i] = el;
            }}
            glow={region.palette.accent}
            position={[tab.x, SUNK, tab.z]}
            rotation={[0, -0.25, 0]}
          />
          <Ripple
            ref={(el) => {
              ripples.current[i] = el;
            }}
            color={region.palette.accent}
            position={[tab.x, WATER_Y + 0.03, tab.z]}
          />
        </group>
      ))}
      <NowMarker ref={now} color={region.palette.accent} position={[last.x, RISEN + 3.9, last.z]} />
      <points ref={moteGroup} geometry={motes}>
        <SoftPointsMaterial color={region.palette.accent} size={0.2} opacity={0.75} additive />
      </points>
    </RegionSlot>
  );
}

/** Inscriptions light over the second half of the rise. */
function smoothRise(beat: number) {
  return clamp01((beat - 0.4) / 0.6);
}
