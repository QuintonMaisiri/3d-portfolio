// ---------- World ----------

export type RegionId =
  | "highlands"
  | "archive"
  | "forge"
  | "forest"
  | "peaks"
  | "ruins"
  | "caves"
  | "campfire";

export type Vec3 = readonly [number, number, number];

export interface RegionPalette {
  /** Scene background / sky. */
  sky: string;
  fog: string;
  /** FogExp2 density while dwelling in this region. */
  fogDensity: number;
  ground: string;
  /** Accent used for 3D highlights and the content panel eyebrow. Must pass AA on the dark panel. */
  accent: string;
  keyLight: string;
  keyIntensity: number;
  hemiSky: string;
  hemiGround: string;
}

export interface RegionConfig {
  id: RegionId;
  index: number;
  /** World name, e.g. "The Forge". */
  name: string;
  /** Portfolio section, used as the visible heading, e.g. "Skills". */
  section: string;
  /** Share of the master timeline this region owns, [start, end) in 0..1. */
  range: readonly [number, number];
  palette: RegionPalette;
  /** Scenery origin: x and z of the region's centre, y is the ground baseline there. */
  center: Vec3;
  /** Where the camera arrives. */
  waypoint: { position: Vec3; target: Vec3 };
  /**
   * The slow camera move while reading, applied from the waypoint over the
   * dwell: `dolly` toward the target, `rise` up (negative cranes down),
   * `orbit` around the target in radians.
   */
  shot?: { dolly?: number; rise?: number; orbit?: number };
  /** Local light source (fire, lava, crystals), relative to `center`. */
  glow?: { color: string; intensity: number; offset: Vec3; flicker?: boolean };
  /** Where the content panel sits over the scene in journey view. */
  panel: "left" | "center" | "right";
  /** Wide panels suit dense content such as the skill groups. */
  panelSize?: "normal" | "wide";
}

// ---------- Content ----------

export interface LinkItem {
  label: string;
  href: string;
}

export interface Profile {
  name: string;
  /** Professional headline shown above the name. */
  headline: string;
  /** Current job title. */
  role: string;
  organisation: { name: string; description: string };
  location: string;
  tagline: string;
  intro: string;
  links: { github: string; linkedin: string; email: string };
}

export interface About {
  paragraphs: string[];
  facts: { label: string; value: string }[];
}

export interface SkillGroup {
  id: string;
  name: string;
  summary: string;
  /** How deep this goes: where it is used. */
  detail?: string;
  skills: string[];
}

export interface Project {
  id: string;
  name: string;
  /** Where it was built, e.g. "Uncommon.org" or "Freelance". */
  context: string;
  role: string;
  summary: string;
  problem: string;
  result: string;
  stack: string[];
  links: LinkItem[];
}

export interface ProblemCase {
  id: string;
  title: string;
  problem: string;
  approach: string;
  outcome: string;
}

export interface Milestone {
  id: string;
  period: string;
  /** Machine-readable date for <time>, only when the date is known. */
  dateTime?: string;
  title: string;
  organisation: string;
  note?: string;
}

export interface Testimonial {
  id: string;
  quote: string;
  author: string;
  relation: string;
}

export interface ContactCopy {
  intro: string;
  formHeading: string;
  formNote: string;
}
