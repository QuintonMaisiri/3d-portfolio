import type { CodexPage } from "@/content/codex";
import { milestones } from "@/content/experience";
import { problemCases } from "@/content/problems";
import { projects } from "@/content/projects";
import { skillGroups } from "@/content/skills";
import { testimonials } from "@/content/testimonials";
import { regionById } from "@/lib/regions";
import { ProjectDetail } from "@/components/content/ProjectDetail";
import { AboutContent } from "@/components/content/sections/AboutContent";
import { ContactContent } from "@/components/content/sections/ContactContent";
import { HeroContent } from "@/components/content/sections/HeroContent";
import { Copy, Eyebrow } from "@/components/content/ui";

export const pageTitleId = (page: CodexPage) => `codex-${page.id.replace(":", "-")}-title`;

/** A written page of the Codex: the same content the page view shows, one item at a time. */
export function CodexPageContent({ page }: { page: CodexPage }) {
  const region = regionById[page.region];
  const titleId = pageTitleId(page);
  const heading = (text: string) => (
    <>
      <Eyebrow>{region.name}</Eyebrow>
      <h2 id={titleId} tabIndex={-1} className="mt-2 font-display text-3xl font-semibold text-ink focus:outline-none">
        <Copy text={text} />
      </h2>
    </>
  );

  switch (page.kind) {
    case "hero":
      return <HeroContent region={region} variant="page" />;
    case "about":
      return <AboutContent region={region} variant="page" />;
    case "contact":
      return <ContactContent region={region} variant="page" />;
    case "project": {
      const project = projects[page.item]!;
      return (
        <div>
          <Eyebrow>{region.name}</Eyebrow>
          <div className="mt-2">
            <ProjectDetail project={project} as="h2" titleId={titleId} />
          </div>
        </div>
      );
    }
    case "skill": {
      const group = skillGroups[page.item]!;
      return (
        <article aria-labelledby={titleId}>
          {heading(group.name)}
          <p className="mt-3 text-ink">{group.summary}</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {group.skills.map((skill) => (
              <li key={skill} className="rounded-full border border-line bg-field px-3 py-1 text-sm text-ink">
                {skill}
              </li>
            ))}
          </ul>
          {group.detail ? (
            <p className="mt-4 text-sm text-muted">
              <Copy text={group.detail} />
            </p>
          ) : null}
        </article>
      );
    }
    case "problem": {
      const c = problemCases[page.item]!;
      return (
        <article aria-labelledby={titleId}>
          {heading(c.title)}
          <dl className="mt-4 space-y-3">
            {(
              [
                ["Problem", c.problem],
                ["Approach", c.approach],
                ["Outcome", c.outcome],
              ] as const
            ).map(([label, text]) => (
              <div key={label}>
                <dt className="text-sm font-semibold text-muted">{label}</dt>
                <dd className="text-ink">
                  <Copy text={text} />
                </dd>
              </div>
            ))}
          </dl>
        </article>
      );
    }
    case "milestone": {
      const m = milestones[page.item]!;
      return (
        <article aria-labelledby={titleId}>
          {heading(m.title)}
          <p className="mt-2 text-sm font-semibold text-accent">
            {m.dateTime ? <time dateTime={m.dateTime}>{m.period}</time> : <Copy text={m.period} />}
          </p>
          <p className="text-sm text-muted">{m.organisation}</p>
          {m.note ? <p className="mt-3 text-ink">{m.note}</p> : null}
        </article>
      );
    }
    case "quote": {
      const t = testimonials[page.item]!;
      return (
        <article aria-labelledby={titleId}>
          {heading(page.title)}
          <figure className="mt-4 border-l-2 border-accent pl-4">
            <blockquote className="text-lg text-ink">
              <p>
                <Copy text={t.quote} />
              </p>
            </blockquote>
            <figcaption className="mt-2 text-sm text-muted">
              <span className="font-semibold text-ink">
                <Copy text={t.author} />
              </span>
              <br />
              <Copy text={t.relation} />
            </figcaption>
          </figure>
        </article>
      );
    }
  }
}
