"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Mesh,
  MeshLambertMaterial,
  Raycaster,
  Vector2,
  Vector3,
  type AnimationAction,
  type Camera,
  type Group,
  type MeshStandardMaterial,
} from "three";
import { DRACO_PATH } from "@/lib/assets";
import { orbit } from "@/lib/cameraState";
import { resolveCircle } from "@/lib/colliders";
import { input, moveAxes } from "@/lib/input";
import { damp } from "@/lib/journey";
import { clampToValley, PLAYER, player, spawnPoint } from "@/lib/player";
import { useCodex } from "@/lib/store";
import { groundHeight } from "@/lib/terrain";

const URL = "/models/character/adventurer.glb";

type Clip = "Idle" | "Walk" | "Run";
/** Crossfade between clips, seconds. */
const FADE = 0.22;
/** Ground speed at which each clip's feet match the ground (tuned by eye). */
const CLIP_PACE = { Walk: 3.1, Run: 6.6 } as const;
/** Below this the adventurer stands; above RUN_FROM they run. */
const WALK_FROM = 0.25;
const RUN_FROM = 5;
/** A click-to-walk that makes no progress for this long (blocked) is given up. */
const STUCK_SECONDS = 0.6;

const raycaster = new Raycaster();
const ndc = new Vector2();
const step = new Vector3();
const desired = new Vector3();
const previous = new Vector3();

/** Where a screen point's ray meets the ground (the terrain is a heightfield, so march along the ray). */
function groundUnder(x: number, y: number, camera: Camera): Vector3 | null {
  raycaster.setFromCamera(ndc.set(x, y), camera);
  const { origin, direction } = raycaster.ray;
  let lo = 0;
  for (let t = 0.5; t < 160; t += 0.5) {
    step.copy(origin).addScaledVector(direction, t);
    if (step.y <= groundHeight(step.x, step.z)) {
      // Refine between the last point above ground and this one.
      let hi = t;
      for (let k = 0; k < 8; k++) {
        const mid = (lo + hi) / 2;
        step.copy(origin).addScaledVector(direction, mid);
        if (step.y <= groundHeight(step.x, step.z)) hi = mid;
        else lo = mid;
      }
      return step.clone();
    }
    lo = t;
  }
  return null;
}

/** Shortest signed angle from a to b. */
const angleTo = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

/**
 * Moves the adventurer: relative to the camera with WASD or arrows, running
 * with Shift, or to a clicked or tapped spot; kept on the valley floor and
 * out of props. Always mounted (the model loads separately) and placed
 * before the camera, so the camera follows this frame's position.
 */
