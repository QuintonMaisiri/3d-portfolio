"use client";

import { useEffect, useMemo } from "react";
import { BufferAttribute, Color, PlaneGeometry, type Material } from "three";
import { trailDistance } from "@/lib/cameraPath";
import { REGION_COUNT, REGION_SPACING, regions } from "@/lib/regions";
import { groundHeight, pathAt } from "@/lib/terrain";

/**
 * Breaks up the flat ground colour: large soft patches (lighter, darker, a
 * little drier) and a fine speckle, from world-space value noise. A worn
 * trail follows the road between regions (v1's camera route, which every
 * prop keeps clear of), leading the eye and the feet onward.
 */
const groundPatches: Pick<Material, "onBeforeCompile" | "customProgramCacheKey"> = {
  onBeforeCompile(shader) {
    shader.vertexShader = `attribute float aTrail;
varying vec3 vGroundPos;
varying float vTrail;
${shader.vertexShader}`.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      vGroundPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
      vTrail = aTrail;`,
    );
    shader.fragmentShader = `varying vec3 vGroundPos;
      varying float vTrail;
      float groundHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float groundNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(groundHash(i), groundHash(i + vec2(1.0, 0.0)), u.x),
                   mix(groundHash(i + vec2(0.0, 1.0)), groundHash(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      ${shader.fragmentShader}`.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      {
        vec2 g = vGroundPos.xz;
        float broad = groundNoise(g * 0.08) * 0.6 + groundNoise(g * 0.23) * 0.4;
        float fine = groundNoise(g * 1.7);
        diffuseColor.rgb *= 0.8 + 0.34 * broad + 0.08 * (fine - 0.5);
        // Drier, warmer patches here and there.
        float dry = smoothstep(0.62, 0.85, groundNoise(g * 0.05 + 17.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.12, 1.03, 0.82), dry * 0.6);
        // The trail: packed earth with a wandering edge, and a little grit.
        float edge = abs(vTrail) + (groundNoise(g * 0.9) - 0.5) * 0.7;
        float trail = 1.0 - smoothstep(0.8, 1.7, edge);
        vec3 earth = diffuseColor.rgb * vec3(1.05, 0.9, 0.7) * (0.92 + 0.16 * fine);
        diffuseColor.rgb = mix(diffuseColor.rgb, earth, trail * 0.75);
      }`,
    );
  },
  customProgramCacheKey: () => "ground-patches-trail",
};

/** Signed distance from each vertex to the road: linear across a face, so the trail stays crisp. */
function trailOffsets(position: BufferAttribute) {
  const out = new Float32Array(position.count);
  for (let v = 0; v < position.count; v++) out[v] = trailDistance(position.getX(v), position.getZ(v));
  return out;
}

const WIDTH = 200;
const Z_START = 45;
const Z_END = -(REGION_COUNT - 1) * REGION_SPACING - 70;
const SEGMENTS_X = 80;
const SEGMENTS_Z = 170;

/**
 * One continuous low-poly ground under every region, so there are no seams
 * between them. Vertex colours blend each region's ground colour along the path.
 */
export function Terrain() {
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(WIDTH, Z_START - Z_END, SEGMENTS_X, SEGMENTS_Z);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, (Z_START + Z_END) / 2);

    const position = g.getAttribute("position") as BufferAttribute;
    const colors = new Float32Array(position.count * 3);
    const grounds = regions.map((r) => new Color(r.palette.ground));
    const c = new Color();

    for (let v = 0; v < position.count; v++) {
      const x = position.getX(v);
      const z = position.getZ(v);
      position.setY(v, groundHeight(x, z));
      const { index, mix } = pathAt(z);
      c.lerpColors(grounds[index]!, grounds[Math.min(index + 1, REGION_COUNT - 1)]!, mix);
      c.multiplyScalar(0.88 + 0.12 * Math.sin(x * 1.3 + z * 0.7) * Math.sin(x * 0.4 - z * 1.1));
      c.toArray(colors, v * 3);
    }

    g.setAttribute("color", new BufferAttribute(colors, 3));
    g.setAttribute("aTrail", new BufferAttribute(trailOffsets(position), 1));
    g.computeVertexNormals();
    return g;
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshLambertMaterial vertexColors flatShading {...groundPatches} />
    </mesh>
  );
}
