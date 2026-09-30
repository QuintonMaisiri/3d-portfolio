"use client";

import dynamic from "next/dynamic";
import { regions } from "@/lib/regions";

const WorldCanvas = dynamic(() => import("./WorldCanvas"), { ssr: false });

/** Fixed full-screen world behind the content. Decorative: every interaction has an HTML equivalent. */
export function WorldLayer({ enabled, mode }: { enabled: boolean; mode: "explore" | "journey" }) {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0"
      style={{ background: regions[0]?.palette.sky }}
    >
      {enabled ? <WorldCanvas mode={mode} /> : null}
    </div>
  );
}
