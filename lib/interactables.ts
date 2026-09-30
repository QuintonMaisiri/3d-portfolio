import { Vector3 } from "three";

/** How the adventurer reacts when using something: stoop to pick it up, or just face it. */
export type InteractAction = "pickup" | "look" | "strike" | "sit";

/** Where to sit (world): the adventurer is placed here facing `facing`, lowered by `drop` onto the seat. */
export interface Seat {
  position: Vector3;
  facing: number;
  drop: number;
}

export interface InteractableDef {
  id: string;
  /** World position of the thing (its hit area and prompt anchor). */
  position: Vector3;
  /** Within this distance (ground plane) the prompt shows and E uses it. */
  radius: number;
  /** Verb phrase for the prompt, e.g. "Read the tablet". */
  prompt: string;
  action: InteractAction;
  /**
   * What using it does (after the adventurer's action plays): writes its
   * pages and returns the Codex page to open, and whether anything was new
   * (then the world's reaction plays before the Codex opens).
   */
  use: () => { open: string | null; fresh: boolean };
  /**
   * Found by stepping close rather than pressing E: while `pending()` (it
   * still holds an unwritten page) walking within `stepRadius` writes its
   * pages at once, without stopping the adventurer; a note confirms it.
   */
  step?: { radius: number; pending: () => boolean; note: string };
  /** For `action: "sit"`: the seat. */
  seat?: Seat;
}

const registry = new Map<string, InteractableDef>();

export const registerInteractable = (def: InteractableDef) => {
  registry.set(def.id, def);
  return () => {
    if (registry.get(def.id) === def) registry.delete(def.id);
  };
};

export const getInteractable = (id: string) => registry.get(id);

/**
 * The interaction in progress, shared by the system, player and camera.
 * Mutable, read in frame loops.
 */
export const interaction = {
  /** Nearest usable thing, if any. */
  focused: null as InteractableDef | null,
  /** Clicked from afar: walk there, then use it. */
  pending: null as string | null,
  /** Being used: the adventurer turns and acts, then `use` runs. */
  active: null as InteractableDef | null,
  /** Seconds left of the current phase: the adventurer's action, then the world's reaction. */
  remaining: 0,
  /** "act": the adventurer acts, then `use` runs; "reveal": the world reacts (a chest opens), then the Codex opens. */
  phase: "act" as "act" | "reveal",
  /** The Codex page to open when the reveal ends. */
  opening: null as string | null,
  /** Camera framing point while something is being used (cleared when the Codex closes). */
  shot: null as Vector3 | null,
};

/** The usable thing nearest the adventurer, preferring what they're facing. */
export function nearestInteractable(p: Vector3, heading: number) {
  let best: InteractableDef | null = null;
  let bestScore = Infinity;
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  for (const def of registry.values()) {
    const dx = def.position.x - p.x;
    const dz = def.position.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d > def.radius) continue;
    // Things in front count as up to a third closer.
    const facing = d > 1e-3 ? (dx * fx + dz * fz) / d : 1;
    const score = d * (1 - 0.33 * Math.max(0, facing));
    if (score < bestScore) {
      bestScore = score;
      best = def;
    }
  }
  return best;
}

/** Calls `found` for every step-triggered thing the adventurer is standing within reach of that still holds an unwritten page. */
export function stepTriggers(found: (def: InteractableDef) => void) {
  for (const def of registry.values()) {
    if (!def.step || !def.step.pending()) continue;
    if (Math.hypot(def.position.x - stepFrom.x, def.position.z - stepFrom.z) <= def.step.radius) found(def);
  }
}

/** Where step triggers are measured from (the adventurer's feet); set by the interaction system. */
export const stepFrom = new Vector3();
