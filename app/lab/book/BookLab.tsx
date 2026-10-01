"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { BookScene } from "@/components/codex/BookScene";

export function BookLab({ p, narrow }: { p: number; narrow: boolean }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#2b2f33" }}>
      <p className="font-display" style={{ position: "absolute", opacity: 0 }}>
        font probe
      </p>
      <Canvas flat dpr={[1, 2]} camera={{ fov: 28, position: [0, 0, 6] }}>
        <Suspense fallback={null}>
          <BookScene
            phase="opening"
            turnId={0}
            narrow={narrow}
            title="The Adventurer's Codex"
            author="Quinton Tinotenda Maisiri"
            scrub={p}
            onOpened={() => {}}
            onClosed={() => {}}
            onTurn={() => {}}
            onLayout={() => {}}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
