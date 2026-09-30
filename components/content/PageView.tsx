"use client";

import { useEffect } from "react";
import { isRegionId, regions } from "@/lib/regions";
import { useCodex } from "@/lib/store";
import { Credits } from "./Credits";
import { sectionContent } from "./sections";
import { headingId } from "./ui";

/** "Read as a page": the same section content as a conventional one-page portfolio. */
export function PageView() {
  const setActiveRegion = useCodex((s) => s.setActiveRegion);

  // The section crossing the middle of the viewport is the current one.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && isRegionId(entry.target.id)) setActiveRegion(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -55% 0px" },
    );
    for (const region of regions) {
      const el = document.getElementById(region.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [setActiveRegion]);

  return (
    <main id="main" className="theme-page min-h-screen bg-[#f7f3ea] text-ink">
      <div className="mx-auto max-w-[40rem] px-6 pt-28 pb-24 sm:pr-16">
        {regions.map((region) => {
          const Content = sectionContent[region.id];
          return (
            <section
              key={region.id}
              id={region.id}
              aria-labelledby={headingId(region)}
              className="scroll-mt-24 border-b border-line py-14 first:pt-0 last:border-b-0"
            >
              <Content region={region} variant="page" />
            </section>
          );
        })}
        <Credits />
      </div>
    </main>
  );
}
