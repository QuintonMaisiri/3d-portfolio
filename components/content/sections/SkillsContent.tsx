import { skillGroups } from "@/content/skills";
import { SKILL_GROUP_COLORS } from "@/lib/regions";
import { Copy, SectionHeader, type SectionProps } from "../ui";

export function SkillsContent({ region, variant }: SectionProps) {
  const journey = variant === "journey";
  return (
    <div>
      <SectionHeader region={region} />
      <div className={journey ? "grid gap-x-10 gap-y-5 lg:grid-cols-2" : "space-y-6"}>
        {skillGroups.map((group, g) => (
          <section key={group.id} data-beat aria-labelledby={`skills-${group.id}`}>
            <h3 id={`skills-${group.id}`} className="flex items-center gap-2 font-semibold text-ink">
              {journey ? (
                // Legend: matches this group's orbs in the Forge.
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: SKILL_GROUP_COLORS[g % SKILL_GROUP_COLORS.length] }}
                />
              ) : null}
              {group.name}
            </h3>
            {journey ? null : <p className="mt-1 text-sm text-muted">{group.summary}</p>}
            <ul className={`flex flex-wrap ${journey ? "mt-2 gap-1.5" : "mt-3 gap-2"}`}>
              {group.skills.map((skill) => (
                <li
                  key={skill}
                  className={`rounded-full border border-line bg-field text-ink ${journey ? "px-2.5 py-0.5 text-[0.8125rem]" : "px-3 py-1 text-sm"}`}
                >
                  {skill}
                </li>
              ))}
            </ul>
            {group.detail ? (
              <p className="mt-2 text-sm text-muted">
                <Copy text={group.detail} />
              </p>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}
