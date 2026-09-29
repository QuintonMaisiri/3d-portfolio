"use client";

import { testimonials } from "@/content/testimonials";
import { useCodex } from "@/lib/store";
import { Copy, SectionHeader, type SectionProps } from "../ui";

export function TestimonialsContent({ region, variant }: SectionProps) {
  const hoverQuote = useCodex((s) => s.hoverQuote);
  const journey = variant === "journey";
  return (
    <div>
      <SectionHeader region={region} />
      <ul className="space-y-6">
        {testimonials.map((t) => (
          <li
            key={t.id}
            data-beat
            // Hovering a quote brightens its crystal in the caves.
            onPointerEnter={journey ? () => hoverQuote(t.id) : undefined}
            onPointerLeave={journey ? () => hoverQuote(null) : undefined}
          >
            <figure className="relative border-l-2 border-accent pl-4">
              <span aria-hidden="true" className="absolute -top-3 right-0 font-display text-5xl leading-none text-accent/30">
                &ldquo;
              </span>
              <blockquote className="text-ink">
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
          </li>
        ))}
      </ul>
    </div>
  );
}
