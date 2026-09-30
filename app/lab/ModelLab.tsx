"use client";

import { Html, OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Box3, Mesh, MeshLambertMaterial, SkinnedMesh, Vector3, type Group, type MeshStandardMaterial } from "three";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
import { DRACO_PATH } from "@/lib/assets";

/** What's on the bench: url, a label, and the clip to play (if animated). */
const MODELS: { url: string; label: string; clip?: string }[] = [
  { url: "/models/character/adventurer.glb", label: "adventurer", clip: "Walk" },
  { url: "/models/creatures/ox-beetle.glb", label: "ox beetle", clip: "Walk" },
  { url: "/models/creatures/dung-beetle.glb", label: "dung beetle", clip: "Walk" },
  { url: "/models/creatures/raven.glb", label: "raven", clip: "Scene" },
  { url: "/models/props/chest-wood.glb", label: "chest", clip: "Chest_Open" },
  { url: "/models/survival/tent.glb", label: "tent" },
  { url: "/models/survival/backpack.glb", label: "backpack" },
  { url: "/models/survival/compass-open.glb", label: "compass" },
  { url: "/models/survival/bonfire.glb", label: "bonfire" },
  { url: "/models/resources/gold-bars.glb", label: "gold bars" },
  { url: "/models/resources/iron-bars-stack-small.glb", label: "iron bars" },
  { url: "/models/resources/parts-cog.glb", label: "cog" },
  { url: "/models/forest/twisted-tree-1.glb", label: "twisted tree (v1)" },
  { url: "/models/forest/mushroom.glb", label: "mushroom (v1)" },
];
const SIZE = 2.2;
const COLUMNS = 5;
const SPACING = 4;

function Specimen({ url, label, clip, position }: (typeof MODELS)[number] & { position: [number, number, number] }) {
  const { scene, animations } = useGLTF(url, DRACO_PATH);
  const group = useRef<Group>(null);
  // A private copy (skinned models need SkeletonUtils), Lambert like the world, fitted to SIZE.
  const [copy, scale, lift] = useMemo(() => {
    const c = clone(scene);
    c.traverse((o) => {
      if (!(o instanceof Mesh)) return;
      const s = o.material as MeshStandardMaterial;
      o.material = new MeshLambertMaterial({ color: s.color, map: s.map, vertexColors: s.vertexColors, alphaTest: s.alphaTest, side: s.side });
      o.frustumCulled = false;
    });
    // Skinned meshes: bounds must include the skeleton's pose (these packs author in cm under a 0.01 armature).
    c.updateMatrixWorld(true);
    const box = new Box3();
    c.traverse((o) => {
      if (o instanceof SkinnedMesh) {
        o.skeleton.update();
        o.computeBoundingBox();
        box.union(o.boundingBox!.clone().applyMatrix4(o.matrixWorld));
      } else if (o instanceof Mesh) box.expandByObject(o);
    });
    const size = box.getSize(new Vector3());
    const k = SIZE / Math.max(size.x, size.y, size.z);
    return [c, k, -box.min.y * k];
  }, [scene]);
  const { actions } = useAnimations(animations, group);
  useEffect(() => {
    if (clip) actions[clip]?.reset().play();
  }, [actions, clip]);
  return (
    <group position={position}>
      <group ref={group} position={[0, lift, 0]} scale={scale}>
        <primitive object={copy} />
      </group>
      <Html position={[0, -0.35, 1.2]} center style={{ color: "#f3efe4", font: "12px sans-serif", whiteSpace: "nowrap" }}>
        {label}
      </Html>
    </group>
  );
}

export function ModelLab() {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#1c3526" }}>
      <Canvas flat shadows camera={{ position: [4, 9, 12], fov: 50 }}>
        <color attach="background" args={["#2c4a3a"]} />
        <hemisphereLight args={["#bfe3d0", "#1c2a22", 1.1]} />
        <directionalLight position={[8, 12, 6]} intensity={1.6} color="#fff1d6" />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4, -0.01, -3]}>
          <planeGeometry args={[40, 30]} />
          <meshLambertMaterial color="#2f5a40" />
        </mesh>
        {MODELS.map((m, i) => (
          <Suspense key={m.url} fallback={null}>
            <Specimen {...m} position={[(i % COLUMNS) * SPACING - 4, 0, -Math.floor(i / COLUMNS) * SPACING]} />
          </Suspense>
        ))}
        <OrbitControls target={[4, 1, -4]} />
      </Canvas>
    </div>
  );
}
