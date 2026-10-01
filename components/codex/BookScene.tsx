"use client";

import { useGLTF, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CanvasTexture,
  DoubleSide,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  Quaternion,
  QuaternionLinearInterpolant,
  SRGBColorSpace,
  Vector3,
  type AnimationClip,
  type BufferAttribute,
  type Group,
  type Object3D,
  type PerspectiveCamera,
  type SkinnedMesh,
  type Texture,
} from "three";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import { DRACO_PATH } from "@/lib/assets";
import { MODELS } from "@/lib/models";

/**
 * The Codex as a real 3D journal: "FREE Simple Opening Book" by Cecile Amstad
 * (CC-BY-4.0, credited in content/credits.ts). Its front cover is skinned to
 * one hinge joint, and its one clip swings the cover open. The book is turned
 * to lie in the XY plane, pages facing +z, the spine along y at x = 0, and
 * scaled so a page is 1 wide.
 *
 * Fitted to the Codex: the hinge follows the clip's own easing but is scaled
 * to lie flat at 180 degrees (the clip stops at about 169, which tilts the
 * left page); a sheet of pages rides on the inside of the cover (the model has
 * pages on the right only); the title is tooled onto the cover. Page turns
 * bend a finely divided sheet round the spine, the part nearest the spine
 * going first.
 *
 * The HTML pages are laid over the page surfaces (reported by onLayout) and
 * shown only while the book lies flat; the page tops are unlit and use the
 * same washed paper as the HTML, so the text sits on exactly the colour it
 * was designed for.
 */

/** Seconds to open, close and turn a page (Codex.tsx waits on the callbacks, not these). */
const OPEN_S = 1.6;
const CLOSE_S = 1.05;
const TURN_S = 0.95;
const FOV = 28;
/** The clip has the cover lying open (and still) from here on. */
const CLIP_OPEN_AT = 4.9;
const HINGE = "_Under_book_010";
/** Thickness of the sheet of pages on the inside of the cover. */
const SHEET = 0.02;
/** Turn progress at which the fore-edge has passed the spine (the curl: t * 1.45 - 0.45 >= 0.5 at the edge, plus a margin). */
const CROSSED_AT = 0.72;
/** The turning page: finely divided so it can bend. */
const LEAF_SEGMENTS = 40;

export type BookPhase = "closed" | "opening" | "open" | "closing";

export interface PageRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Rect3 {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Paper as the HTML shows it: the paper texture under a light wash (matches .codex-paper in globals.css). */
function washedPaper(paper: HTMLImageElement, size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#e8d5b3";
  ctx.fillRect(0, 0, size, size);
  const pattern = ctx.createPattern(paper, "repeat");
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.fillStyle = "rgba(245, 236, 215, 0.55)";
  ctx.fillRect(0, 0, size, size);
  return canvas;
}

function toTexture(canvas: HTMLCanvasElement) {
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** A page in someone's hand: a heading and lines of ink (no letters, so it reads the same from either side). */
function writtenPage(paper: HTMLImageElement) {
  const base = washedPaper(paper);
  const ctx = base.getContext("2d")!;
  const s = base.width;
  ctx.fillStyle = "rgba(91, 70, 50, 0.34)";
  ctx.fillRect(s * 0.12, s * 0.1, s * 0.34, s * 0.03);
  ctx.fillStyle = "rgba(91, 70, 50, 0.16)";
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let y = s * 0.2; y < s * 0.9; y += s * 0.038) {
    if (rand() < 0.12) continue;
    const width = s * (0.5 + rand() * 0.26);
    ctx.fillRect(s * 0.12, y, width, s * 0.005);
  }
  return base;
}

/** Page edges: fine stacked lines, for the sides of the sheet of pages. */
function pageEdges() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  for (let y = 0; y < 256; y += 2) {
    const shade = 200 + ((y * 37) % 34);
    ctx.fillStyle = `rgb(${shade + 22}, ${shade + 6}, ${shade - 30})`;
    ctx.fillRect(0, y, 64, 2);
  }
  return canvas;
}

