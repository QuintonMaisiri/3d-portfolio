import { useSyncExternalStore } from "react";
import { markCollidersDirty } from "./colliders";
import { REGION_COUNT } from "./regions";
import { journey } from "./timeline";

/**
 * Region streaming: a region's scenery is only built while the camera is
 * within MOUNT_WITHIN regions of it, and freed once it's beyond
 * UNMOUNT_BEYOND (the gap stops it flickering in and out at the boundary).
 * Its models load, and its grass and props are generated, as you approach.
 */
const MOUNT_WITHIN = 2.1;
const UNMOUNT_BEYOND = 2.8;

const mounted = Array.from({ length: REGION_COUNT }, (_, i) => Math.abs(journey.position - i) < MOUNT_WITHIN);
const listeners = new Set<() => void>();

/** Shader compilation wanted (new scenery mounted), picked up by the canvas. */
export const shaderCompile = { requested: false };

/**
 * Updates which regions are built for this journey position. Directors call
 * it every frame; the explore director also calls it (quietly) during its
 * first render, so a deep link builds the right regions from the start.
 */
export function updateStreaming(position: number, notify = true) {
  let changed = false;
  for (let i = 0; i < REGION_COUNT; i++) {
    const d = Math.abs(position - i);
    const next = mounted[i] ? d <= UNMOUNT_BEYOND : d < MOUNT_WITHIN;
    if (next !== mounted[i]) {
      mounted[i] = next;
      changed = true;
    }
  }
  if (changed && notify) {
    markCollidersDirty();
    listeners.forEach((l) => l());
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

/** Whether region `index`'s scenery is currently built. */
export const useRegionMounted = (index: number) =>
  useSyncExternalStore(
    subscribe,
    () => mounted[index]!,
    () => true,
  );
