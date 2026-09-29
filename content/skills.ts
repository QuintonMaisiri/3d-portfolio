import type { SkillGroup } from "@/lib/types";

/** One cluster of orbs per group in the Forge. */
export const skillGroups: SkillGroup[] = [
  {
    id: "core",
    name: "Core stack",
    summary: "My main stack, front end to database.",
    detail:
      "Used to build and maintain uncommon.org, playground.uncommon.org and talent.uncommon.org, and across my freelance work.",
    skills: ["TypeScript", "React / Next.js", "NestJS", "PostgreSQL"],
  },
  {
    id: "languages",
    name: "More languages and frameworks",
    summary: "Also in regular use across projects.",
    detail:
      "Angular at Uncommon.org; Django REST Framework for the back end of a work-order platform.",
    skills: ["JavaScript", "Python", "C#", "Dart", "SQL", "Angular", "Django REST Framework", "Flutter", "Tailwind CSS"],
  },
  {
    id: "integrations",
    name: "Data and integrations",
    summary: "Databases, APIs and the third-party services products depend on.",
    detail:
      "EcoCash C2B and Paynow payments in NestJS back ends, with callbacks verified server-side; Sanity CMS for content-managed sites.",
    skills: [
      "REST API design",
      "MySQL",
      "MongoDB",
      "Supabase",
      "EcoCash C2B and Paynow",
      "Twilio",
      "Sanity CMS",
      "AI/LLM integration",
    ],
  },
  {
    id: "infra",
    name: "Infrastructure",
    summary: "The tooling that builds, ships and runs the products.",
    detail:
      "Automating build and release of Uncommon.org's internal products with GitHub Actions, Tekton, Argo CD and Kubernetes.",
    skills: ["GitHub Actions", "Tekton", "Argo CD", "Kubernetes", "Docker", "Vercel", "Render", "Railway", "Cloudflare R2"],
  },
  {
    id: "practice",
    name: "Ways of working",
    summary: "How I work with teams.",
    skills: ["Agile and Scrum", "Git-based code review", "Requirements specification", "Technical documentation"],
  },
];