/** The cover's tooling, on a transparent sheet over the model's leather: gold border, compass, title and author. */
function coverTooling(title: string, author: string, fontFamily: string, aspect: number) {
  const w = 700;
  const h = Math.round(w * aspect);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const gold = "#e2b354";
  ctx.strokeStyle = gold;
  ctx.shadowColor = "rgba(40,10,0,0.7)";
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 3;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, w - 80, h - 80);
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 56, w - 112, h - 112);
  ctx.globalAlpha = 1;
  // Emblem: a compass rose.
  const cx = w / 2;
  const cy = h * 0.34;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, 54, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - 80);
  ctx.lineTo(cx + 15, cy);
  ctx.lineTo(cx, cy + 80);
  ctx.lineTo(cx - 15, cy);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = gold;
  ctx.textAlign = "center";
  ctx.font = `600 66px ${fontFamily}`;
  const words = title.split(" ");
  const mid = Math.ceil(words.length / 2);
  ctx.fillText(words.slice(0, mid).join(" "), cx, h * 0.55);
  ctx.fillText(words.slice(mid).join(" "), cx, h * 0.55 + 80);
  ctx.font = `600 24px ${fontFamily}`;
  ctx.fillText(author.toUpperCase().split("").join(String.fromCharCode(8202)), cx, h * 0.55 + 160);
  return canvas;
}

/** The fold beside the spine: shadow deepest at the spine (left edge), fading across the page. */
function gutter() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 4;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 128, 0);
  g.addColorStop(0, "rgba(40,24,10,0.45)");
  g.addColorStop(0.12, "rgba(50,30,12,0.3)");
  g.addColorStop(0.5, "rgba(60,38,16,0.1)");
  g.addColorStop(1, "rgba(60,38,16,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 4);
  return canvas;
}

/**
 * Reads the model once: fits it to the scene frame, measures its pages and
 * covers, and turns the clip's hinge rotation into an easing curve.
 */
