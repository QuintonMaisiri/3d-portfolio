"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { BackSide, Color, type Mesh } from "three";

/** Colours the sky dome shows; Atmosphere writes these every frame. */
export const skyColors = { horizon: new Color("#9fb3c2"), zenith: new Color("#6f8494") };

const RADIUS = 360;

/**
 * A gradient sky: the region's sky colour at the horizon, deepening toward
 * the zenith. Follows the camera so it never gets closer. Unfogged and drawn
 * first, behind everything.
 */
export function SkyDome() {
  const mesh = useRef<Mesh>(null);
  const uniforms = useMemo(() => ({ uHorizon: { value: skyColors.horizon }, uZenith: { value: skyColors.zenith } }), []);

  useFrame(({ camera }) => {
    mesh.current?.position.copy(camera.position);
  });

  return (
    <mesh ref={mesh} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[RADIUS, 24, 12]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        fog={false}
        uniforms={uniforms}
        vertexShader={`
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uHorizon;
          uniform vec3 uZenith;
          varying vec3 vDir;
          void main() {
            float t = smoothstep(-0.02, 0.65, vDir.y);
            gl_FragColor = vec4(mix(uHorizon, uZenith, t), 1.0);
            #include <colorspace_fragment>
          }
        `}
      />
    </mesh>
  );
}
