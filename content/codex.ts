import { isTodo } from "./todo";
import { milestones } from "./experience";
import { problemCases } from "./problems";
import { profile } from "./profile";
import { projects } from "./projects";
import { skillGroups } from "./skills";
import { testimonials } from "./testimonials";
import type { RegionId } from "@/lib/types";

/**
 * The pages of the Adventurer's Codex: one per thing to discover in the
 * world. Each page shows existing content (from the other content files, so
 * nothing is written twice) once it has been found.
 */
export type CodexPageKind = "hero" | "about" | "skill" | "project" | "problem" | "milestone" | "quote" | "contact";

export interface CodexPage {
  /** Stable id, saved in the visitor's browser: don't rename lightly. */
  id: string;
  kind: CodexPageKind;
  region: RegionId;
  /** Index into that kind's content list (skill group, project, ...). */
  item: number;
  title: string;
  /** Shown while any of the region's pages are unwritten: where to look (one line per region). */
  hint: string;
  /** Scene beats this page lights when found (beat 0 is the region's header; see sceneBeat in lib/narrative). */
  beats: number[];
  /** Written from the start: who the author is and how to reach them are never hidden. */
  always?: boolean;
}

/** Placeholder titles read badly in a table of contents; fall back to a generic name. */
const titled = (text: string, fallback: string) => (isTodo(text) ? fallback : text);

export const codexPages: CodexPage[] = [
  {
    id: "hero",
    kind: "hero",
    region: "highlands",
    item: 0,
    title: profile.name,
    hint: "",
    beats: [],
    always: true,
  },
  {
    id: "about",
    kind: "about",
    region: "archive",
    item: 0,
    title: "About",
    hint: "Look to the scroll above the lectern.",
    // The scroll's ink: one beat per paragraph (1..4).
    beats: [1, 2, 3, 4],
  },
  ...skillGroups.map<CodexPage>((group, g) => ({
    id: `skill:${group.id}`,
    kind: "skill",
    region: "forge",
    item: g,
    title: group.name,
    hint: "Look to the pedestals.",
    beats: [g + 1],
  })),
  ...projects.map<CodexPage>((project, p) => ({
    id: `project:${project.id}`,
    kind: "project",
    region: "forest",
    item: p,
    title: project.name,
    hint: "Look to the lantern-hung trees.",
    beats: [p + 1],
  })),
  ...problemCases.map<CodexPage>((c, i) => ({
    id: `problem:${c.id}`,
    kind: "problem",
    region: "peaks",
    item: i,
    title: titled(c.title, `The climb, ${["first", "second", "third", "fourth", "fifth"][i] ?? `number ${i + 1}`} peak`),
    hint: "Look to the foot of each peak.",
    beats: [i + 1],
  })),
  ...milestones.map<CodexPage>((m, i) => ({
    id: `milestone:${m.id}`,
    kind: "milestone",
    region: "ruins",
    item: i,
    title: m.title,
    hint: "Look to the tablets under the water.",
    beats: [i + 1],
  })),
  ...testimonials.map<CodexPage>((t, i) => ({
    id: `quote:${t.id}`,
    kind: "quote",
    region: "caves",
    item: i,
    title: titled(t.author, `A voice in the crystal`),
    hint: "Look to the crystals.",
    beats: [i + 1],
  })),
  {
    id: "contact",
    kind: "contact",
    region: "campfire",
    item: 0,
    title: "Send a raven",
    hint: "",
    beats: [],
    always: true,
  },
];

export const codexPageById = Object.fromEntries(codexPages.map((p) => [p.id, p])) as Record<string, CodexPage>;

/** Pages found in a region, and how many it has. */
export const pagesIn = (region: RegionId) => codexPages.filter((p) => p.region === region);
