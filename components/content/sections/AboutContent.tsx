import { about } from "@/content/about";
import { Copy, SectionHeader, type SectionProps } from "../ui";

export function AboutContent({ region, variant }: SectionProps) {
  const journey = variant === "journey";
  return (
    <div>
      <SectionHeader region={region} />
      <div className={`${journey ? "space-y-3" : "space-y-4"} text-ink`}>
        {about.paragraphs.map((p) => (
          <p key={p} data-beat>
            <Copy text={p} />
          </p>
        ))}
        <p data-beat>
          <Copy text={about.drive} />
        </p>
      </div>
      {journey ? (
        // Journey: two columns, label over value, so the panel fits a laptop screen.
        <dl data-beat className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 text-sm">
          {about.facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-xs font-semibold tracking-wide text-muted uppercase">{fact.label}</dt>
              <dd className="text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <dl data-beat className="mt-6 grid gap-x-6 gap-y-2 border-t border-line pt-5 text-sm sm:grid-cols-[auto_1fr]">
          {about.facts.map((fact) => (
            <div key={fact.label} className="contents">
              <dt className="font-semibold text-muted">{fact.label}</dt>
              <dd className="mb-2 text-ink sm:mb-0">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
