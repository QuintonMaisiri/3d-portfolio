"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer, N8AO } from "@react-three/postprocessing";
import { lazy, Suspense, useEffect } from "react";
import { Mesh, MeshBasicMaterial, type Material } from "three";
import { Regions } from "@/components/regions";
import { selectJourneyPaused, useCodex } from "@/lib/store";
import { windTime } from "@/lib/wind";
import { Atmosphere } from "./Atmosphere";
import { CameraRig } from "./CameraRig";
import { Director } from "./Director";
import { ExploreDirector } from "./explore/ExploreDirector";
import { FollowCamera } from "./explore/FollowCamera";
import { InteractionSystem } from "./explore/Interaction";
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

/** Lit, opaque surfaces cast and receive shadows; glows, water, mist and hit areas don't. */
const castsShadow = (material: Material | Material[]) => {
  const m = Array.isArray(material) ? material[0] : material;
  return !!m && !(m instanceof MeshBasicMaterial) && !m.transparent && m.colorWrite !== false;
};

/**
 * Flags shadow casters and receivers once every region has mounted (it sits
 * after <Regions> so its effect runs after theirs). The terrain only receives.
 */
function ShadowSetup() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const lit = castsShadow(object.material);
      object.receiveShadow = lit;
      object.castShadow = lit && object.geometry.type !== "PlaneGeometry";
    });
  }, [scene]);
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
      {rich ? (
        <EffectComposer multisampling={0}>
          {/* Soft contact shadows where things meet the ground and each other. */}
          <N8AO halfRes quality="performance" aoRadius={2} distanceFalloff={1} intensity={2.2} />
          {/* A soft glow on the brightest things only: lava, fire, beacons, crystals, lanterns. */}
          <Bloom mipmapBlur luminanceThreshold={0.82} luminanceSmoothing={0.2} intensity={0.55} />
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