function fitBook(scene: Object3D, clip: AnimationClip) {
  scene.updateMatrixWorld(true);
  let cover: SkinnedMesh | undefined;
  let pages: Mesh | undefined;
  let hinge: Object3D | undefined;
  scene.traverse((o) => {
    if ((o as SkinnedMesh).isSkinnedMesh) cover = o as SkinnedMesh;
    else if ((o as Mesh).isMesh) pages = o as Mesh;
    if (o.name === HINGE) hinge = o;
  });
  if (!cover || !pages || !hinge) throw new Error("Codex book: unexpected model structure");
  const joint = hinge;
  const skin = cover;

  // The hinge's rotation over the clip, as a fraction of its full swing.
  const track = clip.tracks.find((t) => t.name === `${HINGE}.quaternion`);
  if (!track) throw new Error("Codex book: no hinge track");
  const interp = new QuaternionLinearInterpolant(track.times, track.values, 4, new Float32Array(4));
  // Sampled in order, each kept on the same hemisphere as the last (the keys flip sign partway through).
  const samples: Quaternion[] = [];
  for (let i = 0; i <= 64; i++) {
    const v = interp.evaluate((i / 64) * CLIP_OPEN_AT);
    const q = new Quaternion(v[0], v[1], v[2], v[3]).normalize();
    const prev = samples[i - 1];
    if (prev && prev.dot(q) < 0) q.set(-q.x, -q.y, -q.z, -q.w);
    samples.push(q);
  }
  const closedQ = samples[0]!.clone();
  const inv = closedQ.clone().invert();
  const rel = samples.map((q) => inv.clone().multiply(q));
  const endRel = rel[64]!;
  const axis = new Vector3(endRel.x, endRel.y, endRel.z).normalize();
  const angleOf = (q: Quaternion) => 2 * Math.atan2(new Vector3(q.x, q.y, q.z).dot(axis), q.w);
  const endAngle = angleOf(endRel);
  const curve = rel.map((q) => clamp01(angleOf(q) / endAngle));
  curve[64] = 1;
  /** Clip-shaped swing for linear progress p: 0 shut, 1 lying flat open. */
  const swing = (p: number) => {
    const x = clamp01(p) * 64;
    const i = Math.min(63, Math.floor(x));
    return curve[i]! + (curve[i + 1]! - curve[i]!) * (x - i);
  };
  /** The hinge's rotation, `open` of the way to 180 degrees. */
  const hingeQ = (open: number, out: Quaternion) => out.setFromAxisAngle(axis, Math.PI * open).premultiply(closedQ);

  // Fit: model (x, y up, z along the spine) to scene (x, y along the spine, z up), spine at x = 0, page top at z = 0.
  hingeQ(0, joint.quaternion);
  scene.updateMatrixWorld(true);
  const geometry = pages.geometry;
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  const pb = geometry.boundingBox!.clone().applyMatrix4(pages.matrixWorld);
  const pivot = new Vector3().setFromMatrixPosition(joint.matrixWorld);
  const scale = 1 / (pb.max.x - pb.min.x);
  const fit = new Matrix4()
    .makeScale(scale, scale, scale)
    .multiply(new Matrix4().makeRotationX(Math.PI / 2))
    .multiply(new Matrix4().makeTranslation(-pivot.x, -pb.max.y, 0));

  // The skinned cover's vertices in scene space, in a pose.
  const v = new Vector3();
  const pose = (open: number) => {
    hingeQ(open, joint.quaternion);
    scene.updateMatrixWorld(true);
    skin.skeleton.update();
  };
  const sample = (open: number, keep: (p: Vector3) => void) => {
    pose(open);
    const toScene = fit.clone().multiply(skin.matrixWorld);
    const n = skin.geometry.attributes.position!.count;
    for (let i = 0; i < n; i++) keep(skin.getVertexPosition(i, v).applyMatrix4(toScene));
  };
  const closed = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity, top: -Infinity };
  sample(0, (p) => {
    closed.x0 = Math.min(closed.x0, p.x);
    closed.x1 = Math.max(closed.x1, p.x);
    closed.y0 = Math.min(closed.y0, p.y);
    closed.y1 = Math.max(closed.y1, p.y);
    if (p.x > 0.15) closed.top = Math.max(closed.top, p.z);
  });
  let inside = -Infinity;
  sample(1, (p) => {
    if (p.x < -0.15 && p.x > -0.9) inside = Math.max(inside, p.z);
  });

  const a = pb.min.clone().applyMatrix4(fit);
  const b = pb.max.clone().applyMatrix4(fit);
  const right: Rect3 = { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y) };
  const left: Rect3 = { x0: -right.x1, x1: -right.x0, y0: right.y0, y1: right.y1 };
  const leftTop = inside + 0.002 + SHEET;

  /** Hangs a child on the hinge so it sits at `world` (scene space) when the cover is `open` (0 shut, 1 open). */
  const attach = (child: Object3D, world: Matrix4, open: number) => {
    pose(open);
    const local = new Matrix4().copy(joint.matrixWorld).invert().multiply(fit.clone().invert()).multiply(world);
    local.decompose(child.position, child.quaternion, child.scale);
    joint.add(child);
  };
  pose(0);
  return { fit, hinge: joint, cover: skin, pages, hingeQ, swing, right, left, leftTop, closed, attach };
}

