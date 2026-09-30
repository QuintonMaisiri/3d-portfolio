"use client";

import { useMemo, useRef } from "react";
import { BufferAttribute, BufferGeometry, Color, type Mesh, type MeshLambertMaterial, type Points } from "three";
import { testimonials } from "@/content/testimonials";
import { damp, easeOutCubic, lerp } from "@/lib/journey";
import { sceneBeat } from "@/lib/narrative";
import { mulberry32, between } from "@/lib/random";
import { regionById } from "@/lib/regions";
import { useCodex } from "@/lib/store";
import type { Vec3 } from "@/lib/types";
import { SoftPointsMaterial, useGeometry } from "./placeholders/common";
import { CaveRock, Crystal, CrystalShards, GlowPoints, Stalactites, Stalagmites } from "./models/caves";
import { Interactable } from "@/components/world/explore/Interaction";
import { ambientMotion, groundAt, RegionSlot, scatter, useRegionFrame } from "./shared";

const region = regionById.caves;
const ground = groundAt(region);

/**
 * The tunnel runs along local z; the camera enters from +z. It is asymmetric
 * because the camera sits right of centre (so the scene clears the panel):
 * the right wall is set out further and the roof raised, so the camera line
 * stays well inside the rock.
 */
const TUNNEL = { left: -10, right: 14, height: 11, front: 14, back: -26 };

/** One large crystal per testimonial, stepping deeper into the tunnel on the left (the panel sits right). */
const CRYSTAL_SPOTS = [
  // Chosen so each lands in its own third of the open (left) side of the frame.
  [-2, 1],
  [-1, -4],
  [-3, -10],
] as const;
const CRYSTALS = testimonials.map((t, i) => {
  const [x, z] = CRYSTAL_SPOTS[i % CRYSTAL_SPOTS.length]!;
  const deeper = Math.floor(i / CRYSTAL_SPOTS.length);
  return { id: t.id, x: x - deeper * 3, z: z - deeper * 12, size: 1.5 - (i % 3) * 0.15 };
});
const SPARKS_PER_CRYSTAL = 8;
const SPORES = 150;

function tunnelRocks(): { position: Vec3; rotation: Vec3; scale: number }[] {
  const rng = mulberry32(701);
  const rocks: { position: Vec3; rotation: Vec3; scale: number }[] = [];
  for (let z = TUNNEL.front; z > TUNNEL.back; z -= 2.2) {
    for (const side of [-1, 1]) {
      const wall = side < 0 ? TUNNEL.left : TUNNEL.right;
      // Walls: stacked boulders leaning in toward the ceiling.
      for (let level = 0; level < 3; level++) {
        const x = wall - side * (level * 1.4) + between(rng, -1, 1);
        const y = ground(x, z) + level * 3 + between(rng, -0.5, 0.5);
        rocks.push({ position: [x, y, z + between(rng, -0.8, 0.8)], rotation: [rng() * 3, rng() * 3, rng() * 3], scale: between(rng, 1.8, 2.8) });
      }
    }
    // Ceiling.
    for (let x = TUNNEL.left + 4; x < TUNNEL.right - 3; x += 3.2) {
      rocks.push({
        position: [x + between(rng, -1, 1), ground(0, z) + TUNNEL.height + between(rng, -0.6, 0.8), z],
        rotation: [rng() * 3, rng() * 3, rng() * 3],
        scale: between(rng, 1.8, 2.6),
      });
    }
  }
  return rocks;
}

const sparkColor = new Color();
const accent = new Color(region.palette.accent);

