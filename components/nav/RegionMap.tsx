"use client";

import { regions } from "@/lib/regions";
import { useCodex } from "@/lib/store";

/** Compact map of all eight regions: shows where you are and jumps anywhere. */
export function RegionMap() {
  const active = useCodex((s) => s.activeRegion);

  return (
    <nav aria-label="Region map" className="fixed top-1/2 right-2 z-30 -translate-y-1/2 sm:right-4">
      <ol className="flex flex-col gap-0.5 rounded-full bg-[#121318]/85 p-1 backdrop-blur-md">
        {regions.map((region) => {
          const current = region.id === active;
          return (
            <li key={region.id}>
              <a
                href={`#${region.id}`}
                aria-current={current ? "location" : undefined}
                className="group relative flex h-8 w-8 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-[#f3efe4] focus-visible:outline-none focus-visible:ring-inset"
              >
                <span
                  aria-hidden="true"
                  className={`h-2.5 w-2.5 rounded-full transition-transform motion-reduce:transition-none ${current ? "scale-150" : "bg-[#f3efe4]/60"}`}
                  style={current ? { background: region.palette.accent } : undefined}
                />
                <span className="pointer-events-none absolute right-full mr-3 rounded-md bg-black/85 px-3 py-1.5 text-right whitespace-nowrap text-[#f3efe4] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
                  <span className="block text-sm font-semibold">{region.section}</span>
                  <span className="block text-xs text-[#cbc5b6]">{region.name}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
