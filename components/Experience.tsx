"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { JourneyLayer } from "@/components/content/JourneyLayer";
import { PageView } from "@/components/content/PageView";
import { ProjectDialog } from "@/components/content/ProjectDialog";
import { Header } from "@/components/nav/Header";
import { RegionMap } from "@/components/nav/RegionMap";
import { ScrollDriver } from "@/components/ScrollDriver";
import { WorldLayer } from "@/components/world/WorldLayer";
import { useCodex, VIEW_STORAGE_KEY, type ViewMode } from "@/lib/store";
import { detectGpu } from "@/lib/webgl";

/**
 * Explicit choices win: ?view= in the URL, then a saved toggle. Otherwise the
 * journey, unless the device renders 3D in software, where "Read as a page"
 * is the default (the toggle still lets the visitor enter the world).
 */
function preferredView(weakGpu: boolean): ViewMode {
  const fromUrl = new URLSearchParams(window.location.search).get("view");
  if (fromUrl === "page" || fromUrl === "journey") return fromUrl;
  try {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "page" || stored === "journey") return stored;
  } catch {
    // No storage: fall through to the default.
  }
  return weakGpu ? "page" : "journey";
}

/**
 * The weak-GPU default applies in production. In development it's skipped
 * (headless test browsers render in software) unless ?gpu-check is present.
 */
const enforceGpuCheck = () =>
  process.env.NODE_ENV === "production" || new URLSearchParams(window.location.search).has("gpu-check");

export function Experience() {
  const viewMode = useCodex((s) => s.viewMode);
  const webgl = useCodex((s) => s.webgl);
  const previousView = useRef(viewMode);

  // One-time environment checks: WebGL, saved view preference, reduced motion.
  useEffect(() => {
    const store = useCodex.getState();
    const gpu = detectGpu();
    store.setQuality(gpu.quality);
    store.setWebGL(gpu.supported ? "supported" : "unsupported");
    if (gpu.supported) store.setViewMode(preferredView(gpu.weak && enforceGpuCheck()));

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => useCodex.getState().setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  // Keep the reader in the same region when switching views.
  useLayoutEffect(() => {
    if (previousView.current === viewMode) return;
    previousView.current = viewMode;
    const id = useCodex.getState().activeRegion;
    document.getElementById(id)?.scrollIntoView({ behavior: "instant", block: "start" });
  }, [viewMode]);

  return (
    <>
      <Header />
      <RegionMap />
      {viewMode === "journey" ? (
        <>
          <WorldLayer enabled={webgl === "supported"} />
          <JourneyLayer />
          <ScrollDriver />
        </>
      ) : (
        <PageView />
      )}
      <ProjectDialog />
    </>
  );
}
