"use client";

import { useEffect, useState } from "react";
import { player } from "@/lib/player";
import { regionById } from "@/lib/regions";
import { useCodex } from "@/lib/store";
import type { RegionId } from "@/lib/types";

/** How long a region's title card stays up on arrival, ms. */
const TITLE_MS = 2600;

/**
 * Explore mode's HTML layer: a landmark with a real heading (the world canvas
 * itself is decorative), the controls hint until the visitor first moves, and
 * a title card as each region is entered, announced to screen readers.
 */
export function ExploreHud() {
  const active = useCodex((s) => s.activeRegion);
  const [hint, setHint] = useState(true);
  // Only ever rendered on the client (the server renders the journey), so this can read the media query directly.
  const [touch] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  // The region whose title card has finished; any other region's card is showing.
  const [titleDone, setTitleDone] = useState<RegionId | null>(null);

  useEffect(() => {
    // The hint fades once they've moved (checked cheaply, not every frame).
    const timer = window.setInterval(() => {
      if (player.moved) {
        setHint(false);
        window.clearInterval(timer);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setTitleDone(active), TITLE_MS);
    return () => window.clearTimeout(timer);
  }, [active]);

  const region = regionById[active];
  const title = titleDone !== active;

  return (
    <main id="main" className="pointer-events-none fixed inset-0 z-20">
      <h1 className="sr-only">The Adventurer&apos;s Codex: {region.name}</h1>
      <p className="sr-only" aria-live="polite">
        You are in {region.name}. Use Read as a page for every section as a conventional portfolio.
      </p>

      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-[18vh] text-center transition-opacity duration-1000 motion-reduce:transition-none ${title ? "opacity-100" : "opacity-0"}`}
      >
        <p className="font-display text-4xl text-[#f3efe4] drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] sm:text-6xl">
          {region.name}
        </p>
        <p className="mt-2 text-sm tracking-[0.25em] text-[#f3efe4]/80 uppercase drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]">
          {region.section}
        </p>
      </div>

      <p
        className={`absolute inset-x-4 bottom-6 mx-auto w-fit rounded-full bg-[#121318]/85 px-5 py-2.5 text-center text-sm text-[#f3efe4] backdrop-blur-md transition-opacity duration-700 motion-reduce:transition-none ${hint ? "opacity-100" : "opacity-0"}`}
      >
        {touch ? (
          <>Tap to walk &middot; drag to look &middot; pinch to zoom</>
        ) : (
          <>
            <kbd className="font-sans font-semibold">WASD</kbd> or arrows to walk &middot; Shift to run &middot; drag to look &middot;
            click to walk there
          </>
        )}
      </p>
    </main>
  );
}
