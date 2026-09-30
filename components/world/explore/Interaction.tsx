"use client";

import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Vector3, type PointsMaterial } from "three";
import { useSoftDot } from "@/components/regions/placeholders/common";
import { isFound, useDiscoveries } from "@/lib/discoveries";
import { input } from "@/lib/input";
import {
  getInteractable,
  interaction,
  nearestInteractable,
  registerInteractable,
  type InteractableDef,
  type InteractAction,
} from "@/lib/interactables";
import { player } from "@/lib/player";
import { useCodex } from "@/lib/store";
import type { RegionConfig, Vec3 } from "@/lib/types";

/** Seconds the adventurer's action plays before the thing is used. */
const ACTION_SECONDS: Record<InteractAction, number> = { pickup: 1, look: 0.45 };
/**
 * After a new discovery, the world reacts (a chest opens and its scroll
 * rises, orbs lift, a tablet surfaces) for this long before the Codex opens
 * over it. Matches the scene beats' build (REVEAL_SECONDS in lib/narrative).
 */
const REVEAL_SECONDS = 2;
/** A walk-to-use counts as arrived this far inside the thing's radius. */
const ARRIVE = 0.75;

function start(def: InteractableDef) {
  interaction.active = def;
  interaction.phase = "act";
  interaction.opening = null;
  interaction.remaining = useCodex.getState().reducedMotion ? 0 : ACTION_SECONDS[def.action];
  interaction.shot = def.position;
  interaction.pending = null;
  player.target = null;
  player.action = def.action === "pickup" ? "PickUp" : null;
  // No prompt while it's in use; it returns (with its new wording) once the reveal is over.
  useCodex.getState().setPrompt(null);
}

/**
 * Explore mode's interaction loop, after the player controller: finds the
 * nearest usable thing (for the prompt), handles E, the prompt button and
 * clicks from afar (walk there, then use), and runs the adventurer's action
 * before using it.
 */
export function InteractionSystem() {
  useFrame((_, delta) => {
    const store = useCodex.getState();
    const dt = Math.min(delta, 0.1);

    if (interaction.active) {
      interaction.remaining -= dt;
      if (interaction.remaining <= 0) {
        if (interaction.phase === "act") {
          // Write the pages; if any were new, let the world react before the book opens over it.
          const { open, fresh } = interaction.active.use();
          interaction.opening = open;
          interaction.phase = "reveal";
          interaction.remaining = fresh && !store.reducedMotion ? REVEAL_SECONDS : 0;
        } else {
          interaction.active = null;
          if (interaction.opening) store.openCodex(interaction.opening);
          else interaction.shot = null;
        }
      }
      input.interact = false;
      return;
    }

    if (store.interactRequest) {
      const def = getInteractable(store.interactRequest);
      store.requestInteract(null);
      if (def) {
        const d = Math.hypot(def.position.x - player.position.x, def.position.z - player.position.z);
        if (d <= def.radius) start(def);
        else {
          interaction.pending = def.id;
          player.target = def.position.clone();
          player.moved = true;
        }
      }
    }

    if (interaction.pending) {
      const def = getInteractable(interaction.pending);
      const d = def ? Math.hypot(def.position.x - player.position.x, def.position.z - player.position.z) : Infinity;
      if (def && d <= def.radius * ARRIVE) start(def);
      // Keys took over, or the walk was blocked and given up.
      else if (!player.target) interaction.pending = null;
    }

    const near = nearestInteractable(player.position, player.heading);
    interaction.focused = near;
    store.setPrompt(near ? { id: near.id, text: near.prompt } : null);
    if (input.interact && near) start(near);
    input.interact = false;
  });
  return null;
}

const MARKER_SIZE = 0.9;

/**
 * Something the adventurer can use: it shows a prompt when they're near,
 * responds to E, the prompt, or a click (walking over first), and writes its
 * Codex pages. While it still holds an undiscovered page a soft light pulses
 * above it. Explore mode only; renders nothing in the journey.
 */
export function Interactable({
  id,
  region,
  position,
  pages,
  prompt,
  action = "look",
  radius = 2.6,
  markerHeight = 1.8,
  color = "#fff1c4",
  onUse,
}: {
  id: string;
  region: RegionConfig;
  /** Region-local position of the thing's base. */
  position: Vec3;
  /** Codex pages written when it's used (the first is opened). */
  pages: readonly string[];
  prompt: string;
  action?: InteractAction;
  radius?: number;
  /** Height of the marker light above the base. */
  markerHeight?: number;
  color?: string;
  onUse?: () => void;
}) {
  const exploring = useCodex((s) => s.viewMode === "explore");
  const material = useRef<PointsMaterial>(null);
  const dot = useSoftDot();
  const base = useMemo(() => new Color(color), [color]);
  const geometry = useMemo(
    () => new BufferGeometry().setAttribute("position", new BufferAttribute(new Float32Array([0, 0, 0]), 3)),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  const [x, y, z] = position;
  const pageKey = pages.join("|");
  useEffect(() => {
    if (!exploring) return;
    const list = pageKey.split("|");
    return registerInteractable({
      id,
      position: new Vector3(region.center[0] + x, y + markerHeight * 0.5, region.center[2] + z),
      radius,
      prompt,
      action,
      use: () => {
        onUse?.();
        const fresh = useDiscoveries.getState().discover(list);
        return { open: list[0] ?? null, fresh: fresh.length > 0 };
      },
    });
  }, [exploring, id, region, x, y, z, radius, prompt, action, markerHeight, pageKey, onUse]);

  useFrame(({ clock }) => {
    const m = material.current;
    if (!m) return;
    const pending = pageKey.split("|").some((p) => !isFound(p));
    const focused = interaction.focused?.id === id;
    const pulse = 0.55 + 0.45 * Math.sin(clock.elapsedTime * 2.2 + x);
    m.opacity = pending ? (focused ? 1 : 0.35 + 0.35 * pulse) : focused ? 0.45 : 0;
    m.size = MARKER_SIZE * (focused ? 1.35 : 1);
    m.color.copy(base);
  });

  if (!exploring) return null;

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // This click is a use, not a walk to the ground behind the thing.
    input.tap = null;
    useCodex.getState().requestInteract(id);
  };

  return (
    <group position={[x, y, z]}>
      <points geometry={geometry} position={[0, markerHeight, 0]}>
        <pointsMaterial
          ref={material}
          map={dot}
          size={MARKER_SIZE}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
      {/* Hit area: invisible (no colour or depth writes) but clickable. */}
      <mesh
        position={[0, markerHeight * 0.5, 0]}
        onClick={onClick}
        onPointerOver={() => (document.body.style.cursor = "pointer")}
        onPointerOut={() => (document.body.style.cursor = "")}
      >
        <sphereGeometry args={[Math.max(0.9, markerHeight * 0.55), 10, 8]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} />
      </mesh>
    </group>
  );
}
