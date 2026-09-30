"use client";

import { useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Vector3, type PointsMaterial } from "three";
import { useSoftDot } from "@/components/regions/placeholders/common";
import { Model, type ModelLook } from "@/components/world/ModelScatter";
import { interaction, registerInteractable } from "@/lib/interactables";
import { MODELS } from "@/lib/models";
import { spawnPoint } from "@/lib/player";
import { regions } from "@/lib/regions";
import { floorAt } from "@/lib/surfaces";
import type { RegionConfig } from "@/lib/types";

/** Beside each region's arrival spot, a little off the road. */
const OFFSET = { x: 3.2, z: 1 };
/** The dungeon pack's pedestal is 2.31 tall; waystones stand about waist high. */
const SCALE = 0.55;
const TOP = 2.31 * SCALE;
const LOOK: ModelLook = { other: "#b8b0a8" };

function Waystone({ region }: { region: RegionConfig }) {
  const at = useMemo(() => {
    const p = spawnPoint(region.id).add(new Vector3(OFFSET.x, 0, OFFSET.z));
    p.y = floorAt(p.x, p.z);
    return p;
  }, [region]);
  const dot = useSoftDot();
  const glow = useRef<PointsMaterial>(null);
  const geometry = useMemo(
    () => new BufferGeometry().setAttribute("position", new BufferAttribute(new Float32Array([0, TOP + 0.25, 0]), 3)),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const id = `waystone:${region.id}`;
  useEffect(
    () =>
      registerInteractable({
        id,
        position: new Vector3(at.x, at.y + 1, at.z),
        radius: 2.4,
        prompt: "Touch the waystone to travel",
        action: "look",
        use: () => ({ open: "@map", fresh: false }),
      }),
    [id, at],
  );

  useFrame(({ clock }) => {
    const m = glow.current;
    if (!m) return;
    const focused = interaction.focused?.id === id;
    m.opacity = (focused ? 0.95 : 0.55) + 0.1 * Math.sin(clock.elapsedTime * 1.7 + region.index);
    m.size = focused ? 1.4 : 1.05;
  });

  return (
    <group position={at}>
      <Suspense fallback={null}>
        <Model url={MODELS.dungeon.pedestal2} look={LOOK} scale={SCALE} />
      </Suspense>
      <points geometry={geometry}>
        <pointsMaterial
          ref={glow}
          map={dot}
          color={region.palette.accent}
          size={1.05}
          sizeAttenuation
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  );
}

/** A waystone in every region: touch one to open the Codex's map and travel to anywhere already visited. */
export function Waystones() {
  return (
    <>
      {regions.map((r) => (
        <Waystone key={r.id} region={r} />
      ))}
    </>
  );
}
