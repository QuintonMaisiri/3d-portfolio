import type { RegionConfig, RegionId, Vec3 } from "./types";

export const REGION_COUNT = 8;

/** Scroll length of one region in journey view, in viewport heights. */
export const REGION_SCROLL_VH = 300;

/**
 * Share of each region's eighth spent reading (the camera drifts slowly with
 * the region's `shot`) before travel to the next region begins.
 */
export const DWELL_RATIO = 0.55;

/**
 * One colour per skill group, in content order: the Forge's orb clusters and
 * the legend dots in the Skills panel share these so text and world match.
 */
// Distinct hues (gold, flame, cooled steel, arcane violet, white-hot) so groups
// stay tellable apart under the Forge's orange light; all pass 3:1 on the dark panel.
export const SKILL_GROUP_COLORS = ["#ffd166", "#ff6b3d", "#7fd1e8", "#c9a0ff", "#f4f1de"] as const;

/** Distance between region centres along the path (world units, -z). */
export const REGION_SPACING = 45;

const span = 1 / REGION_COUNT;
const range = (i: number) => [i * span, (i + 1) * span] as const;

/**
 * Camera waypoint for a region. `side` shifts camera and target together so
 * the scenery sits beside the content panel rather than behind it: negative
 * puts the scene on the right (panel left), positive on the left (panel right).
 */
function frame(
  center: Vec3,
  { side = 0, back = 14, height = 4, look = 1.5 }: { side?: number; back?: number; height?: number; look?: number },
): RegionConfig["waypoint"] {
  return {
    position: [center[0] + side, center[1] + height, center[2] + back],
    target: [center[0] + side, center[1] + look, center[2]],
  };
}

const z = (i: number) => -i * REGION_SPACING;

// The path winds forward (-z): high moorland, down into the archive and forge,
// through the forest, up to the peaks, down to the flooded ruins, into the
// caves and out to the campfire. center[1] is the ground baseline there.
const centers: Record<RegionId, Vec3> = {
  highlands: [0, 3, z(0)],
  archive: [8, 0.5, z(1)],
  forge: [-6, 0, z(2)],
  forest: [6, 0, z(3)],
  peaks: [-4, 2, z(4)],
  ruins: [5, -1.6, z(5)],
  caves: [-6, 0.5, z(6)],
  campfire: [0, 0.5, z(7)],
};

