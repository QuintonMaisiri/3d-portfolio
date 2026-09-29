import { create } from "zustand";
import type { RegionId } from "./types";
import type { Quality } from "./webgl";

export type ViewMode = "journey" | "page";
export type WebGLStatus = "unknown" | "supported" | "unsupported";

export const VIEW_STORAGE_KEY = "codex:view";

interface CodexState {
  /** Scroll position as 0..1, updated on every scroll event. */
  rawProgress: number;
  /** rawProgress eased over time. Drives the world. Equals rawProgress under reduced motion. */
  smoothProgress: number;
  activeRegion: RegionId;
  viewMode: ViewMode;
  webgl: WebGLStatus;
  /** Render tier: "low" on mobile and low-power devices (lower resolution, no bloom). */
  quality: Quality;
  /** The world asked to render less (sustained low frame rate): lower resolution, no bloom. */
  degraded: boolean;
  reducedMotion: boolean;
  /** Project shown in the detail dialog. The journey is paused while set. */
  openProjectId: string | null;
  /** Project hovered or focused, in the panel list or as a tree. Links the two. */
  hoveredProjectId: string | null;
  /** Testimonial hovered or focused in the panel; its crystal brightens. */
  hoveredQuoteId: string | null;
  /** performance.now() when the contact form's raven was sent; the Campfire flies it. */
  ravenSentAt: number | null;

  setRawProgress: (p: number) => void;
  setSmoothProgress: (p: number) => void;
  setActiveRegion: (id: RegionId) => void;
  setViewMode: (mode: ViewMode, opts?: { persist?: boolean }) => void;
  setWebGL: (status: WebGLStatus) => void;
  setQuality: (quality: Quality) => void;
  degrade: () => void;
  setReducedMotion: (value: boolean) => void;
  openProject: (id: string | null) => void;
  hoverProject: (id: string | null) => void;
  hoverQuote: (id: string | null) => void;
  sendRaven: () => void;
}

export const useCodex = create<CodexState>()((set, get) => ({
  rawProgress: 0,
  smoothProgress: 0,
  activeRegion: "highlands",
  viewMode: "journey",
  webgl: "unknown",
  quality: "high",
  degraded: false,
  reducedMotion: false,
  openProjectId: null,
  hoveredProjectId: null,
  hoveredQuoteId: null,
  ravenSentAt: null,

  setRawProgress: (rawProgress) => set({ rawProgress }),
  setSmoothProgress: (smoothProgress) => set({ smoothProgress }),
  setActiveRegion: (activeRegion) => {
    if (get().activeRegion !== activeRegion) set({ activeRegion });
  },
  setViewMode: (viewMode, opts) => {
    if (get().webgl === "unsupported") viewMode = "page";
    if (opts?.persist) {
      try {
        localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
      } catch {
        // Storage can be unavailable (private mode); the choice just won't persist.
      }
    }
    set({ viewMode });
  },
  setWebGL: (webgl) => set(webgl === "unsupported" ? { webgl, viewMode: "page" } : { webgl }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setQuality: (quality) => set({ quality }),
  degrade: () => {
    if (!get().degraded) set({ degraded: true });
  },
  // Opening clears hover: the pointer may never "leave" a tree the dialog now covers.
  openProject: (openProjectId) => set({ openProjectId, hoveredProjectId: null }),
  hoverProject: (hoveredProjectId) => {
    if (get().hoveredProjectId !== hoveredProjectId) set({ hoveredProjectId });
  },
  sendRaven: () => set({ ravenSentAt: performance.now() }),
  hoverQuote: (hoveredQuoteId) => {
    if (get().hoveredQuoteId !== hoveredQuoteId) set({ hoveredQuoteId });
  },
}));

export const selectJourneyPaused = (s: CodexState) => s.openProjectId !== null;
