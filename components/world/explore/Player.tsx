"use client";

import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  LoopOnce,
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
import { interaction } from "@/lib/interactables";
import { input, moveAxes, pollGamepad } from "@/lib/input";
import { damp } from "@/lib/journey";
import { narration } from "@/content/narration";
import { clampToValley, PLAYER, player, spawnPoint } from "@/lib/player";
import { REGION_COUNT, regions } from "@/lib/regions";
import { gates, indexPerUnit, nearestRoad, roadPoint, travel } from "@/lib/road";
import type { RegionId } from "@/lib/types";
import { floorAt } from "@/lib/surfaces";
import { playerPush } from "@/lib/wind";
import { useCodex } from "@/lib/store";
import { groundHeight } from "@/lib/terrain";
import { withRim } from "@/lib/wind";

const URL = "/models/character/adventurer.glb";
/** Colours replacing the model's own, by material name (sRGB; three converts them). */
const LOOK: Record<string, Color> = {
  Skin: new Color("#5e3b25"),
  Hair: new Color("#17110d"),
};

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
/** Fast travel: the screen fades to black for this long before the adventurer is moved (matches the HUD's fade). */
const FADE_MS = 450;
/** Travel scenes: the adventurer's pace along the road (a jog), and how close to the road a gate counts. */
const TRAVEL_SPEED = 5.6;
const ROAD_NEAR = 6;
/** How far ahead along the road the adventurer steers, in road samples. */
const TRAVEL_LOOK_AHEAD = 8;

function startTravel(stretch: number, dir: 1 | -1, from: number, end: number) {
  travel.active = true;
  travel.dir = dir;
  travel.stretch = stretch;
  travel.index = from;
  travel.end = end;
  player.target = null;
  // Narration belongs to leaving a region onward; going back stays silent.
  useCodex.getState().setTravelCaption(dir > 0 ? (narration[regions[stretch]!.id] ?? null) : null);
}

