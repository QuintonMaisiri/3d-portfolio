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
    links: [{ label: "biodiveuae.org", href: "https://biodiveuae.org" }],
  },
  // From the CV (2026-10-01). Problems and results it doesn't give stay as TODOs.
  {
    id: "facilite",
    name: "Facilite",
    context: "Freelance",
    role: "Led development end to end",
    summary:
      "A Chilean financial education platform with a fast, SEO-optimised, mobile-first front end and a maintainable component architecture.",
    problem: todo("Facilite problem"),
    result: "Serves more than 1,000 users a month.",
    stack: ["Next.js", "Sanity CMS", "Tailwind CSS", "Vercel"],
    links: [],
  },
  {
    id: "mutai",
    name: "Mutai Employment Agency",
    context: "Freelance",
    role: "Developer",
    summary:
      "A WhatsApp automation system that collects and organises applicants' details and connects employers with candidates.",
    problem: todo("Mutai problem"),
    result: "Improved response times.",
    stack: ["NestJS", "Twilio API", "Railway"],
    links: [],
  },
  {
    id: "wardrobe-worth",
    name: "Wardrobe Worth",
    context: todo("where Wardrobe Worth was built: freelance, or your own product"),
    role: "Full-stack build",
    summary:
      "A real-time valuation platform that processes marketplace data and applies financial calculation logic to generate pricing insights by brand, condition and market demand.",
    problem: todo("Wardrobe Worth problem"),
    result: todo("Wardrobe Worth result"),
    stack: ["Next.js", "NestJS", "PostgreSQL", "Vercel"],
    links: [{ label: "wardrobe-worth.com", href: "https://wardrobe-worth.com" }],
  },
];
