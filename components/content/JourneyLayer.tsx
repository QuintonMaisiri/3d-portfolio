"use client";

import { useEffect, useRef, type FocusEvent } from "react";
import { narrative, updateNarrative } from "@/lib/narrative";
import { REGION_COUNT, REGION_SCROLL_VH, regions } from "@/lib/regions";
import { useCodex } from "@/lib/store";
import type { RegionConfig } from "@/lib/types";
import { sectionContent } from "./sections";
import { accentStyle, headingId } from "./ui";

const align: Record<RegionConfig["panel"], string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

/**
 * Content over the world.
 *
 * Layout: each region is a section REGION_SCROLL_VH tall (the last one 100vh
 * taller), so section tops line up with the timeline's eighths and anchors
 * land at each region's start. With JS, every panel frame is fixed to the
 * viewport and panels never move; without JS they fall back to sticky.
 *
 * Choreography: panels never slide. They build in beat by beat as the camera
 * settles and fade as it leaves (lib/narrative.ts); one rAF writes the CSS
 * variables that globals.css turns into the reveal.
 */
export function JourneyLayer() {
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const caption = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // Number the beats in each panel once. Elements marked data-beat reveal in
    // order; a panel without any falls back to its top-level blocks.
    panels.current.forEach((panel, i) => {
      if (!panel) return;
      let beats = Array.from(panel.querySelectorAll<HTMLElement>("[data-beat]"));
      if (!beats.length) {
        beats = Array.from(panel.firstElementChild?.children ?? []) as HTMLElement[];
        beats.forEach((el) => el.setAttribute("data-beat", ""));
      }
      beats.forEach((el, k) => el.style.setProperty("--i", String(k)));
      panel.style.setProperty("--n", String(beats.length));
      // From here the narrative loop owns this panel (disables the CSS fallback).
      panel.setAttribute("data-live", "");
      narrative.panels[i]!.beats = beats.length;
    });

    const written = regions.map(() => ({ reveal: -1, leave: -1 }));
    let captionText = "";
    let captionOpacity = -1;
    let last = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const { smoothProgress, reducedMotion } = useCodex.getState();
      updateNarrative(smoothProgress, dt, reducedMotion);

      narrative.panels.forEach((state, i) => {
        const panel = panels.current[i];
        const w = written[i]!;
        if (!panel) return;
        const reveal = Math.round(state.reveal * 1000) / 1000;
        const leave = Math.round(state.leave * 1000) / 1000;
        if (reveal !== w.reveal) panel.style.setProperty("--reveal", String(reveal));
        if (reveal !== w.reveal || leave !== w.leave) {
          // The panel itself fades in with the first beat, so an empty box never shows.
          panel.style.opacity = String(Math.min(1, reveal * 2.5) * leave);
          // Faded panels don't catch clicks meant for the world or the next panel.
          panel.style.pointerEvents = reveal * leave > 0.5 ? "auto" : "none";
        }
        w.reveal = reveal;
        w.leave = leave;
      });

      const c = caption.current;
      if (c) {
        if (narrative.caption.text !== captionText) {
          captionText = narrative.caption.text;
          c.textContent = captionText;
        }
        const opacity = Math.round(narrative.caption.opacity * 1000) / 1000;
        if (opacity !== captionOpacity) {
          captionOpacity = opacity;
          c.style.opacity = String(opacity);
          c.style.setProperty("--caption", String(opacity));
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  // Tabbing into a panel that isn't on screen brings its region into view.
  const onFocus = (region: RegionConfig) => (e: FocusEvent<HTMLElement>) => {
    const state = narrative.panels[region.index]!;
    if (state.reveal * state.leave > 0.5) return;
    window.scrollTo({ top: e.currentTarget.offsetTop + window.innerHeight * 0.3, behavior: "instant" });
  };

  return (
    <main id="main" className="theme-journey pointer-events-none relative z-10">
      {regions.map((region) => {
        const Content = sectionContent[region.id];
        const last = region.index === REGION_COUNT - 1;
        return (
          <section
            key={region.id}
            id={region.id}
            aria-labelledby={headingId(region)}
            className="relative"
            style={{ height: `${REGION_SCROLL_VH + (last ? 100 : 0)}vh` }}
            onFocus={onFocus(region)}
          >
            <div
              className={`panel-frame sticky top-0 flex h-screen items-center py-18 pr-14 pl-4 sm:pr-20 sm:pl-8 md:pl-16 ${align[region.panel]}`}
            >
              <div
                ref={(el) => {
                  panels.current[region.index] = el;
                }}
                className={`reveal pointer-events-auto max-h-full w-full ${region.panelSize === "wide" ? "max-w-4xl" : "max-w-xl"} overflow-y-auto rounded-2xl border border-line bg-surface p-6 text-ink shadow-2xl backdrop-blur-md md:p-8`}
                style={accentStyle(region.palette.accent)}
                data-first={region.index === 0 ? "" : undefined}
              >
                <Content region={region} variant="journey" />
              </div>
            </div>
          </section>
        );
      })}
      {/* Narration subtitle. Decorative scene-setting, so hidden from assistive tech. */}
      <p
        ref={caption}
        aria-hidden="true"
        className="caption pointer-events-none fixed inset-x-0 bottom-[12vh] z-20 px-6 text-center font-display text-2xl text-[#f7f3ea] md:text-4xl"
        style={{ opacity: 0 }}
      />
    </main>
  );
}
