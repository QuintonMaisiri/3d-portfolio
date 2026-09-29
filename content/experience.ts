import type { Milestone } from "@/lib/types";

/** Oldest first, by start date. One tablet per milestone. */
export const milestones: Milestone[] = [
  {
    id: "uz",
    period: "Aug 2021 to Aug 2025",
    dateTime: "2021-08",
    title: "BSc Computer Science",
    organisation: "University of Zimbabwe",
  },
  {
    id: "freelance",
    period: "2022 to present",
    dateTime: "2022",
    title: "Freelance Software Developer",
    organisation: "Independent",
    note: "Full-stack builds for clients in Zimbabwe and internationally, including payment integrations and the BioDive UAE website.",
  },
  {
    id: "associate",
    period: "Sept 2023 to Aug 2025",
    dateTime: "2023-09",
    title: "Associate Developer",
    organisation: "Uncommon.org",
  },
  {
    id: "revixions",
    period: "May 2024 to Jan 2025",
    dateTime: "2024-05",
    title: "Frontend Developer (contract, part-time)",
    organisation: "Revixions",
    note: "Responsive web applications in React, Next.js and TypeScript for client projects.",
  },
  {
    id: "senior",
    period: "Aug 2025 to present",
    dateTime: "2025-08",
    title: "Senior Developer",
    organisation: "Uncommon.org",
    note: "Current role. Owner of UncommonOS, MentorMatch, PeopleCore, Uncommon Playground and Program Pulse.",
  },
];
