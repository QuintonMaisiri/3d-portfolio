"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { codexPageById, codexPages, pagesIn } from "@/content/codex";
import { profile } from "@/content/profile";
import { Credits } from "@/components/content/Credits";
import { interaction } from "@/lib/interactables";
import { useDiscoveries } from "@/lib/discoveries";
import { regions } from "@/lib/regions";
import { useCodex } from "@/lib/store";
import { BookScene, type BookPhase, type PageRect } from "./BookScene";
import { CodexPageContent } from "./CodexPageContent";

const TITLE_ID = "codex-title";
/** How long a newly written page's ink takes to appear (matches .ink-in in globals.css). */
const INK_MS = 1600;
/** Below this width the book frames one page at a time. */
const NARROW_PX = 768;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The Adventurer's Codex: a thick leather journal (a real 3D book, BookScene)
 * the visitor carries. Every discovery in the world writes a page; unwritten
 * pages show a hint of where to look. It opens on its spine, lies flat face
 * up, and turns its pages; the contents (left page) and the chosen page
 * (right page) are real HTML laid exactly over the 3D pages while the book
 * lies flat. One page at a time on small screens. A native modal <dialog>,
 * so focus stays inside and Escape closes it; the world pauses behind it.
 */
export function Codex() {
  const ref = useRef<HTMLDialogElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const open = useCodex((s) => s.codexOpen);
  const pageId = useCodex((s) => s.codexPage);
  const found = useDiscoveries((s) => s.found);
  const unread = useDiscoveries((s) => s.unread);
  const visited = useDiscoveries((s) => s.visited);
  const [showing, setShowing] = useState<"contents" | "page">("page");
  const [phase, setPhase] = useState<BookPhase>("closed");
  const phaseRef = useRef<BookPhase>("closed");
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  const [rects, setRects] = useState<{ left: PageRect; right: PageRect } | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [instant] = useState(() => typeof window !== "undefined" && reducedMotion());
  // Page turns: the scene turns the sheet; the right page's text waits until it has passed.
  const [turnId, setTurnId] = useState(0);
  const [turning, setTurning] = useState(false);
  const [revealed, setRevealed] = useState(true);
  const afterClose = useRef<(() => void) | null>(null);

  const mapMode = pageId === "@map";
  const pane = mapMode ? "contents" : showing;
  const page = pageId && !mapMode ? codexPageById[pageId] : undefined;
  const written = page && found.includes(page.id) ? page : undefined;
  const fresh = written ? unread.includes(written.id) : false;
  const shownKey = written ? written.id : mapMode ? "@map" : "@intro";

  // Another page chosen while the book lies open: turn the page.
  const [lastKey, setLastKey] = useState(shownKey);
  if (shownKey !== lastKey) {
    setLastKey(shownKey);
    if (phase === "open" && !instant) {
      setTurnId((n) => n + 1);
      setTurning(true);
      setRevealed(false);
    }
  }
  // The new page's text appears once the old page has passed the spine (the HTML sits above the 3D view, so it must not overlap the leaf).
  const onTurn = useCallback((stage: "crossed" | "done") => {
    if (stage === "crossed") setRevealed(true);
    else setTurning(false);
  }, []);

  // Opening: show the book shut for a frame, then open it (the scene reports when it lies flat).
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    if (!dialog.open) dialog.showModal();
    if (phaseRef.current === "opening" || phaseRef.current === "open") return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setPhase("opening"));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [open]);

  // Frame one page or two, by the space the book has.
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setNarrow(el.clientWidth < NARROW_PX));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const onOpened = useCallback(() => setPhase((p) => (p === "opening" ? "open" : p)), []);
  const onClosed = useCallback(() => {
    ref.current?.close();
    setPhase("closed");
    setTurning(false);
    setRevealed(true);
    const next = afterClose.current;
    afterClose.current = null;
    next?.();
  }, []);

  /** Closes the book on its spine, then the dialog. */
  const shut = useCallback(
    (after?: () => void) => {
      const dialog = ref.current;
      if (!dialog?.open) return after?.();
      afterClose.current = after ?? null;
      if (instant || phaseRef.current === "closed") return onClosed();
      setPhase("closing");
    },
    [instant, onClosed],
  );

  // The store closed it (travel, raven): shut the book too.
  useEffect(() => {
    if (!open && ref.current?.open) shut();
  }, [open, shut]);

  // Land on the page just written (or chosen), and read it aloud to screen readers by moving focus there.
  useEffect(() => {
    if (!open || !written || phase !== "open") return;
    pageRef.current?.focus({ preventScroll: true });
    pageRef.current?.scrollTo({ top: 0 });
  }, [open, written, phase]);

  // The ink dries: after its reveal, a page is no longer new.
  useEffect(() => {
    if (!open || !written || !fresh || phase !== "open" || !revealed) return;
    const timer = window.setTimeout(() => useDiscoveries.getState().markRead(written.id), INK_MS);
    return () => window.clearTimeout(timer);
  }, [open, written, fresh, phase, revealed]);

  const show = (id: string) => {
    useCodex.setState({ codexPage: id });
    setShowing("page");
  };
  const onDialogClosed = () => {
    useCodex.getState().closeCodex();
    // The camera stops framing what was used.
    interaction.shot = null;
  };
  const travel = (id: (typeof regions)[number]["id"]) => shut(() => useCodex.getState().travelTo(id));

  const total = codexPages.length;
  const lying = phase === "open";
  const place = (r: PageRect | undefined) =>
    r ? { left: r.left, top: r.top, width: r.width, height: r.height } : { left: 0, top: 0, width: 0, height: 0 };
  // Narrow: one page at a time, both on the right-hand page.
  const leftRect = narrow ? rects?.right : rects?.left;

  const rightPage = (key: string): ReactNode => {
    const p = codexPageById[key];
    if (p && found.includes(p.id)) {
      const isFresh = unread.includes(p.id);
      return (
        <div key={p.id} className={isFresh && revealed ? "ink-in" : undefined}>
          {isFresh && revealed ? (
            <p className="sr-only" role="status">
              Page written: {p.title}
            </p>
          ) : null}
          <CodexPageContent page={p} />
        </div>
      );
    }
    if (key === "@map") {
      return (
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink">Where to?</h2>
          <p className="mt-3 text-ink">
            The waystones remember every region you have set foot in. Choose one in the contents and select Travel here.
          </p>
        </div>
      );
    }
    return (
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink">Every page is out there somewhere</h2>
        <p className="mt-3 text-ink">
          Walk the world and look closely: a light over something means it still holds a page. Use it and the page writes itself here.
        </p>
      </div>
    );
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={TITLE_ID}
      onClose={onDialogClosed}
      // Escape: let the book shut properly rather than vanish.
      onCancel={(e) => {
        e.preventDefault();
        shut();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-transparent p-0 backdrop:bg-black/65 backdrop:backdrop-blur-sm"
    >
      <div
        ref={frame}
        className="relative h-full w-full"
        onClick={(e) => {
          // A click on the table around the book closes it.
          if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "CANVAS") shut();
        }}
      >
        <div className="absolute inset-0" aria-hidden="true">
          <Canvas flat dpr={[1, 2]} gl={{ alpha: true, antialias: true }} camera={{ fov: 28, position: [0, 0, 6] }}>
            <Suspense fallback={null}>
              <BookScene
                phase={phase}
                turnId={turnId}
                narrow={narrow}
                instant={instant}
                title="The Adventurer's Codex"
                author={profile.name}
                onOpened={onOpened}
                onClosed={onClosed}
                onTurn={onTurn}
                onLayout={setRects}
              />
            </Suspense>
          </Canvas>
        </div>

        {/* The pages' text, laid over the 3D pages while the book lies flat. */}
        <div className={`theme-codex transition-opacity duration-300 motion-reduce:transition-none ${lying ? "opacity-100" : "pointer-events-none opacity-0"}`}>
          <nav
            aria-label="Codex contents"
            style={place(leftRect)}
            className={`absolute overflow-y-auto p-5 transition-opacity duration-300 sm:p-7 ${narrow && pane !== "contents" ? "hidden" : ""} ${turning && !narrow ? "opacity-25" : "opacity-100"}`}
          >
            <h2 id={TITLE_ID} className="font-display text-xl font-semibold text-ink">
              The Adventurer&apos;s Codex
            </h2>
            <p className="mt-1 text-sm text-muted">
              {found.length} of {total} pages written
            </p>

            {regions.map((region) => {
              const pages = pagesIn(region.id);
              const got = pages.filter((p) => found.includes(p.id)).length;
              const been = visited.includes(region.id);
              return (
                <section key={region.id} aria-labelledby={`codex-region-${region.id}`} className="mt-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 id={`codex-region-${region.id}`} className="font-display text-sm font-semibold tracking-wide text-ink uppercase">
                      {region.name}
                    </h3>
                    <span className="text-xs text-muted">
                      {got}/{pages.length}
                    </span>
                  </div>
                  <ul className="mt-1.5 space-y-0.5">
                    {pages
                      .filter((p) => found.includes(p.id))
                      .map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => show(p.id)}
                            aria-current={p.id === written?.id ? "page" : undefined}
                            className={`-mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-sm ${p.id === written?.id ? "bg-field font-semibold text-ink" : "text-ink hover:bg-field"}`}
                          >
                            <span className="truncate">{p.title}</span>
                            {unread.includes(p.id) ? (
                              <span className="shrink-0 rounded-full bg-accent px-1.5 text-[0.65rem] font-semibold text-on-accent uppercase">
                                New
                              </span>
                            ) : null}
                          </button>
                        </li>
                      ))}
                  </ul>
                  {got < pages.length ? (
                    <p className="py-1 text-sm text-muted italic">
                      <span className="not-italic" aria-hidden="true">
                        &#10022;{" "}
                      </span>
                      {pages.length - got} {pages.length - got === 1 ? "page" : "pages"} unwritten.{" "}
                      {pages.find((p) => !found.includes(p.id))?.hint}
                    </p>
                  ) : null}
                  {been ? (
                    <button type="button" onClick={() => travel(region.id)} className="mt-1 text-xs font-medium text-accent underline underline-offset-2">
                      Travel here
                    </button>
                  ) : null}
                </section>
              );
            })}

            <div className="mt-8 border-t border-line pt-4 text-sm">
              <button
                type="button"
                onClick={() => shut(() => useCodex.getState().setViewMode("page"))}
                className="font-medium text-accent underline underline-offset-2"
              >
                Read the whole Codex as a page
              </button>
            </div>
            <Credits />
          </nav>

          <div
            ref={pageRef}
            tabIndex={0}
            role="region"
            aria-label="Page"
            style={place(rects?.right)}
            className={`absolute overflow-y-auto p-6 transition-opacity duration-200 focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-accent sm:p-9 md:p-11 ${narrow && pane !== "page" ? "hidden" : ""} ${revealed ? "opacity-100" : "opacity-0"}`}
          >
            {narrow ? (
              <button type="button" onClick={() => setShowing("contents")} className="mb-5 text-sm font-medium text-accent underline underline-offset-2">
                Contents
              </button>
            ) : null}
            {rightPage(shownKey)}
          </div>

          {rects ? (
            <button
              type="button"
              onClick={() => shut()}
              aria-label="Close the Codex"
              style={{ left: rects.right.left + rects.right.width - 48, top: rects.right.top + 12 }}
              className="absolute z-10 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-lg text-ink hover:border-accent"
            >
              &times;
            </button>
          ) : null}
        </div>
      </div>
    </dialog>
  );
}
