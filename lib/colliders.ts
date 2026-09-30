import {
  InstancedMesh,
  Matrix4,
  Mesh,
  Points,
  SkinnedMesh,
  Vector3,
  type BufferGeometry,
  type Material,
  type Object3D,
} from "three";

/**
 * Solid props as upright boxes on the ground plane, rotated about y, built
 * automatically from the scene: every opaque mesh (and every instance) taller
 * than a step and smaller than the terrain. Mark an object (or any ancestor)
 * with `userData.walkThrough = true` to leave it out: grass, foliage, arches,
 * anything you should pass through.
 */
export interface Collider {
  x: number;
  z: number;
  /** Unit axis of the box's local x on the ground plane; local z is its perpendicular. */
  ax: number;
  az: number;
  /** Half extents along those axes. */
  hx: number;
  hz: number;
  /** World-space vertical span. */
  y0: number;
  y1: number;
}

/** Anything lower than this is stepped over. */
const MIN_HEIGHT = 0.35;
/** Anything wider than this is terrain or sky, not a prop. */
const MAX_SPAN = 60;
const CELL = 8;
/** A prop's footprint is taken from its geometry below this height (world units): trunks, not crowns. */
const BODY_TOP = 2.6;
const SLABS = 12;

/**
 * Per geometry: its local x/z extents from the bottom up, in SLABS horizontal
 * slices (cumulative), so an instance's footprint can use only the part
 * below BODY_TOP whatever its scale. A tree collides at its trunk, not the
 * spread of its branches.
 */
interface Slabs {
  minY: number;
  maxY: number;
  /** [minX, maxX, minZ, maxZ] of everything from the bottom up to the end of slab i. */
  boxes: [number, number, number, number][];
}
const slabCache = new WeakMap<BufferGeometry, Slabs>();

function slabsOf(geometry: BufferGeometry): Slabs {
  const cached = slabCache.get(geometry);
  if (cached) return cached;
  const box = geometry.boundingBox!;
  const minY = box.min.y;
  const maxY = box.max.y;
  const per: [number, number, number, number][] = Array.from({ length: SLABS }, () => [Infinity, -Infinity, Infinity, -Infinity]);
  const pos = geometry.getAttribute("position");
  for (let i = 0; i < pos.count; i++) {
    const k = Math.min(SLABS - 1, Math.floor(((pos.getY(i) - minY) / Math.max(1e-6, maxY - minY)) * SLABS));
    const b = per[k]!;
    const x = pos.getX(i);
    const z = pos.getZ(i);
    if (x < b[0]) b[0] = x;
    if (x > b[1]) b[1] = x;
    if (z < b[2]) b[2] = z;
    if (z > b[3]) b[3] = z;
  }
  const boxes: [number, number, number, number][] = [];
  let run: [number, number, number, number] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const b of per) {
    run = [Math.min(run[0], b[0]), Math.max(run[1], b[1]), Math.min(run[2], b[2]), Math.max(run[3], b[3])];
    boxes.push(run);
  }
  const slabs = { minY, maxY, boxes };
  slabCache.set(geometry, slabs);
  return slabs;
}

const footprintMin = new Vector3();
const footprintMax = new Vector3();

let colliders: Collider[] = [];
const grid = new Map<string, Collider[]>();
let dirty = true;

/** Call when props are added (a model finished loading): colliders are rebuilt on the next frame. */
export function markCollidersDirty() {
  dirty = true;
}

const walkThrough = (object: Object3D) => {
  for (let o: Object3D | null = object; o; o = o.parent) if (o.userData.walkThrough) return true;
  return false;
};

const blocks = (material: Material | Material[]) => {
  const m = Array.isArray(material) ? material[0] : material;
  return !!m && m.colorWrite !== false && !(m.transparent && !m.depthWrite);
};

const corner = new Vector3();
const instance = new Matrix4();
const world = new Matrix4();

function add(min: Vector3, max: Vector3, matrix: Matrix4) {
  // The box's centre and its local x and z axes, carried into world space.
  const e = matrix.elements;
  const cx = (min.x + max.x) / 2;
  const cy = (min.y + max.y) / 2;
  const cz = (min.z + max.z) / 2;
  const x = e[0]! * cx + e[4]! * cy + e[8]! * cz + e[12]!;
  const z = e[2]! * cx + e[6]! * cy + e[10]! * cz + e[14]!;
  const xLen = Math.hypot(e[0]!, e[2]!);
  const zLen = Math.hypot(e[8]!, e[10]!);
  if (xLen < 1e-6 || zLen < 1e-6) return;
  const hx = ((max.x - min.x) / 2) * xLen;
  const hz = ((max.z - min.z) / 2) * zLen;
  if (hx * 2 > MAX_SPAN || hz * 2 > MAX_SPAN) return;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let k = 0; k < 8; k++) {
    corner.set(k & 1 ? max.x : min.x, k & 2 ? max.y : min.y, k & 4 ? max.z : min.z).applyMatrix4(matrix);
    y0 = Math.min(y0, corner.y);
    y1 = Math.max(y1, corner.y);
  }
  if (y1 - y0 < MIN_HEIGHT) return;
  colliders.push({ x, z, ax: e[0]! / xLen, az: e[2]! / xLen, hx, hz, y0, y1 });
}

