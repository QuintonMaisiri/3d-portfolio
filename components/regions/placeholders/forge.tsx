"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  type InstancedMesh,
  type Material,
  type MeshBasicMaterial,
  type Points,
} from "three";
import { Scatter, type Placement } from "@/components/world/Scatter";
import { useGeometry, useSoftDot, type GroupProps } from "./common";

export { Rocks } from "./common";

export interface MoltenPoolHandle {
  /** 0..1 brightness breathing; 1 is full heat. */
  setHeat: (heat: number) => void;
}

/** Lava pool: white-hot centre cooling to deep red at the rim. */
export const MoltenPool = forwardRef<MoltenPoolHandle, GroupProps & { radius: number }>(function MoltenPool(
  { radius, ...props },
  ref,
) {
  const material = useRef<MeshBasicMaterial>(null);
  const geometry = useGeometry(() => {
    const g = new CircleGeometry(radius, 18, 0, Math.PI * 2);
    const position = g.getAttribute("position") as BufferAttribute;
    const colors = new Float32Array(position.count * 3);
    const hot = new Color("#ffd27a");
    const cool = new Color("#b0300c");
    const c = new Color();
    for (let v = 0; v < position.count; v++) {
      const r = Math.hypot(position.getX(v), position.getY(v)) / radius;
      c.lerpColors(hot, cool, Math.pow(r, 0.8)).toArray(colors, v * 3);
    }
    g.setAttribute("color", new BufferAttribute(colors, 3));
    return g;
  });

  useImperativeHandle(ref, () => ({
    setHeat(heat) {
      material.current?.color.setScalar(0.82 + 0.18 * heat);
    },
  }));

  return (
    <group {...props}>
      <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial ref={material} vertexColors />
      </mesh>
    </group>
  );
});

/** Cooled crust drifting on the lava. */
export function CrustPlates({ items }: { items: readonly Placement[] }) {
  return (
    <Scatter items={items}>
      <cylinderGeometry args={[0.6, 0.7, 0.12, 5]} />
      <meshLambertMaterial color="#2a1c16" flatShading />
    </Scatter>
  );
}

export function Anvil(props: GroupProps) {
  return (
    <group {...props}>
      <mesh position={[0, 0.45, 0]}>
        <boxGeometry args={[0.8, 0.9, 0.8]} />
        <meshLambertMaterial color="#3a3634" flatShading />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <boxGeometry args={[1.8, 0.35, 0.7]} />
        <meshLambertMaterial color="#4a4543" flatShading />
      </mesh>
      {/* Hammer resting across the face. */}
      <group position={[0.2, 1.3, 0.05]} rotation={[0, 0.6, 0]}>
        <mesh position={[0.35, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.9, 6]} />
          <meshLambertMaterial color="#5a3b26" flatShading />
        </mesh>
        <mesh position={[-0.15, 0, 0]}>
          <boxGeometry args={[0.24, 0.2, 0.36]} />
          <meshLambertMaterial color="#2e2b2a" flatShading />
        </mesh>
      </group>
    </group>
  );
}

/** The hearth: a stone forge with a glowing mouth and a chimney. Pivot at the base centre. */
export function Hearth(props: GroupProps) {
  return (
    <group {...props}>
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[7, 4, 3]} />
        <meshLambertMaterial color="#3a302c" flatShading />
      </mesh>
      <mesh position={[0, 1.4, 1.52]}>
        <planeGeometry args={[3, 1.8]} />
        <meshBasicMaterial color="#ff7a2a" />
      </mesh>
      <mesh position={[0, 0.6, 1.53]}>
        <planeGeometry args={[3.4, 0.4]} />
        <meshBasicMaterial color="#ffc15a" />
      </mesh>
      <mesh position={[1.8, 7, -0.4]}>
        <boxGeometry args={[1.8, 7, 1.8]} />
        <meshLambertMaterial color="#33292a" flatShading />
      </mesh>
    </group>
  );
}

export interface PedestalHandle {
  /** 0 = dormant, 1 = its skill group has arrived. */
  setLit: (amount: number) => void;
}

/** A stone pedestal for one skill domain, with a ring that lights in the group's colour. Pivot at the base. */
export const Pedestal = forwardRef<PedestalHandle, GroupProps & { color: string; height: number }>(function Pedestal(
  { color, height, ...props },
  ref,
) {
  const ring = useRef<MeshBasicMaterial>(null);
  const colors = useRef({ off: new Color("#3a2a22"), on: new Color(color) });
  const column = useGeometry(() => new CylinderGeometry(0.75, 0.95, height, 6).translate(0, height / 2, 0));

  useImperativeHandle(ref, () => ({
    setLit(amount) {
      ring.current?.color.lerpColors(colors.current.off, colors.current.on, amount);
    },
  }));

  return (
    <group {...props}>
      <mesh geometry={column}>
        <meshLambertMaterial color="#4a3e38" flatShading />
      </mesh>
      <mesh position={[0, height + 0.12, 0]}>
        <cylinderGeometry args={[1.05, 1.05, 0.24, 6]} />
        <meshLambertMaterial color="#3e332e" flatShading />
      </mesh>
      <mesh position={[0, height + 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.9, 6]} />
        <meshBasicMaterial ref={ring} color="#3a2a22" />
      </mesh>
    </group>
  );
});

/**
 * three tints only the diffuse by instance colour, so under the Forge's orange
 * light every orb would read orange. This makes each orb glow in its own colour
 * too, while keeping the faceted shading.
 */
const glowInInstanceColour: Material["onBeforeCompile"] = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    "vec3 totalEmissiveRadiance = emissive;",
    "vec3 totalEmissiveRadiance = emissive * vColor.rgb;",
  );
};
const orbProgramKey = () => "skill-orb-instance-emissive";

/** Instanced skill orbs: faceted gems glowing in their group's colour. The region places and colours each instance. */
export const SkillOrbs = forwardRef<InstancedMesh, { count: number }>(function SkillOrbs({ count }, ref) {
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <icosahedronGeometry args={[0.3, 1]} />
      <meshLambertMaterial
        flatShading
        emissive="#ffffff"
        emissiveIntensity={0.55}
        onBeforeCompile={glowInInstanceColour}
        customProgramCacheKey={orbProgramKey}
      />
    </instancedMesh>
  );
});

/**
 * Additive soft glows drawn as points: orb halos and rising embers.
 * The region writes positions and colours (black = invisible) every frame.
 */
export const GlowPoints = forwardRef<
  Points,
  { count: number; size: number; fog?: boolean; profile?: "glow" | "halo" }
>(function GlowPoints({ count, size, fog = true, profile = "halo" }, ref) {
  const dot = useSoftDot(profile);
  const geometry = useGeometry(() =>
    new BufferGeometry()
      .setAttribute("position", new BufferAttribute(new Float32Array(count * 3), 3))
      .setAttribute("color", new BufferAttribute(new Float32Array(count * 3), 3)),
  );
  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={dot}
        size={size}
        sizeAttenuation
        vertexColors
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        fog={fog}
      />
    </points>
  );
});