export function Caves() {
  const rocks = useMemo(() => tunnelRocks(), []);
  const shards = useMemo(
    () =>
      scatter(region, {
        seed: 702,
        count: 70,
        area: [TUNNEL.left + 1, TUNNEL.right - 1, TUNNEL.back, TUNNEL.front],
        scale: [0.5, 1.6],
        sink: 0.2,
        keep: (x) => Math.abs(x - 4.5) > 2.5,
      }),
    [],
  );
  const stalactites = useMemo(() => {
    const rng = mulberry32(703);
    return Array.from({ length: 34 }, () => {
      const x = between(rng, TUNNEL.left + 2, TUNNEL.right - 2);
      const z = between(rng, TUNNEL.back + 2, TUNNEL.front - 2);
      const s = between(rng, 0.6, 1.4);
      return { position: [x, ground(0, z) + TUNNEL.height - 0.8, z] as const, scale: [s, s * between(rng, 0.8, 1.3), s] as const };
    });
  }, []);
  const stalagmites = useMemo(
    () =>
      scatter(region, {
        seed: 704,
        count: 22,
        area: [TUNNEL.left + 1.5, TUNNEL.right - 1.5, TUNNEL.back, TUNNEL.front - 2],
        scale: [0.6, 1.5],
        sink: 0.1,
        keep: (x, z) => CRYSTALS.every((c) => Math.hypot(x - c.x, z - c.z) > 2.2),
      }),
    [],
  );
  const spores = useGeometry(() => {
    const rng = mulberry32(705);
    const p = new Float32Array(SPORES * 3);
    for (let i = 0; i < SPORES; i++) {
      p[i * 3] = between(rng, TUNNEL.left + 1, TUNNEL.right - 1);
      p[i * 3 + 1] = ground(0, 0) + between(rng, 0.5, TUNNEL.height - 1);
      p[i * 3 + 2] = between(rng, TUNNEL.back, TUNNEL.front);
    }
    return new BufferGeometry().setAttribute("position", new BufferAttribute(p, 3));
  });

  const crystals = useRef<(Mesh | null)[]>([]);
  const sparks = useRef<Points>(null);
  const sporeCloud = useRef<Points>(null);
  const hover = useRef<number[]>(CRYSTALS.map(() => 0));
  const harmony = useRef(0);

  useRegionFrame(region, ({ clock }, delta) => {
    const t = clock.elapsedTime;
    const ambient = ambientMotion();
    const hovered = useCodex.getState().hoveredQuoteId;
    const sp = sparks.current?.geometry.getAttribute("position") as BufferAttribute | undefined;
    const sc = sparks.current?.geometry.getAttribute("color") as BufferAttribute | undefined;

    // Every crystal lit: the chamber harmonises, all of them pulsing as one.
    const chord = CRYSTALS.every((_, i) => sceneBeat(region.index, i + 1) >= 1) ? 1 : 0;
    harmony.current = ambient ? damp(harmony.current, chord, 0.7, delta) : chord;
    const together = harmony.current * (ambient ? 0.5 + 0.5 * Math.sin(t * 2.2) : 0.6);

    CRYSTALS.forEach((cr, i) => {
      // Each crystal wakes as its quote builds into the panel (beat 0 is the
      // header), and brightens while its quote is hovered.
      const glow = easeOutCubic(sceneBeat(region.index, i + 1));
      const target = hovered === cr.id ? 1 : 0;
      hover.current[i] = ambient ? damp(hover.current[i]!, target, 10, delta) : target;
      const h = hover.current[i]!;
      const c = crystals.current[i];
      if (c) {
        const pulse = ambient ? 1 + Math.sin(t * 1.3 + i) * 0.08 : 1;
        (c.material as MeshLambertMaterial).emissiveIntensity = (lerp(0.12, 0.85, glow) + h * 0.5 + together * 0.6) * pulse;
        const size = cr.size * lerp(0.85, 1, glow) * (1 + h * 0.06);
        c.scale.set(size * 0.7, size * 1.8, size * 0.7);
        if (ambient) c.rotation.y = t * 0.25 + i;
      }

      // Sparkles orbit a lit crystal and twinkle.
      if (sp && sc) {
        for (let k = 0; k < SPARKS_PER_CRYSTAL; k++) {
          const n = i * SPARKS_PER_CRYSTAL + k;
          const a = (ambient ? t * 0.4 : 0) + (k / SPARKS_PER_CRYSTAL) * Math.PI * 2 + i;
          const r = cr.size * (1.1 + 0.3 * Math.sin(k * 2.3));
          sp.setXYZ(n, cr.x + Math.cos(a) * r, ground(cr.x, cr.z) + cr.size * (1.2 + (k % 4) * 0.55), cr.z + Math.sin(a) * r);
          const twinkle = ambient ? 0.5 + 0.5 * Math.sin(t * 3 + k * 1.7 + i) : 0.8;
          sparkColor.copy(accent).multiplyScalar(0.6 * glow * twinkle + 0.4 * h + 0.5 * together);
          sc.setXYZ(n, sparkColor.r, sparkColor.g, sparkColor.b);
        }
      }
    });
    if (sp) sp.needsUpdate = true;
    if (sc) sc.needsUpdate = true;

    if (ambient && sporeCloud.current) {
      sporeCloud.current.rotation.y = Math.sin(t * 0.03) * 0.1;
      sporeCloud.current.position.y = Math.sin(t * 0.2) * 0.3;
    }
  });

  return (
    <RegionSlot region={region}>
      <CaveRock items={rocks} />
      <Stalactites items={stalactites} />
      <Stalagmites items={stalagmites} />
      <CrystalShards items={shards} color="#9b7cf0" />
      {CRYSTALS.map((c) => (
        <Interactable
          key={`use-${c.id}`}
          id={`caves:${c.id}`}
          region={region}
          position={[c.x + 1.6, ground(c.x + 1.6, c.z + 1.2), c.z + 1.2]}
          pages={[`quote:${c.id}`]}
          prompt="Touch the crystal"
          markerHeight={2}
          color={region.palette.accent}
        />
      ))}
      {CRYSTALS.map((c, i) => (
        <Crystal
          key={c.id}
          ref={(el) => {
            crystals.current[i] = el;
          }}
          color={region.palette.accent}
          position={[c.x, ground(c.x, c.z) + c.size * 1.9, c.z]}
          scale={[c.size * 0.7, c.size * 1.8, c.size * 0.7]}
        />
      ))}
      <GlowPoints ref={sparks} count={CRYSTALS.length * SPARKS_PER_CRYSTAL} size={0.35} />
      <points ref={sporeCloud} geometry={spores}>
        <SoftPointsMaterial color="#c9b5ff" size={0.18} opacity={0.7} additive />
      </points>
    </RegionSlot>
  );
}
