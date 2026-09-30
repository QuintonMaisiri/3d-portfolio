// Converts downloaded asset-pack models into small, web-ready .glb files.
//
//   npm run models
//
// Source packs are unzipped into assets-inbox/_work/<pack>/ (gitignored).
// Sources may be glTF (the MegaKits), OBJ + MTL (the older packs) or FBX
// (the animated character), the last two converted on the fly.
// Each model is: stripped of normal maps (the flat low-poly style doesn't use
// them), welded and simplified, its textures shrunk to WebP, pruned, and
// Draco-compressed. Output goes to public/models/<region>/<name>.glb.
import { mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, KHRDracoMeshCompression } from "@gltf-transform/extensions";
import { dedup, prune, simplify, textureCompress, weld } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import obj2gltf from "obj2gltf";
import fbx2gltf from "fbx2gltf";
import { MeshoptSimplifier } from "meshoptimizer";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const work = join(root, "assets-inbox", "_work");
const out = join(root, "public", "models");

/**
 * What to build. `ratio` is how much geometry to keep (1 = all), `error` how
 * far the simplifier may move the surface (fraction of the model's size); `texture`
 * the largest texture edge in pixels. Add entries here as more regions move
 * to real models.
 */
const MODELS = [
  // The adventurer (Ultimate Modular Ruins Pack, CC0): skinned and animated, so
  // it skips welding and simplifying, which would break the skin.
  { src: "character/Character_Animated.fbx", dest: "character/adventurer.glb", animated: true },

  // The Enchanted Forest: woodland, project trees, undergrowth.
  // Background woodland is instanced by the hundred, so it's simplified hard.
  ...[1, 2, 3, 4, 5].map((n) => ({ src: `nature/glTF/CommonTree_${n}.gltf`, dest: `forest/common-tree-${n}.glb`, ratio: 0.3, error: 0.04, texture: 512 })),
  ...[1, 2, 3, 4, 5].map((n) => ({ src: `nature/glTF/Pine_${n}.gltf`, dest: `forest/pine-${n}.glb`, ratio: 0.3, error: 0.04, texture: 512 })),
  // Project trees are seen up close and there are only six.
  ...[1, 2, 3, 4, 5].map((n) => ({ src: `nature/glTF/TwistedTree_${n}.gltf`, dest: `forest/twisted-tree-${n}.glb`, ratio: 0.6, error: 0.01, texture: 512 })),
  { src: "nature/glTF/Bush_Common.gltf", dest: "forest/bush.glb", ratio: 0.6, texture: 512 },
  { src: "nature/glTF/Bush_Common_Flowers.gltf", dest: "forest/bush-flowers.glb", ratio: 0.6, texture: 512 },
  { src: "nature/glTF/Fern_1.gltf", dest: "forest/fern.glb", ratio: 0.7, texture: 512 },
  { src: "nature/glTF/Plant_1.gltf", dest: "forest/plant.glb", ratio: 0.7, texture: 512 },
  { src: "nature/glTF/Grass_Common_Tall.gltf", dest: "forest/grass.glb", ratio: 0.8, texture: 256 },
  ...[1, 2, 3].map((n) => ({ src: `nature/glTF/Rock_Medium_${n}.gltf`, dest: `forest/rock-${n}.glb`, ratio: 0.9, texture: 512 })),
  { src: "nature/glTF/Mushroom_Common.gltf", dest: "forest/mushroom.glb", ratio: 0.8, texture: 256 },
  { src: "nature/glTF/Mushroom_Laetiporus.gltf", dest: "forest/mushroom-shelf.glb", ratio: 0.8, texture: 256 },

  // Shared nature pieces for other regions.
  ...[1, 2, 3].map((n) => ({ src: `nature/glTF/DeadTree_${n}.gltf`, dest: `nature/dead-tree-${n}.glb`, ratio: 0.6, error: 0.01, texture: 512 })),
  ...[1, 2, 3].map((n) => ({ src: `nature/glTF/Pebble_Round_${n}.gltf`, dest: `nature/pebble-${n}.glb`, ratio: 0.9, texture: 256 })),
  ...[1, 2, 3].map((n) => ({ src: `nature/glTF/RockPath_Round_Small_${n}.gltf`, dest: `nature/path-stone-${n}.glb`, ratio: 0.9, texture: 256 })),
  { src: "nature/glTF/RockPath_Square_Wide.gltf", dest: "nature/path-slab.glb", ratio: 0.9, texture: 256 },
  { src: "nature/glTF/Flower_3_Group.gltf", dest: "nature/flowers-1.glb", ratio: 0.8, texture: 256 },
  { src: "nature/glTF/Flower_4_Group.gltf", dest: "nature/flowers-2.glb", ratio: 0.8, texture: 256 },

  // Fantasy Props MegaKit (CC0): Archive, Forge and Campfire props.
  ...[
    "Anvil", "Anvil_Log", "Workbench", "WeaponStand", "Whetstone", "Barrel", "Crate_Metal", "Chain_Coil", "Torch_Metal",
    "Bookcase_2", "Book_Stack_1", "Book_Stack_2", "BookStand", "Candle_1", "Candle_2", "CandleStick_Stand",
    "CandleStick_Triple", "Scroll_1", "Bench", "Crate_Wooden", "Bag", "Pot_1", "Cauldron", "Shelf_Arch",
  ].map((name) => ({ src: `props/Exports/glTF/${name}.gltf`, dest: `props/${kebab(name)}.glb`, ratio: 0.9, texture: 512 })),

  // Medieval Village MegaKit (CC0).
  ...["Prop_Wagon", "Prop_Crate"].map((name) => ({
    src: `village/Medieval Village MegaKit[Standard]/glTF/${name}.gltf`,
    dest: `village/${kebab(name.replace("Prop_", ""))}.glb`,
    ratio: 0.9,
    texture: 512,
  })),

  // Ultimate Modular Ruins Pack (CC0, OBJ).
  ...[
    "Column_Round", "Column_Round_Short", "Column_Square", "Arch_Round_RoundColumn", "Arch_Round", "Wall_Broken",
    "Wall_ArchRound_Broken", "Wall_ArchRound_Overgrown_Broken", "Stairs", "Statue_Stag", "Statue_Fox", "Bookcase_Full",
    "Bricks", "Pot1_Broken", "Pot2_Broken", "Candles_1", "Candles_2",
  ].map((name) => ({ src: `ruins/Ultimate Modular Ruins Pack - Aug 2021/OBJ/${name}.obj`, dest: `ruins/${kebab(name)}.glb`, ratio: 1, texture: 512 })),

  // Updated Modular Dungeon (CC0, OBJ).
  ...["Pedestal", "Pedestal2", "Woodfire", "Column", "Cobweb", "Cobweb2", "Torch"].map((name) => ({
    src: `dungeon/Updated Modular Dungeon - May 2019/OBJ/${name}.obj`,
    dest: `dungeon/${kebab(name)}.glb`,
    ratio: 1,
    texture: 512,
  })),
];

