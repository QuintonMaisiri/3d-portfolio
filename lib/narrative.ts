import { narration } from "@/content/narration";
import { clamp01, smoothstep } from "./journey";
import { DWELL_RATIO, REGION_COUNT, regions } from "./regions";

/** Seconds for a panel to build in fully once the camera has arrived. */
const REVEAL_SECONDS = 1.6;
/** Scroll window (region-local) over which a panel builds in, if you scroll through it. */
const REVEAL_WINDOW = [-0.1, 0.22] as const;
/** Scroll window over which a panel fades as the camera departs. */
const LEAVE_WINDOW = [DWELL_RATIO - 0.02, DWELL_RATIO + 0.1] as const;
/** Beats overlap: each starts before the previous has finished. Must match globals.css. */
const BEAT_OVERLAP = 1.5;
/** Opening: the fog clears over INTRO_SECONDS; the hero builds in from HERO_DELAY. */
const INTRO_SECONDS = 2.8;
const HERO_DELAY = 0.6;
const HERO_SECONDS = 2.2;
/** Start the opening without the world if its first frame hasn't rendered by then. */
const MAX_WORLD_WAIT = 1.2;

export interface PanelState {
  /** 0..1 build-in. Beats inside the panel reveal in sequence as this rises. */
  reveal: number;
  /** 1 while present, falling to 0 as the camera leaves. */
  leave: number;
  /** Number of beats in the panel (set by the content layer on mount). */
  beats: number;
  /** Time-based build-in, so a panel always completes once you stop scrolling. */
  timeIn: number;
}

/**
 * How content and scene are choreographed. Updated once per frame by the
 * content layer, read by both the HTML panels and the 3D regions so text and
 * world beats stay in step.
 */
export const narrative = {
  panels: regions.map<PanelState>(() => ({ reveal: 0, leave: 1, beats: 0, timeIn: 0 })),
  caption: { text: "", opacity: 0 },
  /** Opening sequence, 0 (thick fog, first frame) to 1 (clear). The world reads this. */
  intro: 0,
  introTime: 0,
  /** Set by the world on its first rendered frame, so the opening plays where it can be seen. */
  worldReady: false,
  waited: 0,
};

/** Progress (0..1) of beat `i` of `n` for a given panel reveal. Mirrors the CSS in globals.css. */
export function beatProgress(reveal: number, i: number, n: number) {
  if (n <= 0) return reveal;
  return clamp01((reveal * (n + BEAT_OVERLAP) - i) / BEAT_OVERLAP);
}

const captionFor = regions.map((r) => narration[r.id] ?? "");

export function updateNarrative(progress: number, dt: number, reducedMotion: boolean) {
  const at = progress * REGION_COUNT;

  // Reduced motion: no builds, no captions, no opening. The current region's
  // panel is simply shown, switching where the world snaps (halfway through travel).
  if (reducedMotion) {
    narrative.intro = 1;
    narrative.introTime = INTRO_SECONDS;
    const current = Math.min(REGION_COUNT - 1, Math.floor(at + (1 - DWELL_RATIO) / 2));
    narrative.panels.forEach((panel, i) => {
      panel.reveal = panel.leave = i === current ? 1 : 0;
      panel.timeIn = panel.reveal;
    });
    narrative.caption.opacity = 0;
    return;
  }

  if (narrative.worldReady || narrative.waited >= MAX_WORLD_WAIT) narrative.introTime += dt;
  else narrative.waited += dt;
  narrative.intro = clamp01(narrative.introTime / INTRO_SECONDS);

  narrative.panels.forEach((panel, i) => {
    const local = at - i;
    if (i === 0) {
      // The hero emerges with the opening, once, whatever the scroll position.
      panel.timeIn = clamp01((narrative.introTime - HERO_DELAY) / HERO_SECONDS);
    } else {
      if (local < REVEAL_WINDOW[0] - 0.02) panel.timeIn = 0;
      else if (local >= -0.02) panel.timeIn = Math.min(1, panel.timeIn + dt / REVEAL_SECONDS);
    }
    panel.reveal = i === 0 ? panel.timeIn : Math.max(panel.timeIn, smoothstep(REVEAL_WINDOW[0], REVEAL_WINDOW[1], local));
    panel.leave = i === REGION_COUNT - 1 ? 1 : 1 - smoothstep(LEAVE_WINDOW[0], LEAVE_WINDOW[1], local);
  });

  // Narration: one line during travel away from a region, where there is one.
  const from = Math.min(REGION_COUNT - 1, Math.floor(at));
  const travel = (at - from - DWELL_RATIO) / (1 - DWELL_RATIO);
  const text = captionFor[from] ?? "";
  narrative.caption.text = text;
  narrative.caption.opacity = text && travel > 0 ? smoothstep(0.05, 0.25, travel) * (1 - smoothstep(0.55, 0.78, travel)) : 0;
}
