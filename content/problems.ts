import type { ProblemCase } from "@/lib/types";
import { todo } from "./todo";

/**
 * One peak per case. Drafted from the CV (QMaisiri_Softaware_eng.pdf): only
 * what it states. Outcomes it doesn't give stay as TODOs; never invent them.
 */
export const problemCases: ProblemCase[] = [
  {
    id: "case-1",
    title: "One sign-in across two origins",
    problem:
      "A work-order platform (the Maintenance Dispatch System) with its Next.js front end and Django REST Framework back end deployed separately, on Vercel and Render, that still needed secure sign-in and different permissions for different people.",
    approach:
      "Cookie-based authentication with CSRF protection that holds across the separately deployed front end and back end, and a four-layer role-based permission model.",
    outcome: todo("case 1 outcome: what this made possible, or what went better because of it"),
  },
  {
    id: "case-2",
    title: "Payments you can trust",
    problem: "Zimbabwean clients needed EcoCash C2B and Paynow payments built into their NestJS back ends.",
    approach: "Transaction callbacks are handled on the server, and each payment's status is verified there.",
    outcome: todo("case 2 outcome: what this made possible, or what went better because of it"),
  },
  {
    id: "case-3",
    title: "Speeding up a legacy front end",
    problem: "Legacy components in existing Uncommon.org software were slowing the front end down.",
    approach: "Debugged and upgraded the software, refactored the legacy components, and optimised state management and rendering.",
    outcome: "System efficiency improved by 15%, and front-end load times came down significantly.",
  },
];