/** Rebuilds colliders from the scene if anything changed. Cheap to call every frame. */
export function updateColliders(scene: Object3D) {
  if (!dirty) return;
  dirty = false;
  colliders = [];
  scene.updateMatrixWorld(true);
  scene.traverse((object) => {
    if (!(object instanceof Mesh) || object instanceof SkinnedMesh || object instanceof Points) return;
    if (!blocks(object.material) || walkThrough(object)) return;
    const geometry = object.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    if (box.max.y - box.min.y < 1e-4) return;
    const slabs = slabsOf(geometry);
    const place = (matrix: Matrix4) => {
      // Footprint from the geometry below BODY_TOP at this instance's scale; height from the whole thing.
      const e = matrix.elements;
      const scaleY = Math.hypot(e[4]!, e[5]!, e[6]!);
      const reach = (BODY_TOP / Math.max(1e-6, scaleY) / Math.max(1e-6, slabs.maxY - slabs.minY)) * SLABS;
      const b = slabs.boxes[Math.max(0, Math.min(SLABS - 1, Math.ceil(reach) - 1))]!;
      if (!Number.isFinite(b[0])) return;
      footprintMin.set(b[0], box.min.y, b[2]);
      footprintMax.set(b[1], box.max.y, b[3]);
      add(footprintMin, footprintMax, matrix);
    };
    if (object instanceof InstancedMesh) {
      for (let i = 0; i < object.count; i++) {
        object.getMatrixAt(i, instance);
        place(world.multiplyMatrices(object.matrixWorld, instance));
      }
    } else place(object.matrixWorld);
  });
  grid.clear();
  for (const c of colliders) {
    const reach = Math.hypot(c.hx, c.hz);
    for (let gx = Math.floor((c.x - reach) / CELL); gx <= Math.floor((c.x + reach) / CELL); gx++)
      for (let gz = Math.floor((c.z - reach) / CELL); gz <= Math.floor((c.z + reach) / CELL); gz++) {
        const key = `${gx},${gz}`;
        const cell = grid.get(key);
        if (cell) cell.push(c);
        else grid.set(key, [c]);
      }
  }
}

export const colliderCount = () => colliders.length;

/** Dev inspection: colliders within `radius` of a point. */
export const collidersNear = (x: number, z: number, radius: number) =>
  colliders.filter((c) => Math.hypot(c.x - x, c.z - z) < radius + Math.hypot(c.hx, c.hz));

const nearby = (x: number, z: number) => grid.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`) ?? [];

/**
 * Pushes a circle (the player) standing at `p` out of every box that overlaps
 * its body height. Modifies `p` in place.
 */
export function resolveCircle(p: Vector3, radius: number, height: number) {
  // Two passes settle corners where two boxes meet.
  for (let pass = 0; pass < 2; pass++) {
    for (const c of nearby(p.x, p.z)) {
      if (c.y1 < p.y + MIN_HEIGHT || c.y0 > p.y + height) continue;
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      // Into the box's frame: u along its x axis, v along its z axis.
      const u = dx * c.ax + dz * c.az;
      const v = -dx * c.az + dz * c.ax;
      const cu = Math.max(-c.hx, Math.min(c.hx, u));
      const cv = Math.max(-c.hz, Math.min(c.hz, v));
      let du = u - cu;
      let dv = v - cv;
      const d = Math.hypot(du, dv);
      if (d >= radius) continue;
      if (d > 1e-6) {
        du = (du / d) * (radius - d);
        dv = (dv / d) * (radius - d);
      } else {
        // Centre inside the box: leave by the nearest face.
        const outU = c.hx - Math.abs(u);
        const outV = c.hz - Math.abs(v);
        if (outU < outV) du = Math.sign(u || 1) * (outU + radius);
        else dv = Math.sign(v || 1) * (outV + radius);
      }
      p.x += du * c.ax - dv * c.az;
      p.z += du * c.az + dv * c.ax;
    }
  }
  return p;
}

/** Dev inspection: the collider containing a point, if any. */
export function colliderAt(p: Vector3, margin: number) {
  for (const c of nearby(p.x, p.z)) {
    if (p.y < c.y0 - margin || p.y > c.y1 + margin) continue;
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const u = dx * c.ax + dz * c.az;
    const v = -dx * c.az + dz * c.ax;
    if (Math.abs(u) < c.hx + margin && Math.abs(v) < c.hz + margin) return c;
  }
  return null;
}

/** True if a point is inside any collider (with a margin), e.g. the camera. */
export function insideCollider(p: Vector3, margin: number) {
  for (const c of nearby(p.x, p.z)) {
    if (p.y < c.y0 - margin || p.y > c.y1 + margin) continue;
    const dx = p.x - c.x;
    const dz = p.z - c.z;
    const u = dx * c.ax + dz * c.az;
    const v = -dx * c.az + dz * c.ax;
    if (Math.abs(u) < c.hx + margin && Math.abs(v) < c.hz + margin) return true;
  }
  return false;
}
