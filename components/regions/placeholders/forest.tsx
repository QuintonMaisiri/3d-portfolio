"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  ConeGeometry,
  CylinderGeometry,
  MeshBasicMaterial,
  type Group,
  type Mesh,
  type MeshLambertMaterial,
  type Points,
} from "three";
import { Scatter, type Placement } from "@/components/world/Scatter";
import { mulberry32, between } from "@/lib/random";
import { windSway } from "@/lib/wind";
import { SoftPointsMaterial, useGeometry, type GroupProps } from "./common";

/** Woodland crowns bend from their lower edge; project-tree tiers from each tier's base. */
const crownWind = windSway(1.9, 0.04);
const tierWind = windSway(-1.3, 0.03);

/** Background woodland; pivot at the base. */
export function ForestTrees({ items }: { items: readonly Placement[] }) {
  const trunk = useGeometry(() => new CylinderGeometry(0.2, 0.32, 2.4, 5).translate(0, 1.2, 0));
  const crown = useGeometry(() => new ConeGeometry(1.4, 4.2, 6).translate(0, 4, 0));
  return (
    <>
      <Scatter items={items}>
        <primitive object={trunk} attach="geometry" />
        <meshLambertMaterial color="#3d2c20" flatShading />
      </Scatter>
      <Scatter items={items}>
        <primitive object={crown} attach="geometry" />
        <meshLambertMaterial color="#2f5a41" flatShading {...crownWind} />
      </Scatter>
    </>
  );
}

export interface ProjectTreeHandle {
  /**
   * `lit` 0..1: its project has appeared in the panel.
   * `hover` 0..1: pointer over the tree, or its entry hovered/focused in the panel.
   */
  setGlow: (lit: number, hover: number) => void;
}

/** Lanterns hanging from the tree's boughs: [x, y, z]. */
const LANTERNS = [
  [1.25, 3.3, 0.4],
  [-1.1, 3.5, -0.5],
  [0.3, 4.7, 1.0],
  [-0.7, 4.9, 0.6],
  [0.8, 6.0, -0.4],
] as const;

/** Total height of a project tree, for placing labels above it. */
export const PROJECT_TREE_HEIGHT = 7.4;

/**
 * A project tree: taller and paler than the woodland, hung with lanterns and
 * ringed at its roots. It lights when its project appears in the panel and
 * brightens further on hover. Pass pointer handlers as props; an invisible
 * column gives it a generous hit area.
 */
export const ProjectTree = forwardRef<ProjectTreeHandle, GroupProps & { accent: string }>(function ProjectTree(
  { accent, ...props },
  ref,
) {
  const ring = useRef<Mesh>(null);
  const ringMaterial = useRef<MeshBasicMaterial>(null);
  // One material shared by all of this tree's lanterns, so they light together.
  const [lanternMaterial] = useState(() => new MeshBasicMaterial({ color: "#2a3a33" }));
  useEffect(() => () => lanternMaterial.dispose(), [lanternMaterial]);
  const lanterns = useRef<Group>(null);
  const crowns = useRef<(MeshLambertMaterial | null)[]>([]);
  const colors = useRef({
    dormant: new Color("#0f2a20"),
    lit: new Color(accent).multiplyScalar(0.3),
    hover: new Color(accent).multiplyScalar(0.55),
    lanternOff: new Color("#2a3a33"),
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
      crowns.current.forEach((m) => m?.emissive.copy(c.scratch));
      lanternMaterial.color.lerpColors(c.lanternOff, c.lanternOn, lit).lerp(c.lanternHot, hover * 0.35);
      lanterns.current?.scale.setScalar(0.85 + 0.15 * lit + 0.2 * hover);
    },
  }));

  return (
    <group {...props}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.3, 0.45, 3, 6]} />
        <meshLambertMaterial color="#4b3525" flatShading />
      </mesh>
      {[0, 1, 2].map((tier) => (
        <mesh key={tier} position={[0, 3.6 + tier * 1.3, 0]}>
          <coneGeometry args={[1.9 - tier * 0.45, 2.6, 7]} />
          <meshLambertMaterial
            ref={(m) => {
              crowns.current[tier] = m;
            }}
            color="#4a8a68"
            emissive="#0f2a20"
            flatShading
            {...tierWind}
          />
        </mesh>
      ))}
      <group ref={lanterns}>
        {LANTERNS.map((p, i) => (
          <mesh key={i} position={p} material={lanternMaterial}>
            <octahedronGeometry args={[0.16, 0]} />
          </mesh>
        ))}
      </group>
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
});

/** Drifting motes of light. */
export const Fireflies = forwardRef<Points, { count: number; spread: number; color: string }>(function Fireflies(
  { count, spread, color },
  ref,
) {
  const geometry = useGeometry(() => {
    const rng = mulberry32(404);
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = between(rng, -spread, spread);
      positions[i * 3 + 1] = between(rng, 0.8, 5);
      positions[i * 3 + 2] = between(rng, -spread, spread * 0.5);
    }
    return new BufferGeometry().setAttribute("position", new BufferAttribute(positions, 3));
  });
  return (
    <points ref={ref} geometry={geometry}>
      <SoftPointsMaterial color={color} size={0.42} opacity={0.95} additive />
    </points>
  );
});

/** Vertical fade (greyscale, read as alpha): bright at the canopy, gone by the floor. */
function useShaftTexture() {
  const [texture] = useState(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const v = ctx.createLinearGradient(0, 0, 0, 128);
    v.addColorStop(0, "#000000");
    v.addColorStop(0.15, "#ffffff");
    v.addColorStop(1, "#000000");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, 32, 128);
    // Soften the sides.
    const h = ctx.createLinearGradient(0, 0, 32, 0);
    h.addColorStop(0, "rgba(0,0,0,1)");
    h.addColorStop(0.3, "rgba(0,0,0,0)");
    h.addColorStop(0.7, "rgba(0,0,0,0)");
    h.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = h;
    ctx.fillRect(0, 0, 32, 128);
    return new CanvasTexture(canvas);
  });
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** A soft shaft of light falling through the canopy. The region shimmers its opacity. */
export const LightShaft = forwardRef<Mesh, GroupProps & { color: string }>(function LightShaft({ color, ...props }, ref) {
  const alpha = useShaftTexture();
  return (
    <group {...props}>
      <mesh ref={ref} position={[0, 5, 0]}>
        <planeGeometry args={[2.6, 10]} />
        <meshBasicMaterial
          color={color}
          alphaMap={alpha}
          transparent
          opacity={0.14}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
});

/** Clusters of glowing mushrooms; pivot at the base. */
export function Mushrooms({ items, color }: { items: readonly Placement[]; color: string }) {
  const stem = useGeometry(() => new CylinderGeometry(0.05, 0.07, 0.3, 5).translate(0, 0.15, 0));
  const cap = useGeometry(() => new ConeGeometry(0.2, 0.14, 7).translate(0, 0.35, 0));
  return (
    <>
      <Scatter items={items}>
        <primitive object={stem} attach="geometry" />
        <meshLambertMaterial color="#d9e6dc" flatShading />
      </Scatter>
      <Scatter items={items}>
        <primitive object={cap} attach="geometry" />
        <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.6} flatShading />
      </Scatter>
    </>
  );
}
