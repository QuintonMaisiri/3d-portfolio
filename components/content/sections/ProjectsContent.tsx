"use client";

import { projects } from "@/content/projects";
import { useCodex } from "@/lib/store";
import { ProjectDetail } from "../ProjectDetail";
import { SectionHeader, type SectionProps } from "../ui";

/**
 * The journey list, grouped by where each project was built (in content
 * order). A group whose projects share one role names it once, in its heading.
 */
const groups = projects.reduce<{ context: string; role: string | null; projects: typeof projects }[]>((all, project) => {
  const group = all.find((g) => g.context === project.context);
  if (group) {
    group.projects.push(project);
    if (group.role !== project.role) group.role = null;
  } else all.push({ context: project.context, role: project.role, projects: [project] });
  return all;
}, []);
for (const group of groups) if (group.projects.length < 2) group.role = null;

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
        intro={<p>Pick a project here, or its tree in the forest, to read it.</p>}
      />
      {groups.map((group) => (
        <div key={group.context} className="mt-3 first:mt-0">
          <h3 className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
            {group.context}
            {group.role ? <span className="font-normal normal-case tracking-normal"> &middot; {group.role}</span> : null}
          </h3>
          <ul className="mt-1 divide-y divide-line">
            {group.projects.map((project) => (
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
                  className={`group -mx-3 flex w-[calc(100%+1.5rem)] items-center justify-between gap-3 rounded-lg px-3 py-2 text-left ${hovered === project.id ? "bg-field" : ""}`}
                >
                  <span className="flex flex-col items-start gap-0.5">
                    <span className={`font-semibold ${hovered === project.id ? "text-accent" : "text-ink"}`}>
                      {project.name}
                    </span>
                    {group.role ? null : <span className="text-sm text-muted">{project.role}</span>}
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
      ))}
    </div>
  );
}
