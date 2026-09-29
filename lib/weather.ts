/**
 * Transient weather shared between a region and the global atmosphere.
 * A region sets `flash` to 1 on a lightning strike; the Atmosphere brightens
 * sky and light by it and decays it back to 0 every frame, so a flash can
 * never get stuck on when the region that caused it stops rendering.
 */
export const weather = {
  flash: 0,
};

/** How fast a flash fades, per second. */
export const FLASH_DECAY = 5;
