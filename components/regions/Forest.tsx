"use client";

import { Html } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { Mesh, MeshBasicMaterial, Points } from "three";
import { projects } from "@/content/projects";
import { damp, easeOutCubic } from "@/lib/journey";
import { narrative, sceneBeat } from "@/lib/narrative";
import { mulberry32, between } from "@/lib/random";
import { regionById } from "@/lib/regions";
import { useCodex } from "@/lib/store";
import { input } from "@/lib/input";
import { GrassField } from "@/components/world/GrassField";
// Asset slot: "./models/forest" (real models) or "./placeholders/forest" (primitives).
import {
  Fireflies,
  ForestTrees,
  LightShaft,
  Mushrooms,
  PROJECT_TREE_HEIGHT,
  ProjectTree,
  Undergrowth,
  type ProjectTreeHandle,
} from "./models/forest";
import { Interactable } from "@/components/world/explore/Interaction";
import { ambientMotion, groundAt, RegionSlot, scatter, useRegionFrame } from "./shared";

const region = regionById.forest;
const ground = groundAt(region);

/**
 * Project trees stand in two staggered rows in the open (right) side of the
 * frame, so each reads as its own tree; kept right of the camera's route
 * onward to the Peaks (which runs at x of about -5). Extra projects continue
 * further back.
 */
const PROJECT_ROWS = [
  [0.2, -2],
  [3.8, -8],
  [4.4, -1.5],
  [8, -7.5],
  [8.4, -1],
  [11.5, -7],
] as const;
const PROJECT_SPOTS = projects.map((project, i) => {
  const [rx, rz] = PROJECT_ROWS[i % PROJECT_ROWS.length]!;
  const x = rx + Math.floor(i / PROJECT_ROWS.length) * 2;
  const z = rz - Math.floor(i / PROJECT_ROWS.length) * 7;
  return { id: project.id, name: project.name, x, z, y: ground(x, z) - 0.1 };
});
/** Pack trees lean along their +x; turning +x to -z leans every crown back, away from the camera. */
const LEAN_BACK = Math.PI / 2;

/** Where the forest floor grass grows (region-local), covering what the camera sees. */
const FOREST_GRASS = [-22, 26, -32, 16] as const;

/** Light shafts through the canopy: [x, z, lean]. */
const SHAFTS = [
  [-1, -6, 0.18],
  [4.5, -3, -0.12],
  [9, -9, 0.1],
  [1.5, -13, -0.2],
] as const;

/** Trees only respond while the Forest panel is on screen, never mid-travel. */
const forestIsPresent = () => {
  const panel = narrative.panels[region.index]!;
  return panel.reveal * panel.leave > 0.5;
};

const setCursor = (pointer: boolean) => {
  document.body.style.cursor = pointer ? "pointer" : "";
};

