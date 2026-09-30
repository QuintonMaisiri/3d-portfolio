"use client";

import { useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
  type BufferAttribute,
  type Group,
  type Mesh,
  type PerspectiveCamera,
  type Texture,
} from "three";

/**
 * The Codex as a real 3D journal: a leather back cover, a thick page block,
 * a spine, and a front cover that swings open on the spine carrying the left
 * half of the pages with it. The book lies in the XY plane, pages facing +z,
 * the spine along y at x = 0. Shut, it's the right half (x 0..W) stacked;
 * open, the left half has turned over to x -W..0. Page turns bend a finely
 * divided sheet round the spine, the part nearest the spine going first.
 *
 * The HTML pages are laid over the page surfaces (reported by onLayout) and
 * shown only while the book lies flat; the page tops are unlit and use the
 * same washed paper as the HTML, so the text sits on exactly the colour it
 * was designed for.
 */

/** Page width and height, one half's thickness of pages, cover thickness and overhang (world units). */
const W = 1;
const H = 1.36;
const T = 0.12;
const C = 0.03;
const OV = 0.075;
/** Seconds to open, close and turn a page (Codex.tsx waits on the callbacks, not these). */
const OPEN_S = 1.25;
const CLOSE_S = 0.85;
const TURN_S = 0.95;
const FOV = 28;

export type BookPhase = "closed" | "opening" | "open" | "closing";

export interface PageRect {
  left: number;
  top: number;
  width: number;
  height: number;
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

/** Page edges: fine stacked lines, for the sides of the page blocks. */
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

/** The front cover's outside: leather, a tooled gold border, an emblem, the title and the author. */
function coverFace(leather: HTMLImageElement, title: string, author: string, fontFamily: string) {
  const w = 700;
  const h = Math.round((w * (H + 2 * OV)) / (W + OV));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const pattern = ctx.createPattern(leather, "repeat");
  ctx.fillStyle = pattern ?? "#3c2e2c";
  ctx.fillRect(0, 0, w, h);
  // Darken toward the spine (left) and edges, like worn leather.
  const shade = ctx.createLinearGradient(0, 0, w, 0);
  shade.addColorStop(0, "rgba(0,0,0,0.45)");
  shade.addColorStop(0.12, "rgba(0,0,0,0.05)");
  shade.addColorStop(1, "rgba(0,0,0,0.2)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
  const gold = "#d9a846";
  ctx.strokeStyle = gold;
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 3;
  ctx.strokeRect(46, 40, w - 86, h - 80);
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(60, 54, w - 114, h - 108);
  ctx.globalAlpha = 1;
  // Emblem: a compass rose.
  const cx = w / 2;
  const cy = h * 0.38;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 44, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - 64);
  ctx.lineTo(cx + 12, cy);
  ctx.lineTo(cx, cy + 64);
  ctx.lineTo(cx - 12, cy);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = gold;
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 2;
  ctx.font = `600 58px ${fontFamily}`;
  const words = title.split(" ");
  const mid = Math.ceil(words.length / 2);
  ctx.fillText(words.slice(0, mid).join(" "), cx, h * 0.56);
  ctx.fillText(words.slice(mid).join(" "), cx, h * 0.56 + 70);
  ctx.font = `600 22px ${fontFamily}`;
  ctx.fillText(author.toUpperCase().split("").join(String.fromCharCode(8202)), cx, h * 0.56 + 140);
  return canvas;
}

/** Inside the cover: a darker endpaper. */
function endpaper(paper: HTMLImageElement) {
  const base = washedPaper(paper);
  const ctx = base.getContext("2d")!;
  ctx.fillStyle = "rgba(120, 80, 40, 0.18)";
  ctx.fillRect(0, 0, base.width, base.height);
  return base;
}

/** The fold between the pages: shadow deepest at the spine, fading across each page. */
function gutter() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 4;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, "rgba(60,38,16,0)");
  g.addColorStop(0.38, "rgba(60,38,16,0.12)");
  g.addColorStop(0.47, "rgba(50,30,12,0.3)");
  g.addColorStop(0.5, "rgba(40,24,10,0.42)");
  g.addColorStop(0.53, "rgba(50,30,12,0.3)");
  g.addColorStop(0.62, "rgba(60,38,16,0.12)");
  g.addColorStop(1, "rgba(60,38,16,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 4);
  return canvas;
}

