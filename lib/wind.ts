import { Color, Vector3, type Material } from "three";

/**
 * Shared time for vertex wind and water shimmer. Advanced by <WindClock> in
 * the canvas only when ambient motion is allowed, so under reduced motion
 * foliage and water hold still.
 */
export const windTime = { value: 0 };

export type ShaderHooks = Pick<Material, "onBeforeCompile" | "customProgramCacheKey">;

/** The adventurer's feet, world space (far away when there's no adventurer). Grass bends away from it. */
export const playerPush = { value: new Vector3(0, -1e4, 0) };

/**
 * Wind sway plus grass parting round the adventurer: blades within about
 * 1.4 units lean away from their feet, most at the tip. The push is applied
 * after projection (in view space), so it's cheap and works per instance.
 */
export function grassSway(from: number, amount: number): ShaderHooks {
  const wind = windSway(from, amount);
  return {
    onBeforeCompile(shader, renderer) {
      wind.onBeforeCompile!(shader, renderer);
      shader.uniforms.uPlayer = playerPush;
      shader.vertexShader = `uniform vec3 uPlayer;
${shader.vertexShader}`.replace(
        "#include <project_vertex>",
        `#include <project_vertex>
        {
          #ifdef USE_INSTANCING
            vec3 grassRoot = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #else
            vec3 grassRoot = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #endif
          vec2 away = grassRoot.xz - uPlayer.xz;
          float near = 1.0 - smoothstep(0.35, 1.4, length(away));
          near *= step(abs(grassRoot.y - uPlayer.y), 2.0);
          float bend = near * max(position.y - ${from.toFixed(2)}, 0.0) * 1.6;
          vec3 push = vec3(normalize(away + 1e-4) * bend, 0.0).xzy;
          push.y = -bend * 0.45;
          mvPosition.xyz += (viewMatrix * vec4(push, 0.0)).xyz;
          gl_Position = projectionMatrix * mvPosition;
        }`,
      );
    },
    customProgramCacheKey: () => `grass-${from}-${amount}`,
  };
}

/**
 * A soft rim light on models: surfaces turned away from the camera catch a
 * little of the key light's colour, so silhouettes read against fog and
 * each other. Atmosphere keeps the colour in step with the region's light.
 */
export const rimColor = { value: new Color(0, 0, 0) };

export function withRim(hooks?: ShaderHooks): ShaderHooks {
  return {
    onBeforeCompile(shader, renderer) {
      hooks?.onBeforeCompile?.(shader, renderer);
      shader.uniforms.uRimColor = rimColor;
      shader.fragmentShader = `uniform vec3 uRimColor;
${shader.fragmentShader}`.replace(
        "#include <opaque_fragment>",
        `{
          float rimFacing = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
          outgoingLight += uRimColor * pow(rimFacing, 4.0);
        }
        #include <opaque_fragment>`,
      );
    },
    customProgramCacheKey: () => `rim-${hooks?.customProgramCacheKey?.() ?? ""}`,
  };
}

/**
 * Material hooks that sway a mesh in the wind. Vertices above `from` (in the
 * geometry's local y) bend by up to `amount` per unit of height, phased by
 * world position so neighbours don't move in lockstep. Works for instanced and
 * ordinary meshes. Build once at module level and spread onto the material.
 */
export function windSway(from: number, amount: number): ShaderHooks {
  return {
    onBeforeCompile(shader) {
      shader.uniforms.uWindTime = windTime;
      shader.vertexShader = `uniform float uWindTime;\n${shader.vertexShader}`.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        {
          float windH = max(position.y - ${from.toFixed(2)}, 0.0);
          #ifdef USE_INSTANCING
            vec3 windBase = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #else
            vec3 windBase = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
          #endif
          float windPhase = uWindTime * 1.4 + windBase.x * 0.35 + windBase.z * 0.27;
          transformed.x += sin(windPhase) * windH * ${amount.toFixed(3)};
          transformed.z += cos(windPhase * 0.8) * windH * ${(amount * 0.7).toFixed(3)};
        }`,
      );
    },
    customProgramCacheKey: () => `wind-${from}-${amount}`,
  };
}

/** Material hooks for gently shimmering water: slow interfering bands of light across the surface. */
export const waterShimmer: ShaderHooks = {
  onBeforeCompile(shader) {
    shader.uniforms.uWindTime = windTime;
    shader.vertexShader = `varying vec3 vWaterPos;\n${shader.vertexShader}`.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nvWaterPos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
    );
    shader.fragmentShader = `uniform float uWindTime;\nvarying vec3 vWaterPos;\n${shader.fragmentShader}`.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      diffuseColor.rgb *= 0.9 + 0.12 * sin(vWaterPos.x * 0.7 + uWindTime * 0.8) * sin(vWaterPos.z * 0.55 - uWindTime * 0.6);`,
    );
  },
  customProgramCacheKey: () => "water-shimmer",
};
