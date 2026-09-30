"use client";

import { useGLTF } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { Color, Mesh, MeshLambertMaterial, type BufferGeometry, type Material, type MeshStandardMaterial } from "three";
import { DRACO_PATH } from "@/lib/assets";
import { withRim } from "@/lib/wind";
import { markCollidersDirty } from "@/lib/colliders";
import { Scatter, type Placement } from "./Scatter";

/** Material hooks (e.g. windSway) to put on a model's foliage. */
type ShaderHooks = Pick<Material, "onBeforeCompile" | "customProgramCacheKey">;

export interface ModelLook {
  /** Multiplies foliage colour (leaves, grass, ferns): pulls packs toward the region palette. */
  foliage?: string;
  /** Multiplies everything else (bark, stone). */
  other?: string;
  /** Sways foliage. */
  wind?: ShaderHooks;
  /** Parts whose material name matches glow in this colour (e.g. a model's flames), unaffected by light. */
  glow?: { match: RegExp; color: string };
}

export interface ModelPart {
  geometry: BufferGeometry;
  material: MeshLambertMaterial;
  foliage: boolean;
}

const FOLIAGE = /leaf|leaves|grass|fern|bush|plant|flower/i;

/**
 * Loads a Draco-compressed .glb and returns its parts ready to render:
 * geometry with node transforms baked in, and each material converted to
 * Lambert (matching the rest of the world, and cheaper than PBR) and tinted.
 * Owns and disposes what it creates.
 */
export function useModelParts(url: string, look: ModelLook = {}): ModelPart[] {
  const { scene } = useGLTF(url, DRACO_PATH);
  const { foliage: foliageTint = "#ffffff", other: otherTint = "#ffffff", wind, glow } = look;
  const glowSource = glow?.match.source;
  const glowColor = glow?.color;

  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const found: ModelPart[] = [];
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const source = object.material as MeshStandardMaterial;
      const foliage = FOLIAGE.test(source.name) || FOLIAGE.test(object.name);
      const material = new MeshLambertMaterial({
        map: source.map,
        color: source.color.clone().multiply(new Color(foliage ? foliageTint : otherTint)),
        vertexColors: source.vertexColors,
        side: source.side,
        // Alpha-masked leaf cards (glTF MASK) keep their cut-out, and cast cut-out shadows.
        alphaTest: source.alphaTest > 0 ? source.alphaTest : source.transparent ? 0.5 : 0,
      });
      // Foliage sways (leaf cards' normals point every way, so no rim light there); everything else gets the rim.
      if (foliage) {
        if (wind) Object.assign(material, wind);
      } else Object.assign(material, withRim());
      if (glowSource && glowColor && new RegExp(glowSource, "i").test(source.name)) {
        material.color.set("#000000");
        material.emissive.set(glowColor);
      }
      found.push({ geometry: object.geometry.clone().applyMatrix4(object.matrixWorld), material, foliage });
    });
    return found;
  }, [scene, foliageTint, otherTint, wind, glowSource, glowColor]);

  useEffect(() => {
    // New props in the scene: the explore mode's colliders need rebuilding.
    markCollidersDirty();
    return () => {
      markCollidersDirty();
      parts.forEach((p) => {
        p.geometry.dispose();
        p.material.dispose();
      });
    };
  }, [parts]);
  return parts;
}

/**
 * Many copies of one model, one draw call per part (e.g. bark + leaves).
 * Suspends while loading: wrap in <Suspense> with a placeholder fallback.
 */
export function ModelScatter({
  url,
  items,
  look,
  castShadow = true,
  solid = true,
}: {
  url: string;
  items: readonly Placement[];
  look?: ModelLook;
  /** Distant copies can skip the shadow pass. */
  castShadow?: boolean;
  /** False for things the adventurer walks through (undergrowth, flowers). Foliage never blocks. */
  solid?: boolean;
}) {
  const parts = useModelParts(url, look);
  if (!items.length) return null;
  return (
    <>
      {parts.map((part, i) => (
        // Added after the initial shadow pass, so set shadow flags here.
        <Scatter
          key={i}
          items={items}
          castShadow={castShadow}
          receiveShadow
          userData={{ walkThrough: !solid || part.foliage }}
        >
          <primitive object={part.geometry} attach="geometry" />
          <primitive object={part.material} attach="material" />
        </Scatter>
      ))}
    </>
  );
}

/** A single placed model (for one-off props). Suspends while loading. */
export function Model({
  url,
  look,
  solid = true,
  ...props
}: { url: string; look?: ModelLook; solid?: boolean } & ThreeElements["group"]) {
  const parts = useModelParts(url, look);
  return (
    <group {...props} userData={{ walkThrough: !solid }}>
      {parts.map((part, i) => (
        <mesh key={i} geometry={part.geometry} material={part.material} castShadow receiveShadow />
      ))}
    </group>
  );
}

/**
 * Many copies of several model variants: items are dealt round-robin across
 * `urls`, and each item's scale is multiplied by `scale` (pack models are
 * sized in metres; scatter items were tuned for unit-sized primitives).
 */
export function ModelMix({
  urls,
  items,
  look,
  scale = 1,
  castShadow = true,
  solid = true,
}: {
  urls: readonly string[];
  items: readonly Placement[];
  look?: ModelLook;
  scale?: number | readonly [number, number, number];
  castShadow?: boolean;
  solid?: boolean;
}) {
  const k = typeof scale === "number" ? ([scale, scale, scale] as const) : scale;
  const scaled = items.map((it) => {
    const s = it.scale ?? 1;
    const v = typeof s === "number" ? ([s, s, s] as const) : s;
    return { ...it, scale: [v[0] * k[0], v[1] * k[1], v[2] * k[2]] as const };
  });
  return (
    <>
      {urls.map((url, m) => (
        <ModelScatter
          key={url}
          url={url}
          items={scaled.filter((_, i) => i % urls.length === m)}
          look={look}
          castShadow={castShadow}
          solid={solid}
        />
      ))}
    </>
  );
}