function endTravel() {
  travel.active = false;
  useCodex.getState().setTravelCaption(null);
}

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
  const pendingTravel = useRef<{ id: RegionId; at: number } | null>(null);
  // The first placement (entering the world) happens under the opening, without a fade.
  const placed = useRef(false);

  useFrame(({ camera }, delta) => {
    // Capped so a long stall (tab switch, shader compile) can't fling the adventurer through a prop.
    const dt = Math.min(delta, 0.1);
    const store = useCodex.getState();
    // A gamepad, if one is connected (sticks feed moveAxes and the look input).
    if (pollGamepad().codex && !store.codexOpen && !store.introOpen) store.openCodex();

    // Fast travel (region map, Codex, waystones, entering the world): fade to black, move, fade back in.
    const now = performance.now();
    if (store.travelRequest) {
      const instant = store.reducedMotion || !placed.current;
      pendingTravel.current = { id: store.travelRequest, at: now + (instant ? 0 : FADE_MS) };
      if (!instant) store.setFading(true);
      store.travelTo(null);
      if (travel.active) endTravel();
    }
    if (pendingTravel.current && now >= pendingTravel.current.at) {
      spawnPoint(pendingTravel.current.id, player.position);
      pendingTravel.current = null;
      placed.current = true;
      player.velocity.set(0, 0, 0);
      player.heading = Math.PI;
      player.target = null;
      player.teleported = true;
      orbit.yaw = 0;
      travel.last = -1;
      store.setFading(false);
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

    // Seated: stay on the seat until the visitor moves or taps somewhere.
    if (player.seated) {
      const axes = moveAxes();
      if (axes.x || axes.y || player.target) player.seated = null;
      else {
        const seat = player.seated;
        player.position.x = damp(player.position.x, seat.position.x, 8, dt);
        player.position.z = damp(player.position.z, seat.position.z, 8, dt);
        player.position.y = seat.position.y;
        player.heading += angleTo(player.heading, seat.facing) * (1 - Math.exp(-8 * dt));
        player.velocity.set(0, 0, 0);
        player.speed = 0;
        playerPush.value.copy(player.position);
        return;
      }
    }

    // Travel scenes: walking out of a region through its road gate carries the
    // adventurer on along the road to the next (or back to the previous).
    const onRoad = nearestRoad(player.position.x, player.position.z, travel.last);
    if (!travel.active && !store.reducedMotion && !interaction.active && travel.last >= 0 && onRoad.distance < ROAD_NEAR) {
      for (let i = 0; i < REGION_COUNT - 1; i++) {
        const g = gates(i);
        if (travel.last < g.exit && onRoad.index >= g.exit) startTravel(i, 1, onRoad.index, g.arriveForward);
        else if (travel.last > g.back && onRoad.index <= g.back) startTravel(i, -1, onRoad.index, g.arriveBack);
      }
    }
    travel.last = onRoad.index;

    // Intent: keys steer relative to the camera; otherwise head for the tapped spot.
    // While using something the adventurer stands still and turns to it.
    const using = interaction.active;
    const axes = using ? { x: 0, y: 0, run: false } : moveAxes();
    // Turning away, stepping back, or tapping somewhere ends a travel scene: control is theirs again.
    if (travel.active && (axes.y < 0 || axes.x !== 0 || player.target)) endTravel();
    let speed = 0;
    desired.set(0, 0, 0);
    if (using) {
      player.target = null;
      const facing = Math.atan2(using.position.x - player.position.x, using.position.z - player.position.z);
      player.heading += angleTo(player.heading, facing) * (1 - Math.exp(-10 * dt));
    } else if (travel.active) {
      travel.index += travel.dir * TRAVEL_SPEED * dt * indexPerUnit;
      const ahead = roadPoint(travel.index + travel.dir * TRAVEL_LOOK_AHEAD, desired);
      desired.set(ahead.x - player.position.x, 0, ahead.z - player.position.z).normalize();
      speed = TRAVEL_SPEED;
      player.moved = true;
      if (travel.dir > 0 ? travel.index >= travel.end : travel.index <= travel.end) endTravel();
    } else if (axes.x || axes.y) {
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
    // The terrain, or a surface above it (wading in the Ruins lagoon).
    player.position.y = floorAt(player.position.x, player.position.z);

    playerPush.value.copy(player.position);

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
  const { actions, mixer } = useAnimations(animations, root);
  const current = useRef<Clip | "PickUp" | "Punch" | "Sit" | null>(null);
  // How far the body is lowered (eases down onto a seat and back up).
  const sink = useRef(0);

  // One-off actions return to idle when their clip ends.
  useEffect(() => {
    const done = () => {
      if (current.current === "PickUp" || current.current === "Punch") {
        player.action = null;
        current.current = null;
      }
    };
    mixer.addEventListener("finished", done);
    return () => mixer.removeEventListener("finished", done);
  }, [mixer]);

  // Lambert like the rest of the world (and cheaper than PBR); skinning is automatic.
  // The adventurer is Quinton: deep brown skin and black hair (the pack's model is fair and blond).
  const materials = useMemo(() => {
    const made: MeshLambertMaterial[] = [];
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const source = object.material as MeshStandardMaterial;
      const color = LOOK[source.name] ?? source.color;
      const material = Object.assign(new MeshLambertMaterial({ color, name: source.name }), withRim());
      made.push(material);
      object.material = material;
      object.castShadow = true;
      // Skinned bounds don't follow the animation; never cull the one character on screen.
      object.frustumCulled = false;
    });
    return made;
  }, [scene]);
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  const play = (clip: Clip | "PickUp" | "Punch" | "Sit") => {
    if (current.current === clip) return;
    const next = actions[clip] as AnimationAction | undefined;
    if (!next) return;
    if (clip === "PickUp" || clip === "Punch") next.setLoop(LoopOnce, 1);
    next.reset().fadeIn(FADE).play();
    if (current.current) actions[current.current]?.fadeOut(FADE);
    current.current = clip;
  };

  useFrame((_, delta) => {
    const body = root.current;
    sink.current = damp(sink.current, player.seated ? player.seated.drop : 0, 6, Math.min(delta, 0.1));
    if (body) {
      body.position.copy(player.position);
      body.position.y -= sink.current;
      body.rotation.y = player.heading;
    }
    if (player.seated) {
      play("Sit");
      return;
    }

    // A one-off action, else idle, walk or run with the clip's pace matched to the ground speed.
    if (player.action) {
      play(player.action);
      return;
    }
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
