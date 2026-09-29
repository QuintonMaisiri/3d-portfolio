"use client";

import { projects } from "@/content/projects";
import { useCodex } from "@/lib/store";
import { ProjectDetail } from "../ProjectDetail";
import { SectionHeader, type SectionProps } from "../ui";

export function ProjectsContent({ region, variant }: SectionProps) {
  const openProject = useCodex((s) => s.openProject);
  const hoverProject = useCodex((s) => s.hoverProject);
  const hovered = useCodex((s) => s.hoveredProjectId);

  if (variant === "page") {
    return (
      <div>
        <SectionHeader region={region} />
        <div className="space-y-10">
          {projects.map((project) => (
            <ProjectDetail key={project.id} project={project} />
          ))}
        </div>
      </div>
    );
  }

  // Journey: a compact list. Each entry is the keyboard equivalent of a tree.
  return (
    <div>
      <SectionHeader
        region={region}
        intro={<p>Select a project, here or its tree in the forest, to read the full write-up.</p>}
      />
      <ul className="divide-y divide-line">
        {projects.map((project) => (
          <li key={project.id} data-beat>
            <button
              type="button"
              onClick={() => openProject(project.id)}
              // Hovering or focusing an entry lights its tree in the forest.
              onPointerEnter={() => hoverProject(project.id)}
              onPointerLeave={() => hoverProject(null)}
              onFocus={() => hoverProject(project.id)}
              onBlur={() => hoverProject(null)}
              aria-haspopup="dialog"
              className={`group -mx-3 flex w-[calc(100%+1.5rem)] items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left ${hovered === project.id ? "bg-field" : ""}`}
            >
              <span className="flex flex-col items-start gap-0.5">
                <span className={`font-semibold ${hovered === project.id ? "text-accent" : "text-ink"}`}>
                  {project.name}
                </span>
                <span className="text-sm text-muted">
                  {project.context} &middot; {project.role}
                </span>
              </span>
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                className={`h-4 w-4 shrink-0 ${hovered === project.id ? "text-accent" : "text-muted"}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M6 3.5l4.5 4.5L6 12.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
