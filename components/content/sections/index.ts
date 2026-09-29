import type { ComponentType } from "react";
import type { RegionId } from "@/lib/types";
import type { SectionProps } from "../ui";
import { AboutContent } from "./AboutContent";
import { ContactContent } from "./ContactContent";
import { ExperienceContent } from "./ExperienceContent";
import { HeroContent } from "./HeroContent";
import { ProblemsContent } from "./ProblemsContent";
import { ProjectsContent } from "./ProjectsContent";
import { SkillsContent } from "./SkillsContent";
import { TestimonialsContent } from "./TestimonialsContent";

/** The HTML content for each region. Shared by journey view and page view. */
export const sectionContent: Record<RegionId, ComponentType<SectionProps>> = {
  highlands: HeroContent,
  archive: AboutContent,
  forge: SkillsContent,
  forest: ProjectsContent,
  peaks: ProblemsContent,
  ruins: ExperienceContent,
  caves: TestimonialsContent,
  campfire: ContactContent,
};
