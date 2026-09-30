"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3, type PerspectiveCamera } from "three";
import { cameraLookAt, orbit } from "@/lib/cameraState";
import { insideCollider } from "@/lib/colliders";
import { input } from "@/lib/input";
import { interaction } from "@/lib/interactables";
import { damp, easeOutCubic } from "@/lib/journey";
import { narrative } from "@/lib/narrative";
import { player } from "@/lib/player";
import { useCodex } from "@/lib/store";
import { groundHeight } from "@/lib/terrain";

/** Look height above the adventurer's feet (about the shoulders). */
const FOCUS_HEIGHT = 1.55;
const PITCH = [0.02, 1.15] as const;
const DISTANCE = [3, 14] as const;
/** Radians per pixel dragged. */
const LOOK_SPEED = { yaw: 0.006, pitch: 0.004 };
/** After a manual look, the camera leaves the angle alone for this long. */
const HANDS_OFF_MS = 1800;
/** The camera never gets closer to the ground, or to a prop, than this. */
const CLEARANCE = 0.35;
/** How far the opening shot starts pulled out and raised. */
const INTRO = { distance: 1.6, pitch: 0.35 };
const FOV = 55;
/** Portrait screens see less to the sides, so the arm reaches further back. */
const PORTRAIT_REACH = 1.35;

/** Using something: how far the look point moves toward it, and how much closer the camera comes. */
const SHOT = { toward: 0.45, closer: 0.7 };

const focus = new Vector3();
const shotFocus = new Vector3();
const arm = new Vector3();
const probe = new Vector3();

const angleTo = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/**
 * Third-person camera on a spring arm behind the adventurer. Drag to orbit,
 * wheel or pinch to zoom. The arm shortens instantly when a prop or the
 * ground would come between it and the adventurer, and lengthens back slowly.
 * While the adventurer walks and the visitor isn't steering the view, it
 * swings gently round behind them.
 */
export function FollowCamera() {
  const length = useRef(orbit.distance);

  useFrame(({ camera }, delta) => {
    const dt = Math.min(delta, 0.05);
    const reduced = useCodex.getState().reducedMotion;
    const cam = camera as PerspectiveCamera;
    if (cam.fov !== FOV) {
      cam.fov = FOV;
      cam.updateProjectionMatrix();
    }

    // Visitor input.
    orbit.yaw -= input.lookX * LOOK_SPEED.yaw;
    orbit.pitch = Math.min(PITCH[1], Math.max(PITCH[0], orbit.pitch + input.lookY * LOOK_SPEED.pitch));
    orbit.distance = Math.min(DISTANCE[1], Math.max(DISTANCE[0], orbit.distance + input.zoom));
    input.lookX = input.lookY = input.zoom = 0;

    // Walking and hands off: ease round behind the adventurer, unless they're
    // walking towards the camera (backing up shouldn't spin the view).
    const handsOff = performance.now() - input.lastLook > HANDS_OFF_MS;
    if (handsOff && player.speed > 0.8 && !reduced) {
      const behind = player.heading + Math.PI;
      const turn = angleTo(orbit.yaw, behind);
      if (Math.abs(turn) < 1.9) orbit.yaw += turn * (1 - Math.exp(-1.1 * dt));
    }

    // Follow the adventurer (snap on spawn or fast travel).
    const snap = player.teleported;
    const followRate = reduced ? 30 : 10;
    const target = probe.copy(player.position).setY(player.position.y + FOCUS_HEIGHT);
    if (interaction.shot) target.lerp(shotFocus.copy(interaction.shot), SHOT.toward);
    if (snap) focus.copy(target);
    else {
      focus.x = damp(focus.x, target.x, followRate, dt);
      focus.y = damp(focus.y, target.y, followRate, dt);
      focus.z = damp(focus.z, target.z, followRate, dt);
    }

    // Opening: pulled out and up through the fog, settling behind the adventurer.
    const opening = 1 - easeOutCubic(narrative.intro);
    const pitch = Math.min(PITCH[1], orbit.pitch + INTRO.pitch * opening);
    const reach = cam.aspect < 1 ? PORTRAIT_REACH : 1;
    const wanted = orbit.distance * reach * (1 + INTRO.distance * opening) * (interaction.shot ? SHOT.closer : 1);
    arm.set(Math.sin(orbit.yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(orbit.yaw) * Math.cos(pitch));

    // Spring arm: walk out from the focus until something is in the way.
    let allowed = wanted;
    for (let t = 0.6; t <= wanted; t += 0.25) {
      probe.copy(focus).addScaledVector(arm, t);
      if (probe.y < groundHeight(probe.x, probe.z) + CLEARANCE || insideCollider(probe, CLEARANCE)) {
        allowed = Math.max(0.8, t - 0.3);
        break;
      }
    }
    length.current = snap || allowed < length.current ? allowed : damp(length.current, allowed, 3, dt);

    camera.position.copy(focus).addScaledVector(arm, length.current);
    const floor = groundHeight(camera.position.x, camera.position.z) + CLEARANCE;
    if (camera.position.y < floor) camera.position.y = floor;
    camera.lookAt(focus);
    cameraLookAt.copy(focus);
    player.teleported = false;
  });

  return null;
}
