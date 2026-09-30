/**
 * Every built model (see scripts/build-models.mjs), by what it is. Quaternius
 * packs (CC0): Stylized Nature, Fantasy Props, Medieval Village, Ultimate
 * Modular Ruins, Updated Modular Dungeon, Survival. KayKit Resource Bits (CC0).
 * Creatures from Sketchfab (CC-BY-4.0, credited in content/credits.ts).
 */
const m = (path: string) => `/models/${path}.glb`;

export const MODELS = {
  rocks: [1, 2, 3].map((n) => m(`forest/rock-${n}`)),
  pebbles: [1, 2, 3].map((n) => m(`nature/pebble-${n}`)),
  pathStones: [1, 2, 3].map((n) => m(`nature/path-stone-${n}`)),
  pathSlab: m("nature/path-slab"),
  deadTrees: [1, 2, 3].map((n) => m(`nature/dead-tree-${n}`)),
  flowers: [m("nature/flowers-1"), m("nature/flowers-2")],
  pines: [1, 2, 3, 4, 5].map((n) => m(`forest/pine-${n}`)),
  mushrooms: [m("forest/mushroom"), m("forest/mushroom-shelf")],
  bush: m("forest/bush"),
  fern: m("forest/fern"),
  props: {
    anvilLog: m("props/anvil-log"),
    workbench: m("props/workbench"),
    weaponStand: m("props/weapon-stand"),
    whetstone: m("props/whetstone"),
    barrel: m("props/barrel"),
    crateMetal: m("props/crate-metal"),
    crateWooden: m("props/crate-wooden"),
    chainCoil: m("props/chain-coil"),
    bookcase: m("props/bookcase-2"),
    bookStacks: [m("props/book-stack-1"), m("props/book-stack-2")],
    bookStand: m("props/book-stand"),
    candle: m("props/candle-2"),
    candleStand: m("props/candle-stick-stand"),
    bench: m("props/bench"),
    bag: m("props/bag"),
    pot: m("props/pot-1"),
    cauldron: m("props/cauldron"),
  },
  village: { wagon: m("village/wagon"), crate: m("village/crate") },
  ruins: {
    column: m("ruins/column-round"),
    columnSquare: m("ruins/column-square"),
    columnShort: m("ruins/column-round-short"),
    arch: m("ruins/arch-round-round-column"),
    archWallBroken: m("ruins/wall-arch-round-overgrown-broken"),
    wallBroken: m("ruins/wall-broken"),
    stairs: m("ruins/stairs"),
    statueStag: m("ruins/statue-stag"),
    statueFox: m("ruins/statue-fox"),
    bookcase: m("ruins/bookcase-full"),
    bricks: m("ruins/bricks"),
    pots: [m("ruins/pot1-broken"), m("ruins/pot2-broken")],
  },
  props2: {
    /** Rigged: Chest_Open, Chest_Close, Chest_Opened, Chest_Closed. */
    chest: m("props/chest-wood"),
  },
  character: m("character/adventurer"),
  creatures: {
    /** Clips: Idle, Fidget, SleepLoop, SleepEnd, Walk, Run, Flinch, StunStart, StunLoop. Authored ~6 long. */
    oxBeetle: m("creatures/ox-beetle"),
    /** Clips: Walk (rolling its ball), Attack. */
    dungBeetle: m("creatures/dung-beetle"),
    /** Clip: Scene (take-off and flight). Authored in cm (~170 wingspan). */
    raven: m("creatures/raven"),
  },
  survival: Object.fromEntries(
    ["tent", "backpack", "compass-open", "compass-closed", "bonfire", "wooden-torch", "wood-log", "shovel", "axe", "pan", "pot-small", "matchbox"].map((n) => [n, m(`survival/${n}`)]),
  ) as Record<string, string>,
  resources: Object.fromEntries(
    [
      "iron-bar", "iron-bars-stack-small", "gold-bar", "gold-bars", "copper-bar", "silver-bar", "iron-nuggets", "gold-nuggets",
      "parts-cog", "parts-pile-small", "stone-chunks-small", "stone-chunks-large", "wood-log-stack", "wood-planks-stack-small",
      "textiles-stack-small", "pallet-wood",
    ].map((n) => [n, m(`resources/${n}`)]),
  ) as Record<string, string>,
  dungeon: {
    pedestal: m("dungeon/pedestal"),
    pedestal2: m("dungeon/pedestal2"),
    woodfire: m("dungeon/woodfire"),
    cobwebs: [m("dungeon/cobweb"), m("dungeon/cobweb2")],
  },
} as const;
