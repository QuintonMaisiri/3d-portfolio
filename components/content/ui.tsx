import type { CSSProperties, ReactNode } from "react";
import { isTodo } from "@/content/todo";
import type { RegionConfig } from "@/lib/types";

export type Variant = "journey" | "page";

export interface SectionProps {
  region: RegionConfig;
  variant: Variant;
}

export const headingId = (region: RegionConfig) => `${region.id}-heading`;

/** Renders copy, flagging unfinished placeholder text. */
export function Copy({ text }: { text: string }) {
  return isTodo(text) ? <span className="todo">{text}</span> : <>{text}</>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{children}</p>
  );
}

/** Region name as eyebrow, section name as the h2. */
export function SectionHeader({ region, intro }: { region: RegionConfig; intro?: ReactNode }) {
  return (
    <header data-beat className="mb-6">
      <Eyebrow>{region.name}</Eyebrow>
      <h2 id={headingId(region)} className="mt-2 font-display text-3xl font-semibold text-ink md:text-4xl">
        {region.section}
      </h2>
      {intro ? <div className="mt-3 text-muted">{intro}</div> : null}
    </header>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("http");
  return (
    <a
      href={href}
      className="font-medium text-ink underline decoration-accent decoration-2 underline-offset-4 hover:text-accent"
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </a>
  );
}

/** Sets the region accent for everything inside (journey theme only). */
export const accentStyle = (accent: string) => ({ "--accent": accent }) as CSSProperties;
