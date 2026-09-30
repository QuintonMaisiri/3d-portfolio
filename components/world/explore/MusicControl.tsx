"use client";

import { useEffect } from "react";
import { music, useMusic } from "@/lib/music";
import { useCodex } from "@/lib/store";

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/** Data-saver connections don't start a 6 MB track on their own (the button still can). */
const saveData = () => (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

/**
 * The soundtrack's wiring and its button. Music starts on the visitor's
 * first interaction in the world, M toggles it, it ducks under the Codex,
 * pauses while the tab is hidden, and stops when the world is left.
 */
export function MusicControl({ className }: { className: string }) {
  const enabled = useMusic((s) => s.enabled);
  const playing = useMusic((s) => s.playing);
  const codexOpen = useCodex((s) => s.codexOpen);

  useEffect(() => {
    music.init();
    const first = () => {
      if (!saveData()) void music.start();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyM" && !e.repeat && !typing(e.target) && !e.metaKey && !e.ctrlKey && !e.altKey) {
        useMusic.getState().toggle();
        return;
      }
      if (!useMusic.getState().playing) first();
    };
    const onPointer = () => {
      if (!useMusic.getState().playing) first();
    };
    const onVisibility = () => {
      if (document.hidden) music.pause();
      else if (useMusic.getState().enabled) void music.start();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      music.stop();
    };
  }, []);

  useEffect(() => music.duck(codexOpen), [codexOpen]);

  return (
    <button
      type="button"
      onClick={() => useMusic.getState().toggle()}
      aria-pressed={enabled}
      aria-label={enabled ? "Music on (M to mute)" : "Music off (M to play)"}
      title={enabled ? "Mute music (M)" : "Play music (M)"}
      className={className}
    >
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 8h3l4-3.5v11L6 12H3V8Z" strokeLinejoin="round" />
        {enabled ? (
          <path d={playing ? "M13 7.5a3.5 3.5 0 0 1 0 5M15.5 5a7 7 0 0 1 0 10" : "M13 7.5a3.5 3.5 0 0 1 0 5"} strokeLinecap="round" />
        ) : (
          <path d="M13.5 7.5l4 5M17.5 7.5l-4 5" strokeLinecap="round" />
        )}
      </svg>
    </button>
  );
}
