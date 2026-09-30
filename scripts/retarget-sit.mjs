// Retargets the Mixamo "Sitting Idle" clip onto the adventurer's rig, writing
// the rotation tracks to assets-inbox/_work/character/sit-clip.json, which
// `npm run models -- character` then bakes into adventurer.glb as "Sit".
//
//   node scripts/retarget-sit.mjs
//
// Needs: assets-inbox/Sitting Idle.fbx (Mixamo, FBX, without skin) and the
// unconverted character at assets-inbox/_work/character/adventurer.glb.
//
// The two rigs orient their bones differently at rest, so rotations can't be
// copied across. For each frame, each mapped bone gets the source bone's
// change from its rest pose, applied in world space on top of the target's
// rest pose:  targetWorld = sourceWorld(t) * inverse(sourceWorldRest) * targetWorldRest
// then converted to a local rotation under the target's (already posed) parent.
import { readFileSync, writeFileSync } from "node:fs";
import { AnimationMixer, Quaternion } from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const toArrayBuffer = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
const FPS = 30;

/** Adventurer bone (three's sanitised name) -> Mixamo bone. The feet are IK targets on this rig, so they're left out. */
const NAMES = {
  Hips: "mixamorigHips",
  Abdomen: "mixamorigSpine",
  Torso: "mixamorigSpine2",
  Neck: "mixamorigNeck",
  Head: "mixamorigHead",
  ShoulderL: "mixamorigLeftShoulder",
  UpperArmL: "mixamorigLeftArm",
  LowerArmL: "mixamorigLeftForeArm",
  FistL: "mixamorigLeftHand",
  ShoulderR: "mixamorigRightShoulder",
  UpperArmR: "mixamorigRightArm",
  LowerArmR: "mixamorigRightForeArm",
  FistR: "mixamorigRightHand",
  UpperLegL: "mixamorigLeftUpLeg",
  LowerLegL: "mixamorigLeftLeg",
  UpperLegR: "mixamorigRightUpLeg",
  LowerLegR: "mixamorigRightLeg",
};

const fbx = new FBXLoader().parse(toArrayBuffer(readFileSync("assets-inbox/Sitting Idle.fbx")), "");
const clip = fbx.animations[0];
const gltf = await new Promise((resolve, reject) =>
  new GLTFLoader().parse(toArrayBuffer(readFileSync("assets-inbox/_work/character/adventurer.glb")), "", resolve, reject),
);

const source = {};
fbx.traverse((o) => {
  if (o.isBone) source[o.name] = o;
});
const target = {};
const order = [];
gltf.scene.traverse((o) => {
  if (o.isBone) {
    target[o.name] = o;
    // Parents before children (traverse is depth-first from the root).
    if (NAMES[o.name]) order.push(o.name);
  }
});
for (const [t, s] of Object.entries(NAMES)) {
  if (!target[t]) throw new Error(`Adventurer has no bone ${t}`);
  if (!source[s]) throw new Error(`Mixamo clip has no bone ${s}`);
}

const worldQuat = (o) => {
  o.updateWorldMatrix(true, false);
  return o.getWorldQuaternion(new Quaternion());
};

// Rest poses: the target as loaded (bind pose); the source before the clip is applied.
gltf.scene.updateMatrixWorld(true);
fbx.updateMatrixWorld(true);
const targetRest = Object.fromEntries(order.map((t) => [t, worldQuat(target[t])]));
const targetRestLocal = Object.fromEntries(order.map((t) => [t, target[t].quaternion.clone()]));
const sourceRestInv = Object.fromEntries(order.map((t) => [t, worldQuat(source[NAMES[t]]).invert()]));

const mixer = new AnimationMixer(fbx);
mixer.clipAction(clip).play();
const frames = Math.max(2, Math.round(clip.duration * FPS) + 1);
const tracks = Object.fromEntries(order.map((t) => [t, { bone: t, times: [], values: [] }]));

const desired = new Quaternion();
const parentWorld = new Quaternion();
for (let f = 0; f < frames; f++) {
  const time = Math.min(clip.duration, f / FPS);
  mixer.setTime(time);
  fbx.updateMatrixWorld(true);
  // Reset the target to rest, then pose mapped bones parent-first.
  for (const t of order) target[t].quaternion.copy(targetRestLocal[t]);
  gltf.scene.updateMatrixWorld(true);
  for (const t of order) {
    const bone = target[t];
    desired.copy(worldQuat(source[NAMES[t]])).multiply(sourceRestInv[t]).multiply(targetRest[t]);
    bone.parent.updateWorldMatrix(true, false);
    bone.parent.getWorldQuaternion(parentWorld);
    bone.quaternion.copy(parentWorld.invert().multiply(desired));
    bone.updateMatrixWorld(true);
    tracks[t].times.push(time);
    tracks[t].values.push(bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w);
  }
}

writeFileSync(
  "assets-inbox/_work/character/sit-clip.json",
  JSON.stringify({ name: "Sit", duration: clip.duration, tracks: Object.values(tracks) }),
);
console.log(`Sit: ${order.length} tracks, ${frames} frames, ${clip.duration.toFixed(2)} s`);
