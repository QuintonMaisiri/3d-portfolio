import { milestones } from "@/content/experience";
import { Copy, SectionHeader, type SectionProps } from "../ui";

export function ExperienceContent({ region }: SectionProps) {
  return (
    <div>
      <SectionHeader region={region} />
      <ol className="space-y-6 border-l border-line pl-6">
        {milestones.map((m) => (
          <li key={m.id} data-beat className="relative">
            <span
              aria-hidden="true"
              className="absolute top-1.5 -left-[1.9rem] h-3 w-3 rounded-full border-2 border-accent bg-surface"
            />
            <p className="text-sm font-semibold text-accent">
              {m.dateTime ? <time dateTime={m.dateTime}>{m.period}</time> : <Copy text={m.period} />}
            </p>
            <h3 className="flex flex-wrap items-center gap-2 font-semibold text-ink">
              {m.title}
              {m.period.endsWith("present") ? (
                <span className="rounded-full border border-accent px-2 py-px text-[0.7rem] font-semibold tracking-wide text-accent uppercase">
                  Now
                </span>
              ) : null}
            </h3>
            <p className="text-sm text-muted">{m.organisation}</p>
            {m.note ? <p className="mt-1 text-sm text-ink">{m.note}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