export function Forest() {
  const woodland = useMemo(
    () =>
      scatter(region, {
        seed: 401,
        count: 120,
        area: [-45, 45, -40, 28],
        scale: [0.7, 1.5],
        tilt: 0.06,
        keep: (x, z) => PROJECT_SPOTS.every((s) => Math.hypot(x - s.x, z - s.z) > 3),
      }),
    [],
  );
  const mushrooms = useMemo(() => {
    // Small clusters at the roots of each project tree, plus a few strays.
    const rng = mulberry32(402);
    const spots = [
      ...PROJECT_SPOTS.map((s) => ({ x: s.x, z: s.z })),
      ...Array.from({ length: 6 }, () => ({ x: between(rng, -6, 12), z: between(rng, -12, 2) })),
    ];
    return spots.flatMap(({ x, z }) =>
      Array.from({ length: 4 }, () => {
        const a = rng() * Math.PI * 2;
        const r = between(rng, 1.5, 2.3);
        const mx = x + Math.cos(a) * r;
        const mz = z + Math.sin(a) * r;
        return {
          position: [mx, ground(mx, mz) - 0.02, mz] as const,
          scale: between(rng, 0.7, 1.4),
          rotation: [0, rng() * 6, 0] as const,
        };
      }),
    );
  }, []);

  const undergrowth = useMemo(
    () =>
      scatter(region, {
        seed: 403,
        count: 110,
        area: [-30, 30, -30, 22],
        scale: [0.8, 1.5],
        tilt: 0.08,
        keep: (x, z) => PROJECT_SPOTS.every((s) => Math.hypot(x - s.x, z - s.z) > 1.8),
      }),
    [],
  );

  const hoveredId = useCodex((s) => s.hoveredProjectId);
  const hoverProject = useCodex((s) => s.hoverProject);
  const openProject = useCodex((s) => s.openProject);

  const flies = useRef<Points>(null);
  const trees = useRef<(ProjectTreeHandle | null)[]>([]);
  const hover = useRef<number[]>(PROJECT_SPOTS.map(() => 0));
  const shafts = useRef<(Mesh | null)[]>([]);

  // Never leave a pointer cursor behind.
  useEffect(() => () => setCursor(false), []);

  useRegionFrame(region, ({ clock }, delta) => {
    const t = clock.elapsedTime;
    const ambient = ambientMotion();
    // Each project's tree lights as its name builds into the panel (beat 0 is
    // the header) and brightens while hovered, here or in the panel list.
    const current = useCodex.getState().hoveredProjectId;
    PROJECT_SPOTS.forEach((spot, i) => {
      const target = current === spot.id ? 1 : 0;
      hover.current[i] = ambient ? damp(hover.current[i]!, target, 10, delta) : target;
      trees.current[i]?.setGlow(easeOutCubic(sceneBeat(region.index, i + 1)), hover.current[i]!);
    });

    if (!ambient) return;
    if (flies.current) {
      flies.current.rotation.y = t * 0.02;
      flies.current.position.y = Math.sin(t * 0.4) * 0.3;
    }
    shafts.current.forEach((shaft, i) => {
      if (shaft) (shaft.material as MeshBasicMaterial).opacity = 0.11 + 0.05 * Math.sin(t * 0.35 + i * 1.9);
    });
  });

  const handlers = (id: string) => ({
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (!forestIsPresent()) return;
      hoverProject(id);
      setCursor(true);
    },
    onPointerOut: () => {
      if (useCodex.getState().hoveredProjectId === id) hoverProject(null);
      setCursor(false);
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (!forestIsPresent()) return;
      setCursor(false);
      // Exploring, the tree is used like anything else: walk over, read its page into the Codex.
      if (useCodex.getState().viewMode === "explore") {
        input.tap = null;
        useCodex.getState().requestInteract(`forest:${id}`);
      } else openProject(id);
    },
  });

  const hovered = PROJECT_SPOTS.find((s) => s.id === hoveredId);

  return (
    <RegionSlot region={region}>
      <ForestTrees items={woodland} />
      <Undergrowth items={undergrowth} />
      <GrassField region={region} count={28000} area={FOREST_GRASS} root="#1c3526" tip="#6fa47f" seed={410} />
      {PROJECT_SPOTS.map((spot) => (
        <Interactable
          key={`use-${spot.id}`}
          id={`forest:${spot.id}`}
          region={region}
          position={[spot.x, ground(spot.x, spot.z), spot.z + 2.2]}
          pages={[`project:${spot.id}`]}
          prompt={`Read ${projects.find((p) => p.id === spot.id)!.name}`}
          markerHeight={2.4}
          color="#ffb070"
        />
      ))}
      {PROJECT_SPOTS.map((spot, i) => (
        <ProjectTree
          key={spot.id}
          ref={(el) => {
            trees.current[i] = el;
          }}
          accent={region.palette.accent}
          variant={i}
          position={[spot.x, spot.y, spot.z]}
          rotation={[0, LEAN_BACK, 0]}
          {...handlers(spot.id)}
        />
      ))}
      {hovered ? (
        // Decorative echo of the hovered entry; the canvas is aria-hidden and the panel list is canonical.
        <Html position={[hovered.x, hovered.y + PROJECT_TREE_HEIGHT + 0.6, hovered.z]} center zIndexRange={[20, 0]}>
          <div className="pointer-events-none rounded-full bg-black/75 px-3 py-1.5 text-sm whitespace-nowrap text-[#f3efe4] shadow-lg">
            <span className="font-semibold">{hovered.name}</span>
            <span className="ml-2 text-[#cbc5b6]">Open</span>
          </div>
        </Html>
      ) : null}
      <Mushrooms items={mushrooms} color="#7fe6d0" />
      {SHAFTS.map(([x, z, lean], i) => (
        <LightShaft
          key={i}
          ref={(el) => {
            shafts.current[i] = el;
          }}
          color="#d9ffe9"
          position={[x, ground(x, z), z]}
          rotation={[0, 0, lean]}
        />
      ))}
      <group position={[0, ground(0, 0), 0]}>
        <Fireflies ref={flies} count={160} spread={16} color={region.palette.accent} />
      </group>
    </RegionSlot>
  );
}
