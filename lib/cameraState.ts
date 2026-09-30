import { Vector3 } from "three";

/**
 * Where the camera is looking this frame, written by whichever camera is
 * active (the journey's CameraRig or the explore FollowCamera). The sun and
 * its shadow box follow it.
 */
export const cameraLookAt = new Vector3();

/**
 * The explore camera's orbit around the adventurer. `yaw` 0 puts the camera
 * behind someone facing -z (down the road); `pitch` is the angle above the
 * horizon; `distance` is the spring arm's length before collisions shorten it.
 */
export const orbit = { yaw: 0, pitch: 0.3, distance: 7 };
