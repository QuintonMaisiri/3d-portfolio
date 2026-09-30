"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { colliderAt, colliderCount, collidersNear, updateColliders } from "@/lib/colliders";
import { useDiscoveries } from "@/lib/discoveries";
import { getInteractable, interaction } from "@/lib/interactables";
import { attachInput, input } from "@/lib/input";
import { narrative, updateExploreNarrative } from "@/lib/narrative";
import { journeyPositionAt, player, playerRegionIndex, spawnPoint } from "@/lib/player";
import { isRegionId, regions } from "@/lib/regions";
import { useCodex } from "@/lib/store";
import { journey } from "@/lib/timeline";
import { weather } from "@/lib/weather";

/** Colliders are rebuilt at most this often while models are still streaming in. */
const COLLIDER_REBUILD_SECONDS = 0.4;

/**
 * Explore mode's counterpart to the journey Director, mounted first in the
 * Canvas. Where the adventurer stands sets `journey.position`, so fog, light
 * and region streaming blend as they walk down the road exactly as scroll
 * did in v1. It also wires input, keeps colliders current and runs the
 * narrative (openings and each region's arrival beats).
 */
export function ExploreDirector() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const sinceRebuild = useRef(Infinity);

  // Enter the world at a deep-linked region (#forest), else wherever the visitor last was.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const store = useCodex.getState();
    const start = isRegionId(hash) ? hash : store.activeRegion;
    spawnPoint(start, player.position);
    player.teleported = true;
    journey.position = journeyPositionAt(player.position.z);
  }, []);

  useEffect(() => attachInput(gl.domElement), [gl]);

  // Compile every region's shaders up front, as the journey does.
  useEffect(() => {
    if (gl.extensions.has("KHR_parallel_shader_compile")) void gl.compileAsync(scene, camera);
    else gl.compile(scene, camera);
    if (process.env.NODE_ENV === "development")
      Object.assign(window, { __codex: { journey, camera, narrative, store: useCodex, weather, scene, player, input, colliderCount, collidersNear, colliderAt, getInteractable, interaction, discoveries: useDiscoveries } });
  }, [gl, scene, camera]);

  useFrame((_, delta) => {
    const { reducedMotion, setActiveRegion } = useCodex.getState();
    journey.position = journeyPositionAt(player.position.z);
    updateExploreNarrative(journey.position, delta, reducedMotion);
    const here = regions[playerRegionIndex(journey.position)]!.id;
    setActiveRegion(here);
    useDiscoveries.getState().visit(here);

    sinceRebuild.current += delta;
    if (sinceRebuild.current >= COLLIDER_REBUILD_SECONDS) {
      sinceRebuild.current = 0;
      updateColliders(scene);
    }
    narrative.worldReady = true;
  });

  return null;
}
