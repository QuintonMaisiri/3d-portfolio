import type { Project } from "@/lib/types";
import { todo } from "./todo";

const uncommonProject = (id: string, name: string, overrides: Partial<Project> = {}): Project => ({
  id,
  name,
  context: "Uncommon.org",
  role: "Owner, end to end",
  summary: todo(`${name} one-line summary`),
  problem: todo(`${name} problem`),
  result: todo(`${name} result`),
  stack: [],
  links: [],
  ...overrides,
});

export const projects: Project[] = [
  uncommonProject("uncommon-os", "UncommonOS"),
  uncommonProject("mentormatch", "MentorMatch", {
    summary: "An internal platform that matches mentors to mentees, with capacity-aware allocation logic.",
  }),
  uncommonProject("peoplecore", "PeopleCore", {
    summary:
      "An HR platform for staff data across four user roles and seven feature areas, with role-based access control governing what each role can see and change. Taken from requirements specification through to tested builds.",
  }),
  uncommonProject("uncommon-playground", "Uncommon Playground", {
    summary:
      "An interactive learning platform with an in-browser code execution environment and lesson progression logic.",
  }),
  uncommonProject("program-pulse", "Program Pulse"),
  {
    id: "biodive-uae",
    name: "BioDive UAE",
    context: "Freelance",
    role: "Website build and ongoing support",
    summary: "A content-managed organisational website that I built and continue to support.",
    problem: todo("BioDive UAE problem"),
    result: todo("BioDive UAE result"),
    stack: ["Next.js", "Sanity CMS", "Vercel"],
    links: [],
  },
];
