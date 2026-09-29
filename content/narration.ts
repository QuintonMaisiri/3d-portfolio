import type { RegionId } from "@/lib/types";

/**
 * Narration: a single subtitle line shown while travelling away from a
 * region. Use it only where a line carries the story; most transitions
 * should stay silent. Scene-setting only: no claims about work or results.
 */
export const narration: Partial<Record<RegionId, string>> = {
  highlands: "Every build starts with a story.",
  archive: "Then comes the craft.",
  forest: "Some problems you have to climb.",
  caves: "The road ends where yours begins.",
};
