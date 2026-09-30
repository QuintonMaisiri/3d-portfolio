"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, N8AO } from "@react-three/postprocessing";
import { lazy, Suspense, useEffect } from "react";
import { applyShadowFlags } from "@/lib/shadows";
import { shaderCompile } from "@/lib/streaming";
import { Regions } from "@/components/regions";
import { selectJourneyPaused, useCodex } from "@/lib/store";
import { windTime } from "@/lib/wind";
import { Atmosphere } from "./Atmosphere";
import { CameraRig } from "./CameraRig";
import { Director } from "./Director";
import { Grade } from "./Grade";
import { ExploreDirector } from "./explore/ExploreDirector";
import { FollowCamera } from "./explore/FollowCamera";
import { InteractionSystem } from "./explore/Interaction";
import { Waystones } from "./explore/Waystones";
import { Player, PlayerController } from "./explore/Player";
import { SkyDome } from "./SkyDome";
import { Terrain } from "./Terrain";

// Dev-only overlay; the import is dropped from production builds.
const Perf =
  process.env.NODE_ENV === "development"
    ? lazy(() => import("r3f-perf").then((m) => ({ default: m.Perf })))
    : null;

/** Device pixel ratio range per render tier. Never above 2. */
const DPR = {
  high: [1, 2],
  low: [1, 1.25],
  degraded: [0.75, 1],
} as const;

/** Advances the shared wind/water clock, only while ambient motion is allowed. */
function WindClock() {
  useFrame((_, delta) => {
    if (!useCodex.getState().reducedMotion) windTime.value += delta;
  });
  return null;
}

/**
 * Flags shadow casters and receivers once the first regions have mounted (it
 * sits after <Regions> so its effect runs after theirs). Regions streamed in
 * later flag their own (RegionSlot). The terrain only receives.
 */
function ShadowSetup() {
  const scene = useThree((s) => s.scene);
  useEffect(() => applyShadowFlags(scene), [scene]);
  return null;
}

/** Compiles newly streamed-in scenery's shaders a frame after it mounts, so it doesn't hitch when first seen. */
function StreamCompiler() {
  useFrame(({ gl, scene, camera }) => {
    if (!shaderCompile.requested) return;
    shaderCompile.requested = false;
    if (gl.extensions.has("KHR_parallel_shader_compile")) void gl.compileAsync(scene, camera);
    else gl.compile(scene, camera);
  });
  return null;
}

export default function WorldCanvas({ mode }: { mode: "explore" | "journey" }) {
  // The world stops rendering while the project dialog is open.
  const paused = useCodex(selectJourneyPaused);
  const quality = useCodex((s) => s.quality);
  const degraded = useCodex((s) => s.degraded);
  const storeDegrade = useCodex((s) => s.degrade);
  // Dev-only: ?no-degrade keeps full quality in slow (software-rendered) test browsers.
  const degrade =
    process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).has("no-degrade")
      ? () => {}
      : storeDegrade;
  const tier = degraded ? "degraded" : quality;
  const rich = tier === "high";

  return (
    <Canvas
      flat
      // "percentage" = PCFShadowMap (three r18x removed PCFSoftShadowMap; PCF is now the soft filter).
      shadows={rich ? "percentage" : false}
      dpr={[...DPR[tier]]}
      frameloop={paused ? "never" : "always"}
      gl={{ antialias: quality === "high", powerPreference: "high-performance" }}
      camera={{ fov: 50, near: 0.1, far: 400 }}
    >
      {/* Sustained low frame rate: drop resolution, shadows, AO and bloom for the rest of the visit. */}
      <PerformanceMonitor onDecline={degrade} onFallback={degrade} flipflops={3} />
      {/* The director must stay first: it sets the journey position the others read. */}
      {mode === "explore" ? (
        <>
          <ExploreDirector />
          <PlayerController />
          <InteractionSystem />
          <FollowCamera />
          <Suspense fallback={null}>
            <Player />
          </Suspense>
          <Waystones />
        </>
      ) : (
        <>
          <Director />
          <CameraRig />
        </>
      )}
      <Atmosphere />
      <WindClock />
      <SkyDome />
      <Terrain />
      <Regions />
      <ShadowSetup />
      <StreamCompiler />
      {rich ? (
        <EffectComposer multisampling={0}>
          {/* Soft contact shadows where things meet the ground and each other. */}
          <N8AO halfRes quality="performance" aoRadius={2} distanceFalloff={1} intensity={2.2} />
          {/* A soft glow on the brightest things only: lava, fire, beacons, crystals, lanterns. */}
          <Bloom mipmapBlur luminanceThreshold={0.82} luminanceSmoothing={0.2} intensity={0.55} />
          {/* Each region's colour temperature, and a soft vignette. */}
          <Grade />
        </EffectComposer>
      ) : null}
      {Perf ? (
        <Suspense fallback={null}>
          <Perf position="bottom-right" />
        </Suspense>
      ) : null}
    </Canvas>
  );
}