/** Converts an FBX with the FBX2glTF binary into a temporary .glb and reads it. */
async function readFbx(src) {
  const dir = mkdtempSync(join(tmpdir(), "fbx-"));
  try {
    const glb = await fbx2gltf(src, join(dir, "model.glb"), ["--binary"]);
    return await io.read(glb);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function kebab(name) {
  return name.replace(/_/g, "-").replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "draco3d.encoder": await draco3d.createEncoderModule(),
  "draco3d.decoder": await draco3d.createDecoderModule(),
});

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

const only = process.argv[2];
for (const model of MODELS.filter((m) => !only || m.dest.includes(only))) {
  const src = join(work, model.src);
  const dest = join(out, model.dest);
  const document = src.endsWith(".obj")
    ? await io.readBinary(await obj2gltf(src, { binary: true }))
    : src.endsWith(".fbx")
      ? await readFbx(src)
      : await io.read(src);

  // Normal maps add weight and fight the flat-shaded look.
  for (const material of document.getRoot().listMaterials()) material.setNormalTexture(null);

  if (model.animated) {
    // FBX2glTF writes every clip twice ("Walk" and "CharacterArmature|Walk"); keep the short names.
    for (const clip of document.getRoot().listAnimations()) if (clip.getName().includes("|")) clip.dispose();
    await document.transform(dedup(), prune());
  } else await document.transform(
    dedup(),
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: model.ratio, error: model.error ?? 0.004 }),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [model.texture, model.texture] }),
    prune(),
  );
  document
    .createExtension(KHRDracoMeshCompression)
    .setRequired(true)
    .setEncoderOptions({ method: KHRDracoMeshCompression.EncoderMethod.EDGEBREAKER });

  mkdirSync(dirname(dest), { recursive: true });
  await io.write(dest, document);
  console.log(`${model.dest.padEnd(30)} ${kb(statSync(dest).size)}`);
}