export const regions: readonly RegionConfig[] = [
  {
    id: "highlands",
    index: 0,
    name: "The Misty Highlands",
    section: "Introduction",
    range: range(0),
    panel: "center",
    center: centers.highlands,
    shot: { dolly: 6, rise: 1 },
    waypoint: frame(centers.highlands, { back: 14, height: 4 }),
    palette: {
      sky: "#9fb3c2",
      fog: "#b8c6cf",
      fogDensity: 0.035,
      ground: "#5d6b5a",
      accent: "#e3c98e",
      keyLight: "#fff1dc",
      keyIntensity: 1.6,
      hemiSky: "#cfdbe4",
      hemiGround: "#4d5a4a",
    },
  },
  {
    id: "archive",
    index: 1,
    name: "The Ancient Archive",
    section: "About",
    range: range(1),
    panel: "left",
    center: centers.archive,
    shot: { dolly: 4, rise: -1.3, orbit: -0.14 },
    waypoint: frame(centers.archive, { side: -4.5, back: 13, height: 3.5, look: 2 }),
    glow: { color: "#ffc070", intensity: 14, offset: [0, 2.5, 5] },
    palette: {
      sky: "#2a2320",
      fog: "#3b302a",
      fogDensity: 0.03,
      ground: "#4a3a2e",
      accent: "#e0bd73",
      keyLight: "#ffd59a",
      keyIntensity: 1.2,
      hemiSky: "#6b5846",
      hemiGround: "#1f1914",
    },
  },
  {
    id: "forge",
    index: 2,
    name: "The Forge",
    section: "Skills",
    range: range(2),
    panel: "right",
    panelSize: "wide",
    center: centers.forge,
    shot: { orbit: 0.34, dolly: 2.5, rise: 0.5 },
    waypoint: frame(centers.forge, { side: 6.5, back: 13, height: 4 }),
    glow: { color: "#ff7a2f", intensity: 90, offset: [1, 1.4, 3] },
    palette: {
      sky: "#1c1414",
      fog: "#3a1d14",
      fogDensity: 0.028,
      ground: "#2b2522",
      accent: "#ff9150",
      keyLight: "#ff8a3d",
      keyIntensity: 1.8,
      hemiSky: "#5a2a1a",
      hemiGround: "#120c0a",
    },
  },
  {
    id: "forest",
    index: 3,
    name: "The Enchanted Forest",
    section: "Projects",
    range: range(3),
    panel: "left",
    center: centers.forest,
    shot: { dolly: 3 },
    waypoint: frame(centers.forest, { side: -4.5, back: 14, height: 3.5, look: 2.5 }),
    glow: { color: "#9fffe0", intensity: 12, offset: [0, 3, 0] },
    palette: {
      sky: "#1f3b33",
      fog: "#2d5245",
      fogDensity: 0.032,
      ground: "#28402f",
      accent: "#86e6cb",
      keyLight: "#d9ffe9",
      keyIntensity: 1.1,
      hemiSky: "#5f9c86",
      hemiGround: "#16261c",
    },
  },
  {
    id: "peaks",
    index: 4,
    name: "The Thundering Peaks",
    section: "Problem solving",
    range: range(4),
    panel: "right",
    center: centers.peaks,
    shot: { dolly: 3, rise: 1 },
    waypoint: frame(centers.peaks, { side: 5, back: 20, height: 8, look: 7 }),
    palette: {
      sky: "#3c4452",
      fog: "#5a6474",
      fogDensity: 0.022,
      ground: "#6d7079",
      accent: "#ece5a4",
      keyLight: "#e6ecff",
      keyIntensity: 1.4,
      hemiSky: "#8d97aa",
      hemiGround: "#2c2f36",
    },
  },
  {
    id: "ruins",
    index: 5,
    name: "The Sunken Ruins",
    section: "Experience",
    range: range(5),
    panel: "left",
    center: centers.ruins,
    shot: { dolly: 3 },
    waypoint: frame(centers.ruins, { side: -4.5, back: 14, height: 4 }),
    palette: {
      sky: "#20464f",
      fog: "#2f6570",
      fogDensity: 0.034,
      ground: "#4f6b62",
      accent: "#9edbd4",
      keyLight: "#c9f3ff",
      keyIntensity: 1.2,
      hemiSky: "#6fb3bb",
      hemiGround: "#16302f",
    },
  },
  {
    id: "caves",
    index: 6,
    name: "The Crystal Caves",
    section: "Testimonials",
    range: range(6),
    panel: "right",
    center: centers.caves,
    shot: { dolly: 3 },
    waypoint: frame(centers.caves, { side: 4.5, back: 12, height: 3, look: 2 }),
    glow: { color: "#b89cff", intensity: 45, offset: [-1, 2.5, -2] },
    palette: {
      sky: "#16122a",
      fog: "#251c45",
      fogDensity: 0.04,
      ground: "#2c2640",
      accent: "#c0a8ff",
      keyLight: "#b89cff",
      keyIntensity: 1.3,
      hemiSky: "#4b3c80",
      hemiGround: "#0d0a18",
    },
  },
  {
    id: "campfire",
    index: 7,
    name: "The Campfire",
    section: "Contact",
    range: range(7),
    panel: "left",
    center: centers.campfire,
    shot: { dolly: 3 },
    waypoint: frame(centers.campfire, { side: -4, back: 12, height: 3, look: 1.2 }),
    glow: { color: "#ff9a45", intensity: 60, offset: [0, 1.2, 0], flicker: true },
    palette: {
      sky: "#0b1022",
      fog: "#141a33",
      fogDensity: 0.022,
      ground: "#1f2430",
      accent: "#ffbd6e",
      keyLight: "#ffae5c",
      keyIntensity: 1.5,
      hemiSky: "#27305a",
      hemiGround: "#0a0c14",
    },
  },
];

export const regionById = Object.fromEntries(regions.map((r) => [r.id, r])) as Record<
  RegionId,
  RegionConfig
>;

export function isRegionId(value: string): value is RegionId {
  return value in regionById;
}

/**
 * The region the world is showing at this point: switches halfway through
 * each travel, where the camera visibly crosses over (and where reduced
 * motion snaps). Used for the header and region map.
 */
export function regionShownAt(progress: number): number {
  return Math.min(REGION_COUNT - 1, Math.max(0, Math.floor(progress * REGION_COUNT + (1 - DWELL_RATIO) / 2)));
}

/** Index of the region that owns this point on the timeline. */
export function regionIndexAt(progress: number): number {
  return Math.min(REGION_COUNT - 1, Math.max(0, Math.floor(progress * REGION_COUNT)));
}

export function getRegion(index: number): RegionConfig {
  const region = regions[Math.min(REGION_COUNT - 1, Math.max(0, index))];
  if (!region) throw new Error(`No region at index ${index}`);
  return region;
}
