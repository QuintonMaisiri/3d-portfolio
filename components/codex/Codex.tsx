"use client";

import { useEffect, useRef, useState } from "react";
import { codexPageById, codexPages, pagesIn } from "@/content/codex";
import { Credits } from "@/components/content/Credits";
import { interaction } from "@/lib/interactables";
import { useDiscoveries } from "@/lib/discoveries";
import { regions } from "@/lib/regions";
import { useCodex } from "@/lib/store";
import { CodexPageContent } from "./CodexPageContent";

const TITLE_ID = "codex-title";
/** How long a newly written page's ink takes to appear (matches .ink-in in globals.css). */
const INK_MS = 1600;

/**
 * The Adventurer's Codex: the journal the visitor carries. Every discovery in
 * the world writes a page; unwritten pages show a hint of where to look.
 * Contents (with a map for fast travel) on the left, the open page on the
 * right; one at a time on small screens. A native modal <dialog>, so focus
 * stays inside and Escape closes it; the world pauses behind it.
 */
export function Codex() {
  const ref = useRef<HTMLDialogElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const open = useCodex((s) => s.codexOpen);
  const pageId = useCodex((s) => s.codexPage);
  const found = useDiscoveries((s) => s.found);
  const unread = useDiscoveries((s) => s.unread);
  const visited = useDiscoveries((s) => s.visited);
  // Small screens show contents or a page; wide screens show both.
  const [showing, setShowing] = useState<"contents" | "page">("page");

  // "@map" (from a waystone): open on the contents, where visited regions can be travelled to.
  const mapMode = pageId === "@map";
  const pane = mapMode ? "contents" : showing;
  const page = pageId && !mapMode ? codexPageById[pageId] : undefined;
  const written = page && found.includes(page.id) ? page : undefined;
  const fresh = written ? unread.includes(written.id) : false;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Land on the page just written (or chosen), and read it aloud to screen readers by moving focus there.
  useEffect(() => {
    if (!open || !written) return;
    pageRef.current?.focus({ preventScroll: true });
    pageRef.current?.scrollTo({ top: 0 });
  }, [open, written]);

  // The ink dries: after its reveal, a page is no longer new.
  useEffect(() => {
    if (!open || !written || !fresh) return;
    const timer = window.setTimeout(() => useDiscoveries.getState().markRead(written.id), INK_MS);
    return () => window.clearTimeout(timer);
  }, [open, written, fresh]);

  const show = (id: string) => {
    useCodex.setState({ codexPage: id });
    setShowing("page");
  };
  const close = () => {
    useCodex.getState().closeCodex();
    // The camera stops framing what was used.
    interaction.shot = null;
  };
  const travel = (id: (typeof regions)[number]["id"]) => {
    useCodex.getState().travelTo(id);
    ref.current?.close();
  };

  const total = codexPages.length;

  return (
    <dialog
      ref={ref}
      aria-labelledby={TITLE_ID}
      onClose={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="m-auto w-[min(64rem,calc(100vw-1.5rem))] overflow-visible bg-transparent p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="codex-cover rounded-2xl p-2.5 shadow-2xl sm:p-3.5">
        <div className="theme-codex codex-paper relative grid h-[min(44rem,calc(100dvh-3rem))] overflow-hidden rounded-xl md:grid-cols-[19rem_1fr]">
          <nav
            aria-label="Codex contents"
            className={`codex-contents overflow-y-auto border-line p-5 sm:p-6 md:block md:border-r ${pane === "contents" ? "block" : "hidden"}`}
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
                              <span className="shrink-0 rounded-full bg-accent px-1.5 text-[0.65rem] font-semibold text-on-accent uppercase">New</span>
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
                onClick={() => {
                  ref.current?.close();
                  useCodex.getState().setViewMode("page");
                }}
                className="font-medium text-accent underline underline-offset-2"
              >
                Read the whole Codex as a page
              </button>
            </div>
            <Credits />
          </nav>

          <div
            ref={pageRef}
            tabIndex={-1}
            className={`overflow-y-auto p-6 focus:outline-none sm:p-8 md:block md:p-10 ${pane === "page" ? "block" : "hidden"}`}
          >
            <button
              type="button"
              onClick={() => setShowing("contents")}
              className="mb-5 text-sm font-medium text-accent underline underline-offset-2 md:hidden"
            >
              Contents
            </button>
            {written ? (
              <div key={written.id} className={fresh ? "ink-in" : undefined}>
                {fresh ? <p className="sr-only" role="status">Page written: {written.title}</p> : null}
                <CodexPageContent page={written} />
              </div>
            ) : mapMode ? (
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">Where to?</h2>
                <p className="mt-3 text-ink">
                  The waystones remember every region you have set foot in. Choose one in the contents and select Travel here.
                </p>
              </div>
            ) : (
              <div>
                <h2 className="font-display text-2xl font-semibold text-ink">Every page is out there somewhere</h2>
                <p className="mt-3 text-ink">
                  Walk the world and look closely: a light over something means it still holds a page. Use it and the page writes
                  itself here.
                </p>
              </div>
            )}
          </div>

          <form method="dialog" className="absolute top-3 right-3">
            <button
              type="submit"
              aria-label="Close the Codex"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-lg text-ink hover:border-accent"
            >
              &times;
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}
