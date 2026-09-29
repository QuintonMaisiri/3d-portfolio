import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "draco3d.decoder": await draco3d.createDecoderModule() });
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f);
  const pts = [];
  for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) {
    const a = p.getAttribute("POSITION"); const v = [];
    for (let i = 0; i < a.getCount(); i++) pts.push(a.getElement(i, v).slice());
  }
  // Nodes may carry transforms; report raw extents too.
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const topAtCentre = Math.min(...pts.filter((p) => Math.abs(p[0] - cx) < 0.25 && p[1] > 1).map((p) => p[1]));
  const halfWidthLow = Math.min(...pts.filter((p) => p[1] < 1 && p[1] > 0.1).map((p) => Math.abs(p[0] - cx)));
  console.log(f, { cx: cx.toFixed(2), x: [Math.min(...xs).toFixed(2), Math.max(...xs).toFixed(2)], y: [Math.min(...ys).toFixed(2), Math.max(...ys).toFixed(2)], openingTop: topAtCentre.toFixed(2), openingHalfWidth: halfWidthLow.toFixed(2) });
}
