import { profile } from "@/content/profile";

/**
 * The deployed site's origin. Set NEXT_PUBLIC_SITE_URL in the hosting
 * environment (e.g. https://your-domain.com); it drives canonical URLs,
 * Open Graph, robots.txt and the sitemap.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const SITE_NAME = "The Adventurer's Codex";
export const SITE_TITLE = `${profile.name} | ${profile.headline}`;
export const SITE_DESCRIPTION = `${profile.name} is a full stack software engineer in ${profile.location}, currently ${profile.role} at ${profile.organisation.name}, building with TypeScript, React, Next.js, NestJS and PostgreSQL.`;
