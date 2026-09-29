import type { Material } from "three";

/**
 * Shared time for vertex wind and water shimmer. Advanced by <WindClock> in
 * the canvas only when ambient motion is allowed, so under reduced motion
 * foliage and water hold still.
 */
export const windTime = { value: 0 };

type ShaderHooks = Pick<Material, "onBeforeCompile" | "customProgramCacheKey">;

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
