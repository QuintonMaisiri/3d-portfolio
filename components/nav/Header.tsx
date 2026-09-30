"use client";

import { regionById } from "@/lib/regions";
import { useCodex } from "@/lib/store";

const pill =
  "pointer-events-auto whitespace-nowrap rounded-full bg-[#121318]/85 px-4 py-2 text-sm text-[#f3efe4] backdrop-blur-md focus-visible:ring-2 focus-visible:ring-[#f3efe4] focus-visible:outline-none focus-visible:ring-inset";

export function Header() {
  const viewMode = useCodex((s) => s.viewMode);
  const webgl = useCodex((s) => s.webgl);
  const active = useCodex((s) => s.activeRegion);
  const setViewMode = useCodex((s) => s.setViewMode);
  const page = viewMode === "page";

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-3 p-4 sm:px-8">
      <a href="#highlands" className={`${pill} font-display font-semibold`}>
        <span className="sm:hidden">Codex</span>
        <span className="hidden sm:inline">The Adventurer&apos;s Codex</span>
        <span className="hidden font-sans font-normal text-[#cbc5b6] md:inline">
          {" "}
          &middot; {regionById[active].name}
        </span>
      </a>
      {webgl === "unsupported" ? (
        <p className={pill}>3D view unavailable on this device</p>
      ) : (
        <button
          type="button"
          onClick={() => setViewMode(page ? "explore" : "page", { persist: true })}
          className={`${pill} font-medium hover:bg-[#121318]`}
        >
          {page ? "Enter the world" : "Read as a page"}
        </button>
      )}
    </header>
  );
}
