"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";
import { narrative } from "@/lib/narrative";

/** The cover stays at least this long, so it reads as a moment rather than a flash. */
const MIN_MS = 900;
/** Give up waiting (a stalled model) after this long: the world is usable without it. */
const MAX_MS = 20000;

/**
 * "Opening the Codex": covers the world while its first region's models
 * load and its first frame renders, with the load drawn as ink filling a
 * line. Shown once per visit; regions streamed in later load quietly.
 */
export function LoadingCover() {
  const { progress, active } = useProgress();
  const [shownAt] = useState(() => performance.now());
  const [ready, setReady] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (ready) return;
    const timer = window.setInterval(() => {
      const waited = performance.now() - shownAt;
      const loaded = narrative.worldReady && !active && progress >= 100;
      if ((loaded && waited > MIN_MS) || waited > MAX_MS) setReady(true);
    }, 150);
    return () => window.clearInterval(timer);
  }, [ready, active, progress, shownAt]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => setGone(true), 1100);
    return () => window.clearTimeout(timer);
  }, [ready]);

  if (gone) return null;
  const shown = Math.round(ready ? 100 : Math.min(99, progress));

  return (
    <div
      role="status"
      aria-live="polite"
      className={`codex-cover pointer-events-auto fixed inset-0 z-40 flex flex-col items-center justify-center gap-6 transition-opacity duration-1000 motion-reduce:transition-none ${ready ? "opacity-0" : "opacity-100"}`}
    >
      <p className="font-display text-3xl text-[#f3e7cf] drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] sm:text-4xl">The Adventurer&apos;s Codex</p>
      <div aria-hidden="true" className="h-[3px] w-56 overflow-hidden rounded-full bg-[#f3e7cf]/20">
        <div className="h-full rounded-full bg-[#e3b34a] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${shown}%` }} />
      </div>
      <p className="text-sm tracking-[0.2em] text-[#f3e7cf]/80 uppercase">{ready ? "The Codex is open" : `Opening the Codex ${shown}%`}</p>
    </div>
  );
}