/** The turning page: a sheet from the spine (x = 0) to the fore-edge, finely divided so it can bend. */
const LEAF_SEGMENTS = 40;
/** Turn progress at which the fore-edge has passed the spine (the curl: t * 1.45 - 0.45 >= 0.5 at the edge, plus a margin). */
const CROSSED_AT = 0.72;

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
}: {
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
  const [paperTex, leatherTex] = useTexture(["/codex/paper.webp", "/codex/leather.webp"]) as [Texture, Texture];
  const size = useThree((s) => s.size);
  const get = useThree((s) => s.get);

  const root = useRef<Group>(null);
  const hinge = useRef<Group>(null);
  const spine = useRef<Mesh>(null);
  const fold = useRef<Mesh>(null);
  const leaf = useRef<Mesh>(null);
  const progress = useRef(phase === "open" ? 1 : 0);
  const turn = useRef({ t: 1, id: turnId, crossed: true, done: true });
  const reported = useRef<"opened" | "closed" | null>(null);

  // Canvas-drawn textures, made once the images have loaded.
  const textures = useMemo(() => {
    const paper = paperTex.image as HTMLImageElement;
    const leather = leatherTex.image as HTMLImageElement;
    const probe = document.querySelector(".font-display");
    const fontFamily = probe ? getComputedStyle(probe).fontFamily : "serif";
    const leatherRepeat = leatherTex.clone();
    leatherRepeat.wrapS = leatherRepeat.wrapT = RepeatWrapping;
    leatherRepeat.repeat.set(2, 2.6);
    leatherRepeat.colorSpace = SRGBColorSpace;
    leatherRepeat.needsUpdate = true;
    return {
      page: toTexture(washedPaper(paper)),
      written: toTexture(writtenPage(paper)),
      edges: toTexture(pageEdges()),
      cover: toTexture(coverFace(leather, title, author, fontFamily)),
      endpaper: toTexture(endpaper(paper)),
      gutter: toTexture(gutter()),
      leather: leatherRepeat,
    };
  }, [paperTex, leatherTex, title, author]);
  useEffect(() => () => Object.values(textures).forEach((t) => t.dispose()), [textures]);

  const materials = useMemo(() => {
    const leather = new MeshLambertMaterial({ map: textures.leather, color: "#e2d0c8" });
    const edges = new MeshLambertMaterial({ map: textures.edges });
    // Page tops are unlit, so the HTML laid over them sits on exactly its designed colour.
    const page = new MeshBasicMaterial({ map: textures.page, toneMapped: false });
    const cover = new MeshLambertMaterial({ map: textures.cover, color: "#f0e2da" });
    const inside = new MeshLambertMaterial({ map: textures.endpaper });
    const leafMat = new MeshBasicMaterial({ map: textures.written, side: DoubleSide, transparent: true, toneMapped: false });
    const ribbon = new MeshLambertMaterial({ color: "#6e2212", side: DoubleSide });
    const fold = new MeshBasicMaterial({ map: textures.gutter, transparent: true, depthWrite: false, toneMapped: false });
    return { leather, edges, page, cover, inside, leaf: leafMat, ribbon, fold };
  }, [textures]);
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  // Box face order: +x, -x, +y, -y, +z, -z.
  const geometries = useMemo(() => {
    const block = new BoxGeometry(W, H, T);
    const cover = new BoxGeometry(W + OV, H + 2 * OV, C);
    const spine = new CylinderGeometry(T + C, T + C, H + 2 * OV, 20, 1, true, Math.PI, Math.PI);
    const leafGeo = new PlaneGeometry(W, H, LEAF_SEGMENTS, 1);
    leafGeo.translate(W / 2, 0, 0);
    const ribbonGeo = new PlaneGeometry(0.02, H + 0.2);
    const foldGeo = new PlaneGeometry(0.34, H);
    return { block, cover, spine, leaf: leafGeo, ribbon: ribbonGeo, fold: foldGeo, leafRest: Float32Array.from(leafGeo.getAttribute("position").array) };
  }, []);
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
    // Room round the book, so the leather cover and the table show.
    const needW = (narrow ? W + OV : 2 * (W + OV)) * (narrow ? 1.06 : 1.14);
    const needH = (H + 2 * OV) * 1.12;
    const tan = Math.tan((FOV * Math.PI) / 360);
    const dist = Math.max(needH / (2 * tan), needW / (2 * tan * aspect));
    const cx = narrow ? W / 2 : 0;
    cam.position.set(cx, 0, T + dist);
    cam.lookAt(cx, 0, T);
    cam.aspect = aspect;
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    const project = (x: number, y: number) => {
      const v = new Vector3(x, y, T + 0.001).project(cam);
      return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height };
    };
    const rect = (x0: number, x1: number): PageRect => {
      const a = project(x0, H / 2);
      const b = project(x1, -H / 2);
      return { left: a.x, top: a.y, width: b.x - a.x, height: b.y - a.y };
    };
    onLayout({ left: rect(-W, 0), right: rect(0, W) });
  }, [get, size.width, size.height, narrow, onLayout]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 20);

    // Opening and closing.
    const target = phase === "opening" || phase === "open" ? 1 : 0;
    const rate = target > progress.current ? 1 / OPEN_S : 1 / CLOSE_S;
    progress.current = instant ? target : clamp01(progress.current + Math.sign(target - progress.current) * rate * dt);
    const e = smooth(progress.current);
    if (hinge.current) hinge.current.rotation.y = Math.PI * e;
    // The spine rolls under the book as it opens (it wraps the left edge when shut).
    if (spine.current) spine.current.rotation.y = -(Math.PI / 2) * e;
    if (fold.current) fold.current.visible = e > 0.97;
    if (root.current) {
      // Shut, the book (the right half) is centred, tilted back and a little smaller; it settles flat and square as it opens.
      root.current.position.x = narrow ? 0 : -(W / 2) * (1 - e);
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
          const u = x / W;
          // The spine end leads; the fore-edge lags, curling the page.
          const a = Math.PI * smooth(clamp01(t * 1.45 - 0.45 * u));
          const lift = Math.sin(Math.PI * t) * 0.05 * u;
          pos.setXYZ(i, Math.cos(a) * x, y, T + 0.004 + Math.sin(a) * x + lift);
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
        {/* Right half: back cover, then its block of pages (top face +z is the right-hand page). */}
        <mesh
          geometry={geometries.cover}
          position={[(W + OV) / 2, 0, -C / 2]}
          material={[materials.leather, materials.leather, materials.leather, materials.leather, materials.inside, materials.leather]}
        />
        <mesh
          geometry={geometries.block}
          position={[W / 2, 0, T / 2]}
          material={[materials.edges, materials.edges, materials.edges, materials.edges, materials.page, materials.page]}
        />
        {/* The spine, wrapping the stack on the left edge. */}
        <mesh ref={spine} geometry={geometries.spine} position={[0, 0, T]} material={materials.leather} />
        {/* Left half, hinged on the spine at mid-thickness: shut it lies on top; open it has turned over to the left. */}
        <group ref={hinge} position={[0, 0, T]}>
          <mesh
            geometry={geometries.block}
            position={[W / 2, 0, T / 2]}
            material={[materials.edges, materials.edges, materials.edges, materials.edges, materials.page, materials.page]}
          />
          <mesh
            geometry={geometries.cover}
            position={[(W + OV) / 2, 0, T + C / 2]}
            material={[materials.leather, materials.leather, materials.leather, materials.leather, materials.cover, materials.inside]}
          />
        </group>
        {/* The ribbon, lying in the fold and hanging past the tail. */}
        <mesh geometry={geometries.ribbon} position={[0.012, -0.11, T + 0.003]} material={materials.ribbon} />
        {/* The fold's shadow across both pages (only once the left half has come over). */}
        <mesh ref={fold} geometry={geometries.fold} position={[0, 0, T + 0.002]} material={materials.fold} />
        {/* The page being turned. */}
        <mesh ref={leaf} geometry={geometries.leaf} material={materials.leaf} visible={false} />
      </group>
    </>
  );
}
