"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Color, Vector3, type DirectionalLight, type FogExp2, type HemisphereLight, type PointLight } from "three";
import { easeOutCubic, lerp } from "@/lib/journey";
import { narrative } from "@/lib/narrative";
import { REGION_COUNT, regions } from "@/lib/regions";
import { useCodex } from "@/lib/store";
import { journey } from "@/lib/timeline";
import { cameraLookAt } from "@/lib/cameraState";
import { skyColors } from "./SkyDome";
import { FLASH_DECAY, weather } from "@/lib/weather";

/** Hemisphere intensity is shared; each region tints it through its palette. */
const HEMI_INTENSITY = 2.2;
/** Directional intensities in the palette are artistic values; scale to three's physical units. */
const KEY_SCALE = 2;
/** Fog density multiplier on the very first frame; clears to 1 over the opening. */
const INTRO_FOG = 4;
/** Lightning: how far the sky shifts toward FLASH_SKY, and how much light is added, at full flash. */
const FLASH_SKY = new Color("#dfe7ff");
const FLASH_SKY_MIX = 0.35;
const FLASH_KEY = 4;
const FLASH_HEMI = 1.2;
/** Direction the sunlight comes from, and how far back the light sits from what the camera sees. */
const SUN_DIRECTION = new Vector3(30, 45, 20).normalize();
const SUN_DISTANCE = 60;
/** Half-size of the shadow box around the view, world units. */
const SHADOW_EXTENT = 34;
/** The zenith is the horizon colour deepened by this factor. */
const ZENITH = 0.62;

/**
 * Sky, fog and light for the whole world, blended between the current region
 * and the next as journey.position travels. While dwelling (whole-number
 * position) everything holds exactly at that region's palette.
 *
 * Two glow lights (current and next region) keep the light count constant, so
 * shaders never recompile as regions come and go.
 */
export function Atmosphere() {
  const background = useRef<Color>(null);
  const fog = useRef<FogExp2>(null);
  const hemi = useRef<HemisphereLight>(null);
  const key = useRef<DirectionalLight>(null);
  const glowA = useRef<PointLight>(null);
  const glowB = useRef<PointLight>(null);

  const p = useMemo(
    () =>
      regions.map((r) => ({
        sky: new Color(r.palette.sky),
        fog: new Color(r.palette.fog),
        density: r.palette.fogDensity,
        key: new Color(r.palette.keyLight),
        keyIntensity: r.palette.keyIntensity * KEY_SCALE,
        hemiSky: new Color(r.palette.hemiSky),
        hemiGround: new Color(r.palette.hemiGround),
        glowColor: new Color(r.glow?.color ?? "#000000"),
        glowIntensity: r.glow?.intensity ?? 0,
        glowFlicker: r.glow?.flicker ?? false,
        glowAt: [
          r.center[0] + (r.glow?.offset[0] ?? 0),
          r.center[1] + (r.glow?.offset[1] ?? 0),
          r.center[2] + (r.glow?.offset[2] ?? 0),
        ] as const,
      })),
    [],
  );

  useFrame(({ clock }, delta) => {
    weather.flash = Math.max(0, weather.flash - delta * FLASH_DECAY);
    const flash = weather.flash;
    const i = Math.min(Math.floor(journey.position), REGION_COUNT - 1);
    const j = Math.min(i + 1, REGION_COUNT - 1);
    const m = journey.position - i;
    const a = p[i]!;
    const b = p[j]!;

    background.current?.lerpColors(a.sky, b.sky, m).lerp(FLASH_SKY, flash * FLASH_SKY_MIX);
    if (background.current) {
      skyColors.horizon.copy(background.current);
      skyColors.zenith.copy(background.current).multiplyScalar(ZENITH);
    }
    if (fog.current) {
      fog.current.color.lerpColors(a.fog, b.fog, m);
      fog.current.density = lerp(a.density, b.density, m) * lerp(INTRO_FOG, 1, easeOutCubic(narrative.intro));
    }
    if (hemi.current) {
      hemi.current.color.lerpColors(a.hemiSky, b.hemiSky, m);
      hemi.current.groundColor.lerpColors(a.hemiGround, b.hemiGround, m);
      hemi.current.intensity = HEMI_INTENSITY + flash * FLASH_HEMI;
    }
    if (key.current) {
      // The sun follows the view so its shadow box always covers what's on screen.
      key.current.position.copy(cameraLookAt).addScaledVector(SUN_DIRECTION, SUN_DISTANCE);
      key.current.target.position.copy(cameraLookAt);
      key.current.target.updateMatrixWorld();
      key.current.color.lerpColors(a.key, b.key, m);
      key.current.intensity = lerp(a.keyIntensity, b.keyIntensity, m) + flash * FLASH_KEY;
    }

    const t = clock.elapsedTime;
    const ambient = !useCodex.getState().reducedMotion;
    const flicker = (on: boolean) =>
      on && ambient ? 0.85 + 0.1 * Math.sin(t * 9.1) + 0.05 * Math.sin(t * 23.7) : 1;
    for (const [light, glow, weight] of [
      [glowA.current, a, 1 - m],
      [glowB.current, b, j === i ? 0 : m],
    ] as const) {
      if (!light) continue;
      light.position.set(...glow.glowAt);
      light.color.copy(glow.glowColor);
      light.intensity = glow.glowIntensity * weight * flicker(glow.glowFlicker);
    }
  });

  const first = regions[0]!.palette;
  return (
    <>
      <color ref={background} attach="background" args={[first.sky]} />
      <fogExp2 ref={fog} attach="fog" args={[first.fog, first.fogDensity]} />
      <hemisphereLight ref={hemi} args={[first.hemiSky, first.hemiGround, HEMI_INTENSITY]} />
      <directionalLight
        ref={key}
        position={[30, 45, 20]}
        intensity={first.keyIntensity * KEY_SCALE}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
        shadow-camera-near={1}
        shadow-camera-far={140}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
      />
      <pointLight ref={glowA} intensity={0} distance={40} decay={2} />
      <pointLight ref={glowB} intensity={0} distance={40} decay={2} />
    </>
  );
}
