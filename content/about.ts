import type { About } from "@/lib/types";
import { todo } from "./todo";

export const about: About = {
  paragraphs: [
    "I'm a full stack software engineer and a Senior Developer at Uncommon.org, a nonprofit technology education company. I joined in September 2023 as an Associate Developer and became Senior Developer in August 2025.",
    "At Uncommon I own five products end to end: UncommonOS, MentorMatch, PeopleCore, Uncommon Playground and Program Pulse. I also work on the public sites that serve thousands of learners, and on the CI/CD pipelines that build and release our internal products.",
    "Since 2022 I've also freelanced, delivering full-stack builds for clients in Zimbabwe and internationally, from requirements through to deployment and handover.",
  ],
  // Shown after the paragraphs; in the world it's kept in the Archive's locked cabinet.
  drive: todo("what drives you, in one or two sentences"),
  facts: [
    { label: "Role", value: "Senior Developer, Uncommon.org" },
    { label: "Based in", value: "Harare, Zimbabwe" },
    { label: "Education", value: "BSc Computer Science, University of Zimbabwe (2021 to 2025)" },
    { label: "Also", value: "Freelance software development since 2022" },
  ],
};
