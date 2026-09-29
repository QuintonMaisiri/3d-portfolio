"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { useCodex } from "@/lib/store";
import { narrative } from "@/lib/narrative";
import { createMasterTimeline, journey } from "@/lib/timeline";
import { weather } from "@/lib/weather";

/**
 * Scrubs the paused master timeline with the smoothed scroll value. Mounted
 * first inside the Canvas so every other frame callback sees this frame's state.
 */
export function Director() {
  const timeline = useMemo(() => createMasterTimeline(), []);

  useEffect(() => () => void timeline.kill(), [timeline]);

  // Compile every region's shaders up front (all regions are still visible
  // before the first frame), so none hitches the first time it comes into view.
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    // Async compile where the browser supports it; otherwise compile directly
    // (three warns if compileAsync is called without KHR_parallel_shader_compile).
    if (gl.extensions.has("KHR_parallel_shader_compile")) void gl.compileAsync(scene, camera);
    else gl.compile(scene, camera);
    // Dev-only handle for inspecting motion from the browser console / tests.
    if (process.env.NODE_ENV === "development") Object.assign(window, { __codex: { journey, camera, narrative, store: useCodex, weather, scene } });
  }, [gl, scene, camera]);

  useFrame(() => {
    const { smoothProgress, reducedMotion } = useCodex.getState();
    timeline.progress(smoothProgress);
    // Reduced motion: no travel. The world snaps to the nearest region instead.
    if (reducedMotion) journey.position = Math.round(journey.position);
    narrative.worldReady = true;
  });

  return null;
}
