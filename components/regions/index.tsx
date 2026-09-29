"use client";

import { Archive } from "./Archive";
import { Campfire } from "./Campfire";
import { Caves } from "./Caves";
import { Forest } from "./Forest";
import { Forge } from "./Forge";
import { Highlands } from "./Highlands";
import { Peaks } from "./Peaks";
import { Ruins } from "./Ruins";

/** Every region's scenery. Each hides itself when the camera is far away. */
export function Regions() {
  return (
    <>
      <Highlands />
      <Archive />
      <Forge />
      <Forest />
      <Peaks />
      <Ruins />
      <Caves />
      <Campfire />
    </>
  );
}