export function PlayerController() {
  const stuck = useRef(0);

  useFrame(({ camera }, delta) => {
    // Capped so a long stall (tab switch, shader compile) can't fling the adventurer through a prop.
    const dt = Math.min(delta, 0.1);
    const store = useCodex.getState();

    // Fast travel from the region map (or entering the world at a region).
    if (store.travelRequest) {
      spawnPoint(store.travelRequest, player.position);
      player.velocity.set(0, 0, 0);
      player.heading = Math.PI;
      player.target = null;
      player.teleported = true;
      orbit.yaw = 0;
      store.travelTo(null);
    }

    // A click or tap: walk there (or, with reduced motion, simply be there).
    if (input.tap) {
      const hit = groundUnder(input.tap.x, input.tap.y, camera);
      input.tap = null;
      if (hit) {
        clampToValley(hit);
        if (store.reducedMotion) {
          player.position.copy(hit);
          player.teleported = true;
        } else player.target = hit;
        stuck.current = 0;
        player.moved = true;
      }
    }

    // Intent: keys steer relative to the camera; otherwise head for the tapped spot.
    const axes = moveAxes();
    let speed = 0;
    desired.set(0, 0, 0);
    if (axes.x || axes.y) {
      player.target = null;
      const sin = Math.sin(orbit.yaw);
      const cos = Math.cos(orbit.yaw);
      // Forward is away from the camera; right is its right.
      desired.set(-sin * axes.y + cos * axes.x, 0, -cos * axes.y - sin * axes.x).normalize();
      speed = axes.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
      player.moved = true;
    } else if (player.target) {
      desired.subVectors(player.target, player.position).setY(0);
      const distance = desired.length();
      if (distance < 0.35) player.target = null;
      else {
        desired.divideScalar(distance);
        // Far taps are run to, near ones walked; ease off on arrival.
        speed = Math.min(distance > 14 ? PLAYER.runSpeed : PLAYER.walkSpeed, distance * 3);
      }
    }

    // Accelerate quickly, stop a little quicker still.
    const lambda = speed > 0 ? 9 : 12;
    player.velocity.x = damp(player.velocity.x, desired.x * speed, lambda, dt);
    player.velocity.z = damp(player.velocity.z, desired.z * speed, lambda, dt);

    previous.copy(player.position);
    player.position.addScaledVector(player.velocity, dt);
    // Valley edge first, then props, so a rock at the edge can't hold the adventurer inside it.
    clampToValley(player.position);
    resolveCircle(player.position, PLAYER.radius, PLAYER.height);
    player.position.y = groundHeight(player.position.x, player.position.z);

    // Speed actually made good (after collisions), which is what the feet should show.
    const moved = Math.hypot(player.position.x - previous.x, player.position.z - previous.z);
    player.speed = dt > 0 ? moved / dt : 0;
    if (player.target) {
      stuck.current = player.speed < 0.3 ? stuck.current + dt : 0;
      if (stuck.current > STUCK_SECONDS) player.target = null;
    }

    // Turn to face the way we're going.
    const planar = Math.hypot(player.velocity.x, player.velocity.z);
    if (planar > 0.3) {
      const facing = Math.atan2(player.velocity.x, player.velocity.z);
      player.heading += angleTo(player.heading, facing) * (1 - Math.exp(-12 * dt));
    }

  });

  return null;
}

/**
 * The adventurer's body (Ultimate Modular Ruins Pack character, CC0): placed
 * where the controller put them, idling, walking or running to match.
 */
export function Player() {
  const { scene, animations } = useGLTF(URL, DRACO_PATH);
  const root = useRef<Group>(null);
  const { actions } = useAnimations(animations, root);
  const current = useRef<Clip | null>(null);

  // Lambert like the rest of the world (and cheaper than PBR); skinning is automatic.
  const materials = useMemo(() => {
    const made: MeshLambertMaterial[] = [];
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const source = object.material as MeshStandardMaterial;
      const material = new MeshLambertMaterial({ color: source.color, name: source.name });
      made.push(material);
      object.material = material;
      object.castShadow = true;
      // Skinned bounds don't follow the animation; never cull the one character on screen.
      object.frustumCulled = false;
    });
    return made;
  }, [scene]);
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  const play = (clip: Clip) => {
    if (current.current === clip) return;
    const next = actions[clip] as AnimationAction | undefined;
    if (!next) return;
    next.reset().fadeIn(FADE).play();
    if (current.current) actions[current.current]?.fadeOut(FADE);
    current.current = clip;
  };

  useFrame(() => {
    const body = root.current;
    if (body) {
      body.position.copy(player.position);
      body.rotation.y = player.heading;
    }

    // Idle, walk or run, with the clip's pace matched to the ground speed.
    const clip: Clip = player.speed < WALK_FROM ? "Idle" : player.speed < RUN_FROM ? "Walk" : "Run";
    play(clip);
    if (clip !== "Idle") actions[clip]?.setEffectiveTimeScale(Math.max(0.5, player.speed / CLIP_PACE[clip]));
  });

  return (
    // Never an obstacle to itself (the hair and eyes are ordinary, unskinned meshes).
    <group ref={root} userData={{ walkThrough: true }}>
      <primitive object={scene} scale={PLAYER.scale} />
    </group>
  );
}

useGLTF.preload(URL, DRACO_PATH);
