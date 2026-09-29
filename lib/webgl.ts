export type Quality = "high" | "low";

export interface GpuReport {
  /** A WebGL context can be created at all. */
  supported: boolean;
  /** Rendering is done in software or by a known-slow fallback renderer. */
  weak: boolean;
  /** Mobile, few cores, little memory or data-saver: use the lighter render. */
  quality: Quality;
  renderer: string;
}

const SOFTWARE_RENDERERS = /swiftshader|llvmpipe|softpipe|software|basic render|mesa offscreen/i;

/**
 * Probe the device once. The canvas is thrown away; the context is released.
 * `weak` means the 3D journey would not be pleasant (software rendering), so
 * the site defaults to "Read as a page" there.
 */
export function detectGpu(): GpuReport {
  let renderer = "";
  let supported = false;
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (gl) {
      supported = true;
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? "");
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    supported = false;
  }

  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const fewCores = (nav.hardwareConcurrency ?? 8) <= 4;
  const littleMemory = (nav.deviceMemory ?? 8) <= 4;
  const saveData = nav.connection?.saveData === true;

  return {
    supported,
    weak: supported && SOFTWARE_RENDERERS.test(renderer),
    quality: coarse || fewCores || littleMemory || saveData ? "low" : "high",
    renderer,
  };
}
