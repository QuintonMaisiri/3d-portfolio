import { create } from "zustand";
import type { RegionId } from "./types";
import type { Quality } from "./webgl";

/**
 * "explore": v2, walk the world as the adventurer (the default world view).
 * "journey": v1's scroll-driven film, kept reachable with ?view=journey while v2 is built.
 * "page": everything as a conventional one-page portfolio.
 */
export type ViewMode = "explore" | "journey" | "page";

export const isViewMode = (value: string | null): value is ViewMode =>
  value === "explore" || value === "journey" || value === "page";
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
  /** Explore mode: a region to fast-travel to, consumed by the Player. */
  travelRequest: RegionId | null;
  /** Explore mode: the prompt for the nearest usable thing ("Read the tablet"), if any. */
  prompt: { id: string; text: string } | null;
  /** Explore mode: the prompt's button (or a click on the thing) asked to use this. */
  interactRequest: string | null;
  /** The Codex journal is open (the world pauses behind it), at this page if set. */
  codexOpen: boolean;
  codexPage: string | null;
  /** Explore mode: the screen fades to black while the adventurer is moved (fast travel). */
  fading: boolean;
  /** Explore mode: the narration line shown during a travel scene, if any. */
  travelCaption: string | null;

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
  travelTo: (id: RegionId | null) => void;
  setPrompt: (prompt: { id: string; text: string } | null) => void;
  requestInteract: (id: string | null) => void;
  openCodex: (page?: string | null) => void;
  closeCodex: () => void;
  setFading: (fading: boolean) => void;
  setTravelCaption: (caption: string | null) => void;
}

export const useCodex = create<CodexState>()((set, get) => ({
  rawProgress: 0,
  smoothProgress: 0,
  activeRegion: "highlands",
  // The server renders the journey (every section's HTML, indexable); the client picks the real view on mount.
  viewMode: "journey",
  webgl: "unknown",
  quality: "high",
  degraded: false,
  reducedMotion: false,
  openProjectId: null,
  hoveredProjectId: null,
  hoveredQuoteId: null,
  ravenSentAt: null,
  travelRequest: null,
  prompt: null,
  interactRequest: null,
  codexOpen: false,
  codexPage: null,
  fading: false,
  travelCaption: null,

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
  travelTo: (travelRequest) => set({ travelRequest }),
  setPrompt: (prompt) => {
    const now = get().prompt;
    if (now?.id !== prompt?.id || now?.text !== prompt?.text) set({ prompt });
  },
  requestInteract: (interactRequest) => set({ interactRequest }),
  openCodex: (page = null) => set((s) => ({ codexOpen: true, codexPage: page ?? s.codexPage })),
  closeCodex: () => set({ codexOpen: false }),
  setFading: (fading) => {
    if (get().fading !== fading) set({ fading });
  },
  setTravelCaption: (travelCaption) => {
    if (get().travelCaption !== travelCaption) set({ travelCaption });
  },
  hoverQuote: (hoveredQuoteId) => {
    if (get().hoveredQuoteId !== hoveredQuoteId) set({ hoveredQuoteId });
  },
}));

/** The world stops rendering behind the project dialog and the Codex. */
export const selectJourneyPaused = (s: CodexState) => s.openProjectId !== null || s.codexOpen;
