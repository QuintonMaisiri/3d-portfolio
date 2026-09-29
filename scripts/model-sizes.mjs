// Prints the size (world units), lowest point and triangle count of every built model:
//   node scripts/model-sizes.mjs public/models
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { getBounds } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import { readdirSync } from "node:fs";
import { join } from "node:path";
const root = process.argv[2];
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "draco3d.decoder": await draco3d.createDecoderModule() });
for (const dir of ["nature", "props", "village", "ruins", "dungeon", "forest"]) {
  for (const f of readdirSync(join(root, dir))) {
    if (process.argv[3] && !`${dir}/${f}`.includes(process.argv[3])) continue;
    const doc = await io.read(join(root, dir, f));
    const b = getBounds(doc.getRoot().listScenes()[0]);
    const size = b.max.map((v, i) => (v - b.min[i]).toFixed(2));
    const tris = doc.getRoot().listMeshes().flatMap((m) => m.listPrimitives()).reduce((n, p) => n + (p.getIndices()?.getCount() ?? p.getAttribute("POSITION").getCount()) / 3, 0);
    console.log(`${dir}/${f}`.padEnd(46), "size", size.join(" x "), " minY", b.min[1].toFixed(2), " tris", Math.round(tris));
  }
}
