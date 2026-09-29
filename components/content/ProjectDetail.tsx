import type { Project } from "@/lib/types";
import { todo } from "@/content/todo";
import { Copy, TextLink } from "./ui";

interface Props {
  project: Project;
  /** h3 inside the page view's Projects section; h2 inside the dialog. */
  as?: "h2" | "h3";
  titleId?: string;
}

/** Full project write-up. Used inline in page view and inside the project dialog. */
export function ProjectDetail({ project, as: Heading = "h3", titleId }: Props) {
  return (
    <article aria-labelledby={titleId ?? `${project.id}-title`}>
      <Heading
        id={titleId ?? `${project.id}-title`}
        className="font-display text-2xl font-semibold text-ink"
      >
        {project.name}
      </Heading>
      <p className="mt-1 text-sm text-muted">
        {project.context} &middot; {project.role}
      </p>
      <p className="mt-3 text-ink">
        <Copy text={project.summary} />
      </p>
      <dl className="mt-4 space-y-3">
        <div>
          <dt className="text-sm font-semibold text-muted">Problem</dt>
          <dd className="text-ink">
            <Copy text={project.problem} />
          </dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-muted">Result</dt>
          <dd className="text-ink">
            <Copy text={project.result} />
          </dd>
        </div>
        <div>
          <dt className="text-sm font-semibold text-muted">Stack</dt>
          <dd className="text-ink">
            {project.stack.length ? project.stack.join(", ") : <Copy text={todo(`${project.name} stack`)} />}
          </dd>
        </div>
      </dl>
      <div className="mt-4">
        {project.links.length ? (
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {project.links.map((link) => (
              <li key={link.href}>
                <TextLink href={link.href}>{link.label}</TextLink>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            <Copy text={todo(`${project.name} links`)} />
          </p>
        )}
      </div>
    </article>
  );
}
