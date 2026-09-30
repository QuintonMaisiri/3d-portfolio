import { Mesh, MeshBasicMaterial, type Material, type Object3D } from "three";

/** Lit, opaque surfaces cast and receive shadows; glows, water, mist and hit areas don't. */
const castsShadow = (material: Material | Material[]) => {
  const m = Array.isArray(material) ? material[0] : material;
  return !!m && !(m instanceof MeshBasicMaterial) && !m.transparent && m.colorWrite !== false;
};

/** Flags shadow casters and receivers under `root` (planes only receive). */
export function applyShadowFlags(root: Object3D) {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const lit = castsShadow(object.material);
    object.receiveShadow = lit;
    object.castShadow = lit && object.geometry.type !== "PlaneGeometry";
  });
}
