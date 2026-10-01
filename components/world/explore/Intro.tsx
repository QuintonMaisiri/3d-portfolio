"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import { codexPages } from "@/content/codex";
import { intro } from "@/content/intro";
import { profile } from "@/content/profile";
import { useDiscoveries } from "@/lib/discoveries";
import { music } from "@/lib/music";
import { narrative } from "@/lib/narrative";
import { useCodex } from "@/lib/store";
import { SoundToggle } from "./MusicControl";

/** Give up waiting (a stalled model) after this long: the world is usable without it. */
const MAX_WAIT_MS = 20000;
/** The screen's fade into the world. */
const LEAVE_MS = 900;
/** Pages every visitor starts with; more means they've been here before. */
const ALWAYS_WRITTEN = codexPages.filter((p) => p.always).length;

/** Pages written on earlier visits (read straight from storage: this visit may already have written one on arrival). */
function earlierPages() {
  try {
    const saved = JSON.parse(localStorage.getItem("codex:discoveries") ?? "null") as { state?: { found?: string[] } } | null;
    return saved?.state?.found?.length ?? 0;
  } catch {
    return 0;
  }
}

/** Once begun, entering the world again in the same visit (from the page view) skips the welcome. */
let begunThisVisit = false;

/**
 * The welcome screen: covers the world while it loads, says what this is
 * and who it's from, and offers the two ways in: the adventure, or the
 * page view for visitors short on time. Sound can be turned off here before
 * anything plays. A native modal dialog, so the world behind is inert; the
 * world also ignores keys until it's dismissed (store.introOpen).
 */
export function Intro() {
  const { progress, active } = useProgress();
  const [shownAt] = useState(() => performance.now());
  const [gone, setGone] = useState(() => begunThisVisit);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const reduced = useCodex((s) => s.reducedMotion);
  const found = useDiscoveries((s) => s.found.length);
  const [returning] = useState(() => earlierPages() > ALWAYS_WRITTEN);
  // Only ever rendered on the client (the server renders the journey), so this can read the media query directly.
  const [touch] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  const ref = useRef<HTMLDialogElement>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gone) return;
    const dialog = ref.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      // Start reading at the top, not on the first button.
      card.current?.focus();
    }
    useCodex.getState().setIntroOpen(true);
    return () => useCodex.getState().setIntroOpen(false);
  }, [gone]);

  // The world is ready once its first frame has rendered and the first region's models are in.
  useEffect(() => {
    if (ready || gone) return;
    const timer = window.setInterval(() => {
      const loaded = narrative.worldReady && !active && progress >= 100;
      if (loaded || performance.now() - shownAt > MAX_WAIT_MS) setReady(true);
    }, 150);
    return () => window.clearInterval(timer);
  }, [ready, gone, active, progress, shownAt]);

  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(
      () => {
        ref.current?.close();
        setGone(true);
      },
      reduced ? 0 : LEAVE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [leaving, reduced]);

  if (gone) return null;

  const begin = () => {
    if (!ready || leaving) return;
    begunThisVisit = true;
    useCodex.getState().setIntroOpen(false);
    // This click is the gesture browsers need before sound can play.
    void music.start();
    setLeaving(true);
  };
  const readAsPage = () => {
    useCodex.getState().setIntroOpen(false);
    useCodex.getState().setViewMode("page", { persist: true });
  };
  const shown = Math.round(Math.min(99, progress));

  return (
    <dialog
      ref={ref}
      aria-labelledby="intro-title"
      onCancel={(e) => {
        // Escape goes in, once there's something to go into.
        e.preventDefault();
        begin();
      }}
      className={`m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 transition-opacity ease-out backdrop:bg-[#1d1714] motion-reduce:transition-none ${leaving ? "opacity-0" : "opacity-100"}`}
      style={{ transitionDuration: `${LEAVE_MS}ms` }}
    >
      <div className="codex-cover relative h-full overflow-y-auto">
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.6)_100%)]" />
        <div className="relative flex min-h-full items-center justify-center px-4 py-6 sm:py-8">
          <div
            ref={card}
            tabIndex={-1}
            className="theme-codex codex-paper w-full max-w-[38rem] rounded-xl px-6 py-8 text-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] ring-1 ring-black/30 focus:outline-none sm:px-11 sm:py-9 [@media(max-height:780px)]:sm:py-7"
          >
            <p className="text-xs font-semibold tracking-[0.25em] text-accent uppercase">{returning ? intro.eyebrowReturning : intro.eyebrow}</p>
            <h2 id="intro-title" className="mt-2.5 font-display text-4xl leading-tight sm:text-5xl [@media(max-height:780px)]:sm:text-[2.6rem]">
              {intro.heading}
            </h2>
            <p className="mt-1.5 text-muted">{profile.headline.replace(" | ", " · ")}</p>

            <div className="mt-5 space-y-3.5 leading-relaxed [@media(max-height:780px)]:sm:text-[0.95rem]">
              {intro.paragraphs.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </div>
            {returning ? (
              <p className="mt-4 text-sm text-muted italic">
                You&apos;ve written {found} of {codexPages.length} pages so far.
              </p>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={begin}
                aria-disabled={!ready}
                className="rounded-full bg-accent px-6 py-3 font-semibold text-on-accent shadow-md transition-colors hover:bg-[#6e230c] aria-disabled:cursor-progress aria-disabled:bg-[#8a2e12]/80"
              >
                {ready ? (returning ? intro.beginReturning : intro.begin) : `Preparing the world ${shown}%`}
              </button>
              <button
                type="button"
                onClick={readAsPage}
                className="rounded-full border border-[#8a2e12]/45 bg-field px-6 py-3 font-semibold text-ink transition-colors hover:border-accent"
              >
                {intro.shortcut}
              </button>
            </div>
            <p className="mt-3 text-sm text-muted">{intro.shortcutNote}</p>
            <p className="sr-only" role="status">
              {ready ? "The world is ready." : ""}
            </p>

            <div className="mt-6 flex flex-col gap-3 border-t border-line pt-4 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
              <p>
                {touch ? (
                  "Tap to walk, drag to look, tap a prompt to use things."
                ) : (
                  <>
                    <kbd className="font-sans font-semibold text-ink">WASD</kbd> to walk, drag to look, <kbd className="font-sans font-semibold text-ink">E</kbd> to use,{" "}
                    <kbd className="font-sans font-semibold text-ink">C</kbd> for the Codex.
                  </>
                )}
              </p>
              <div className="flex shrink-0 items-center gap-2.5">
                <span className="sm:hidden">{intro.sound}</span>
                <SoundToggle
                  shortcut={false}
                  className="flex items-center gap-2 rounded-full border border-line bg-field px-3.5 py-1.5 font-medium text-ink transition-colors hover:border-accent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}
