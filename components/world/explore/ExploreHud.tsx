"use client";

import { useEffect, useState } from "react";
import { codexPages } from "@/content/codex";
import { useDiscoveries } from "@/lib/discoveries";
import { player } from "@/lib/player";
import { regionById } from "@/lib/regions";
import { useCodex } from "@/lib/store";
import type { RegionId } from "@/lib/types";

/** How long a region's title card stays up on arrival, ms. */
const TITLE_MS = 2600;

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

const pill = "pointer-events-auto rounded-full bg-[#121318]/85 text-[#f3efe4] backdrop-blur-md";

/**
 * Explore mode's HTML layer: a landmark with a real heading (the world canvas
 * itself is decorative), the controls hint until the visitor first moves, a
 * title card as each region is entered, the prompt for whatever is in reach,
 * and the Codex button. Everything here is reachable by keyboard.
 */
export function ExploreHud() {
  const active = useCodex((s) => s.activeRegion);
  const prompt = useCodex((s) => s.prompt);
  const codexOpen = useCodex((s) => s.codexOpen);
  const fading = useCodex((s) => s.fading);
  const caption = useCodex((s) => s.travelCaption);
  // Keep the last line on screen while it fades out.
  const [lastCaption, setLastCaption] = useState<string | null>(null);
  if (caption && caption !== lastCaption) setLastCaption(caption);
  const found = useDiscoveries((s) => s.found.length);
  const unread = useDiscoveries((s) => s.unread.length);
  const [hint, setHint] = useState(true);
  // Only ever rendered on the client (the server renders the journey), so this can read the media query directly.
  const [touch] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  // The region whose title card has finished; any other region's card is showing.
  const [titleDone, setTitleDone] = useState<RegionId | null>(null);

  // The visitor's Codex from earlier visits.
  useEffect(() => {
    void useDiscoveries.persist.rehydrate();
  }, []);

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

  // C opens the Codex (Escape closes it: it's a native dialog).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "KeyC" || e.repeat || typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const store = useCodex.getState();
      if (!store.codexOpen) store.openCodex();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const region = regionById[active];
  const title = titleDone !== active;

  return (
    <main id="main" className="pointer-events-none fixed inset-0 z-20">
      <h1 className="sr-only">The Adventurer&apos;s Codex: {region.name}</h1>
      <p className="sr-only" aria-live="polite">
        You are in {region.name}.{prompt ? ` Nearby: ${prompt.text}.` : ""}
      </p>

      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-[18vh] text-center transition-opacity duration-1000 motion-reduce:transition-none ${title ? "opacity-100" : "opacity-0"}`}
      >
        <p className="font-display text-4xl text-[#f3efe4] drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] sm:text-6xl">{region.name}</p>
        <p className="mt-2 text-sm tracking-[0.25em] text-[#f3efe4]/80 uppercase drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)]">
          {region.section}
        </p>
      </div>

      {/* Fast travel fades through black (the adventurer is moved while it's dark). */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-black transition-opacity duration-[450ms] ease-in-out ${fading ? "opacity-100" : "opacity-0"}`}
      />

      {/* Travel scene narration: decorative scene-setting, so hidden from assistive tech. */}
      <p
        aria-hidden="true"
        className={`caption absolute inset-x-0 bottom-[14vh] px-6 text-center font-display text-2xl text-[#f7f3ea] transition-opacity duration-1000 md:text-4xl ${caption ? "opacity-100" : "opacity-0"}`}
      >
        {lastCaption ?? ""}
      </p>

      {/* What's in reach. A real button, so taps and screen readers can use it too. */}
      {prompt && !codexOpen ? (
        <button
          type="button"
          onClick={() => useCodex.getState().requestInteract(prompt.id)}
          className={`${pill} absolute bottom-[22%] left-1/2 flex -translate-x-1/2 items-center gap-2.5 px-4 py-2.5 text-sm font-medium hover:bg-[#121318]`}
        >
          {touch ? null : (
            <kbd className="flex h-6 w-6 items-center justify-center rounded border border-[#f3efe4]/40 font-sans text-xs font-semibold">E</kbd>
          )}
          {prompt.text}
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => useCodex.getState().openCodex()}
        aria-label={`Open the Codex: ${found} of ${codexPages.length} pages written${unread ? `, ${unread} new` : ""}`}
        className={`${pill} absolute bottom-6 left-4 flex items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-[#121318] sm:left-8`}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 4.5c2.5-1 5-1 7 .5v11c-2-1.5-4.5-1.5-7-.5v-11ZM17 4.5c-2.5-1-5-1-7 .5v11c2-1.5 4.5-1.5 7-.5v-11Z" strokeLinejoin="round" />
        </svg>
        Codex
        <span className="text-[#cbc5b6]">
          {found}/{codexPages.length}
        </span>
        {unread ? <span className="rounded-full bg-[#e3b34a] px-1.5 text-[0.65rem] font-bold text-[#15120d]">{unread} new</span> : null}
        {touch ? null : <kbd className="ml-1 hidden font-sans text-xs text-[#cbc5b6] sm:inline">C</kbd>}
      </button>

      <p
        className={`absolute inset-x-4 bottom-20 mx-auto w-fit rounded-full bg-[#121318]/85 px-5 py-2.5 text-center text-sm text-[#f3efe4] backdrop-blur-md transition-opacity duration-700 motion-reduce:transition-none sm:bottom-6 ${hint ? "opacity-100" : "opacity-0"}`}
      >
        {touch ? (
          <>Tap to walk &middot; drag to look &middot; tap a light to use it</>
        ) : (
          <>
            <kbd className="font-sans font-semibold">WASD</kbd> or arrows to walk &middot; Shift to run &middot; drag to look &middot;{" "}
            <kbd className="font-sans font-semibold">E</kbd> to use
          </>
        )}
      </p>
    </main>
  );
}
