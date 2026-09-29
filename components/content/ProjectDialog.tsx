"use client";

import { useEffect, useRef } from "react";
import { projects } from "@/content/projects";
import { regionById } from "@/lib/regions";
import { useCodex } from "@/lib/store";
import { ProjectDetail } from "./ProjectDetail";
import { accentStyle } from "./ui";

const TITLE_ID = "project-dialog-title";

/**
 * Project detail panel. A native modal <dialog> gives us focus containment,
 * an inert background and Escape to close. The journey pauses while open.
 */
export function ProjectDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const openId = useCodex((s) => s.openProjectId);
  const openProject = useCodex((s) => s.openProject);
  const project = projects.find((p) => p.id === openId) ?? null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (project && !dialog.open) dialog.showModal();
    if (!project && dialog.open) dialog.close();
    document.documentElement.classList.toggle("scroll-locked", project !== null);
  }, [project]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={TITLE_ID}
      onClose={() => openProject(null)}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself, outside the panel) closes it.
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="theme-journey m-auto w-[min(40rem,calc(100vw-2rem))] rounded-2xl border border-line bg-[#101118] p-0 text-ink shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      style={accentStyle(regionById.forest.palette.accent)}
    >
      {project ? (
        <div className="max-h-[85vh] overflow-y-auto p-6 md:p-8">
          <ProjectDetail project={project} as="h2" titleId={TITLE_ID} />
          <form method="dialog" className="mt-8">
            <button
              type="submit"
              className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink hover:border-accent hover:text-accent"
            >
              Close
            </button>
          </form>
        </div>
      ) : null}
    </dialog>
  );
}
