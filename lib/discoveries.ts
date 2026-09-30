import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { codexPages } from "@/content/codex";
import type { RegionId } from "./types";

const ALWAYS = codexPages.filter((p) => p.always).map((p) => p.id);

interface DiscoveryState {
  /** Codex pages found (page ids), in the order they were found. */
  found: string[];
  /** Regions the adventurer has set foot in. */
  visited: RegionId[];
  /** Pages found this visit and not yet read in the Codex: they get the ink-writing reveal and a badge. */
  unread: string[];

  discover: (ids: readonly string[]) => string[];
  visit: (id: RegionId) => void;
  markRead: (id: string) => void;
  /** Forget everything (from the Codex's settings), keeping the always-written pages. */
  reset: () => void;
}

/**
 * What the visitor has discovered, kept in their browser so the Codex is
 * still theirs when they come back. Not rehydrated on the server: call
 * `useDiscoveries.persist.rehydrate()` once on the client.
 */
export const useDiscoveries = create<DiscoveryState>()(
  persist(
    (set, get) => ({
      found: [...ALWAYS],
      visited: [],
      unread: [],

      discover: (ids) => {
        const fresh = ids.filter((id) => !get().found.includes(id));
        if (fresh.length) set((s) => ({ found: [...s.found, ...fresh], unread: [...s.unread, ...fresh] }));
        return fresh;
      },
      visit: (id) => {
        if (!get().visited.includes(id)) set((s) => ({ visited: [...s.visited, id] }));
      },
      markRead: (id) => {
        if (get().unread.includes(id)) set((s) => ({ unread: s.unread.filter((u) => u !== id) }));
      },
      reset: () => set({ found: [...ALWAYS], visited: [], unread: [] }),
    }),
    {
      name: "codex:discoveries",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ found: s.found, visited: s.visited }),
      // Pages added to the site later that are always written, and ids that no longer exist.
      merge: (saved, current) => {
        const known = new Set(codexPages.map((p) => p.id));
        const s = (saved ?? {}) as Partial<DiscoveryState>;
        const found = [...new Set([...ALWAYS, ...(s.found ?? []).filter((id) => known.has(id))])];
        return { ...current, found, visited: s.visited ?? [] };
      },
    },
  ),
);

/** Non-reactive check for frame loops. */
export const isFound = (id: string) => useDiscoveries.getState().found.includes(id);