export function BookScene({
  phase,
  turnId,
  narrow,
  title,
  author,
  onOpened,
  onClosed,
  onTurn,
  onLayout,
  instant = false,
  scrub,
}: {
  /** Dev lab only: hold the cover at this opening progress (0 shut, 1 open). */
  scrub?: number;
  /** Reduced motion: jump straight to open or shut, and don't animate page turns. */
  instant?: boolean;
  phase: BookPhase;
  /** Increments each time a page should turn. */
  turnId: number;
  /** Small screens: frame the right-hand page alone. */
  narrow: boolean;
  title: string;
  author: string;
  onOpened: () => void;
  onClosed: () => void;
  /** A page turn has passed the spine (its fore-edge is over the left page), then has landed. */
  onTurn: (stage: "crossed" | "done") => void;
  onLayout: (rects: { left: PageRect; right: PageRect }) => void;
}) {
  const paperTex = useTexture("/codex/paper.webp") as Texture;
  const gltf = useGLTF(MODELS.props2.codexBook, DRACO_PATH);
  const size = useThree((s) => s.size);
  const get = useThree((s) => s.get);

  const root = useRef<Group>(null);
  const fold = useRef<Group>(null);
  const leaf = useRef<Mesh>(null);
  const progress = useRef(phase === "open" ? 1 : 0);
  const turn = useRef({ t: 1, id: turnId, crossed: true, done: true });
  const reported = useRef<"opened" | "closed" | null>(null);

  // Canvas-drawn textures, made once the paper has loaded.
  const textures = useMemo(() => {
    const paper = paperTex.image as HTMLImageElement;
    return {
      page: toTexture(washedPaper(paper)),
      written: toTexture(writtenPage(paper)),
      edges: toTexture(pageEdges()),
      gutter: toTexture(gutter()),
    };
  }, [paperTex]);
  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures]);

  // The model, fitted and dressed: its own clone, so remounting the Codex starts clean.
  const book = useMemo(() => {
    const scene = cloneSkinned(gltf.scene);
    const clip = gltf.animations[0];
    if (!clip) throw new Error("Codex book: no clip");
    const fitted = fitBook(scene, clip);
    const probe = document.querySelector(".font-display");
    const fontFamily = probe ? getComputedStyle(probe).fontFamily : "serif";

    const leatherMap = (fitted.cover.material as MeshLambertMaterial).map ?? null;
    const leather = new MeshLambertMaterial({ map: leatherMap, color: "#d8c4bc" });
    const block = new MeshLambertMaterial({ color: "#dcc59c" });
    const page = new MeshBasicMaterial({ map: textures.page, toneMapped: false });
    const edges = new MeshLambertMaterial({ map: textures.edges });
    const coverX0 = Math.max(0, fitted.closed.x0);
    const toolW = fitted.closed.x1 - coverX0 - 0.08;
    const toolH = fitted.closed.y1 - fitted.closed.y0 - 0.08;
    const toolingTex = toTexture(coverTooling(title, author, fontFamily, toolH / toolW));
    const tooling = new MeshBasicMaterial({ map: toolingTex, transparent: true, toneMapped: false, depthWrite: false });
    fitted.cover.material = leather;
    fitted.pages.material = block;
    fitted.cover.frustumCulled = false;

    const geometries = {
      top: new PlaneGeometry(fitted.right.x1 - fitted.right.x0, fitted.right.y1 - fitted.right.y0),
      sheet: new BoxGeometry(fitted.left.x1 - fitted.left.x0, fitted.left.y1 - fitted.left.y0, SHEET),
      tooling: new PlaneGeometry(toolW, toolH),
    };

    // The sheet of pages on the inside of the cover, its top level with the right-hand page when open.
    const sheet = new Mesh(geometries.sheet, [edges, edges, edges, edges, page, block]);
    const { left, closed } = fitted;
    fitted.attach(sheet, new Matrix4().makeTranslation((left.x0 + left.x1) / 2, (left.y0 + left.y1) / 2, fitted.leftTop - SHEET / 2), 1);
    // The tooling on the cover's outside, shut.
    const tool = new Mesh(geometries.tooling, tooling);
    fitted.attach(tool, new Matrix4().makeTranslation((coverX0 + closed.x1) / 2, (closed.y0 + closed.y1) / 2, closed.top + 0.003), 0);
    fitted.hingeQ(0, fitted.hinge.quaternion);

    return { scene, fitted, materials: { leather, block, page, edges, tooling }, geometries, toolingTex };
  }, [gltf, textures, title, author]);
  useEffect(
    () => () => {
      Object.values(book.materials).forEach((m) => m.dispose());
      Object.values(book.geometries).forEach((g) => g.dispose());
      book.toolingTex.dispose();
    },
    [book],
  );

  const { right, left, leftTop, closed } = book.fitted;
  const pageW = right.x1 - right.x0;
  const pageH = right.y1 - right.y0;
  const pageCy = (right.y0 + right.y1) / 2;
  const coverX1 = closed.x1;
  const coverH = closed.y1 - closed.y0;
  const coverCy = (closed.y0 + closed.y1) / 2;
  const closedCx = (Math.max(0, closed.x0) + closed.x1) / 2;

  const materials = useMemo(() => {
    const leafMat = new MeshBasicMaterial({ map: textures.written, side: DoubleSide, transparent: true, toneMapped: false });
    const ribbon = new MeshLambertMaterial({ color: "#6e2212", side: DoubleSide });
    const foldMat = new MeshBasicMaterial({ map: textures.gutter, transparent: true, depthWrite: false, toneMapped: false });
    return { leaf: leafMat, ribbon, fold: foldMat };
  }, [textures]);
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  const geometries = useMemo(() => {
    const leafGeo = new PlaneGeometry(pageW, pageH, LEAF_SEGMENTS, 1);
    leafGeo.translate(right.x0 + pageW / 2, pageCy, 0);
    const ribbonGeo = new PlaneGeometry(0.02, pageH + 0.22);
    const foldGeo = new PlaneGeometry(0.3, pageH);
    foldGeo.translate(0.15, 0, 0);
    return { leaf: leafGeo, ribbon: ribbonGeo, fold: foldGeo, leafRest: Float32Array.from(leafGeo.getAttribute("position").array) };
  }, [pageW, pageH, pageCy, right.x0]);
  useEffect(
    () => () =>
      Object.values(geometries).forEach((g) => {
        if (!(g instanceof Float32Array)) g.dispose();
      }),
    [geometries],
  );

  // Frame the open book (both pages, or just the right one on small screens) and report where the pages land on screen.
  useLayoutEffect(() => {
    const cam = get().camera as PerspectiveCamera;
    cam.fov = FOV;
    cam.near = 0.05;
    cam.far = 50;
    const aspect = size.width / size.height;
    // Room round the book, so the leather cover shows.
    const needW = narrow ? (coverX1 + 0.04) * 1.05 : 2 * coverX1 * 1.12;
    const needH = coverH * (narrow ? 1.05 : 1.1);
    const tan = Math.tan((FOV * Math.PI) / 360);
    const dist = Math.max(needH / (2 * tan), needW / (2 * tan * aspect));
    const cx = narrow ? (coverX1 - 0.04) / 2 : 0;
    cam.position.set(cx, coverCy, dist);
    cam.lookAt(cx, coverCy, 0);
    cam.aspect = aspect;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    const project = (x: number, y: number, z: number) => {
      const p = new Vector3(x, y, z).project(cam);
      return { x: ((p.x + 1) / 2) * size.width, y: ((1 - p.y) / 2) * size.height };
    };
    const rect = (r: Rect3, z: number): PageRect => {
      const a = project(r.x0, r.y1, z);
      const b = project(r.x1, r.y0, z);
      return { left: a.x, top: a.y, width: b.x - a.x, height: b.y - a.y };
    };
    onLayout({ left: rect(left, leftTop + 0.001), right: rect(right, 0.001) });
  }, [get, size.width, size.height, narrow, onLayout, left, right, leftTop, coverX1, coverH, coverCy]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);

    // Opening and closing: the cover swings on the clip's curve.
    const target = phase === "opening" || phase === "open" ? 1 : 0;
    const rate = target > progress.current ? 1 / OPEN_S : 1 / CLOSE_S;
    progress.current = scrub !== undefined ? scrub : instant ? target : clamp01(progress.current + Math.sign(target - progress.current) * rate * dt);
    const e = smooth(progress.current);
    book.fitted.hingeQ(book.fitted.swing(progress.current), book.fitted.hinge.quaternion);
    if (fold.current) fold.current.visible = progress.current > 0.97;
    if (root.current) {
      // Shut, the book is centred, tilted back and a little smaller; it settles flat and square as it opens.
      root.current.position.x = narrow ? 0 : -closedCx * (1 - e);
      root.current.position.y = -0.04 * (1 - e);
      root.current.rotation.x = -0.42 * (1 - e);
      root.current.rotation.z = 0.05 * (1 - e);
      root.current.scale.setScalar(0.9 + 0.1 * e);
    }
    if (phase === "opening" && progress.current >= 1 && reported.current !== "opened") {
      reported.current = "opened";
      onOpened();
    }
    if (phase === "closing" && progress.current <= 0 && reported.current !== "closed") {
      reported.current = "closed";
      onClosed();
    }
    if (phase === "opening" || phase === "open") {
      if (reported.current === "closed") reported.current = null;
    } else if (reported.current === "opened") reported.current = null;

    // Page turns: the sheet bends round the spine, nearest the spine first, and fades as it lands.
    if (turnId !== turn.current.id) {
      turn.current = { t: instant ? 1 : 0, id: turnId, crossed: false, done: false };
    }
    const t = (turn.current.t = Math.min(1, turn.current.t + dt / TURN_S));
    // Driven by the leaf itself, so the HTML never shows through it on a slow frame rate.
    if (!turn.current.crossed && t >= CROSSED_AT) {
      turn.current.crossed = true;
      onTurn("crossed");
    }
    if (!turn.current.done && t >= 1) {
      turn.current.done = true;
      onTurn("done");
    }
    const sheet = leaf.current;
    if (sheet) {
      sheet.visible = t < 1;
      if (sheet.visible) {
        const pos = sheet.geometry.getAttribute("position") as BufferAttribute;
        const rest = geometries.leafRest;
        for (let i = 0; i < pos.count; i++) {
          const x = rest[i * 3]!;
          const y = rest[i * 3 + 1]!;
          const u = (x - right.x0) / pageW;
          // The spine end leads; the fore-edge lags, curling the page; it lands on the (slightly higher) left page.
          const a = Math.PI * smooth(clamp01(t * 1.45 - 0.45 * u));
          const lift = Math.sin(Math.PI * t) * 0.05 * u;
          pos.setXYZ(i, Math.cos(a) * x, y, 0.004 + Math.sin(a) * x + lift + (leftTop * a) / Math.PI);
        }
        pos.needsUpdate = true;
        sheet.geometry.computeVertexNormals();
        (sheet.material as MeshBasicMaterial).opacity = 1 - smooth(clamp01((t - 0.82) / 0.18));
      }
    }
  });

  return (
    <>
      <ambientLight intensity={1.1} color="#fff4e6" />
      <directionalLight position={[-1.5, 2.5, 4]} intensity={1.5} color="#fff1dc" />
      <group ref={root}>
        <group matrixAutoUpdate={false} matrix={book.fitted.fit}>
          <primitive object={book.scene} />
        </group>
        {/* The right-hand page's top, in the same washed paper as the HTML. */}
        <mesh geometry={book.geometries.top} position={[(right.x0 + right.x1) / 2, pageCy, 0.001]} material={book.materials.page} />
        {/* The ribbon, lying in the fold and hanging past the tail. */}
        <mesh geometry={geometries.ribbon} position={[0, pageCy - 0.11, 0.003]} material={materials.ribbon} />
        {/* The fold's shadow either side of the spine (only once the cover has come over). */}
        <group ref={fold} position={[0, pageCy, 0]}>
          <mesh geometry={geometries.fold} position={[0, 0, 0.002]} material={materials.fold} />
          <mesh geometry={geometries.fold} position={[0, 0, leftTop + 0.002]} scale={[-1, 1, 1]} material={materials.fold} />
        </group>
        {/* The page being turned. */}
        <mesh ref={leaf} geometry={geometries.leaf} material={materials.leaf} visible={false} />
      </group>
    </>
  );
}

useGLTF.preload(MODELS.props2.codexBook, DRACO_PATH);
