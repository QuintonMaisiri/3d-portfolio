import { problemCases } from "@/content/problems";
import { Copy, SectionHeader, type SectionProps } from "../ui";

const parts = [
  ["Problem", "problem"],
  ["Approach", "approach"],
  ["Outcome", "outcome"],
] as const;

export function ProblemsContent({ region }: SectionProps) {
  return (
    <div>
      <SectionHeader region={region} />
      <ol className="space-y-6">
        {problemCases.map((c, i) => (
          <li key={c.id} data-beat className="flex gap-4">
            {/* Summit marker: matches the numbered peak in the world. The <ol> already conveys order. */}
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent text-sm font-semibold text-accent"
            >
              {i + 1}
            </span>
            <article aria-labelledby={`${c.id}-title`} className="min-w-0">
              <h3 id={`${c.id}-title`} className="font-semibold text-ink">
                <Copy text={c.title} />
              </h3>
              <dl className="mt-2 space-y-1 text-sm">
                {parts.map(([label, key]) => (
                  <div key={key}>
                    <dt className="inline font-semibold text-muted">{label}: </dt>
                    <dd className="inline text-ink">
                      <Copy text={c[key]} />
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          </li>
        ))}
      </ol>
    </div>
  );
}
