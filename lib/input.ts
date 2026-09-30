/**
 * Explore-mode input, gathered from DOM events and read (then consumed) by the
 * player and camera each frame. Keyboard: WASD or arrows, Shift to run.
 * Pointer: drag to look, click or tap to walk there, wheel or pinch to zoom.
 */
export const input = {
  keys: new Set<string>(),
  /** Accumulated look drag since the last frame, in pixels. */
  lookX: 0,
  lookY: 0,
  /** Accumulated zoom since the last frame (positive = further out). */
  zoom: 0,
  /** A click or tap to walk to, in normalised device coordinates, until consumed. */
  tap: null as { x: number; y: number } | null,
  /** performance.now() of the last manual look, so the camera doesn't fight the visitor. */
  lastLook: -Infinity,
  /** E was pressed: use the nearest thing. Consumed by the interaction system. */
  interact: false,
};

/** Movement keys, by code (layout-independent: WASD on AZERTY is still the same physical keys). */
const MOVE = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"]);
/** Pointer travel (px) before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD = 6;

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/** Wires input to the canvas (pointer) and window (keys). Returns a cleanup function. */
export function attachInput(canvas: HTMLElement) {
  const pointers = new Map<number, { x: number; y: number; startX: number; startY: number }>();
  let pinch = 0;
  let dragged = false;

  const onKeyDown = (e: KeyboardEvent) => {
    if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === "KeyE" && !e.repeat) {
      input.interact = true;
      return;
    }
    if (!MOVE.has(e.code)) return;
    input.keys.add(e.code);
    // Arrow keys would otherwise scroll the page.
    if (e.code.startsWith("Arrow")) e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent) => input.keys.delete(e.code);
  // Releasing keys while the window is in the background never fires keyup.
  const onBlur = () => input.keys.clear();

  const onPointerDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY });
    if (pointers.size === 1) dragged = false;
    if (pointers.size === 2) pinch = spread();
  };
  const onPointerMove = (e: PointerEvent) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    if (pointers.size === 2) {
      const now = spread();
      input.zoom += (pinch - now) * 0.02;
      pinch = now;
      dragged = true;
    } else {
      if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > DRAG_THRESHOLD) dragged = true;
      if (dragged) {
        input.lookX += e.clientX - p.x;
        input.lookY += e.clientY - p.y;
        input.lastLook = performance.now();
      }
    }
    p.x = e.clientX;
    p.y = e.clientY;
  };
  const onPointerUp = (e: PointerEvent) => {
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (!p || dragged || pointers.size > 0 || e.button > 0) return;
    const rect = canvas.getBoundingClientRect();
    input.tap = { x: ((e.clientX - rect.left) / rect.width) * 2 - 1, y: -((e.clientY - rect.top) / rect.height) * 2 + 1 };
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    input.zoom += Math.sign(e.deltaY) * Math.min(1.5, Math.abs(e.deltaY) / 60);
  };
  const spread = () => {
    const [a, b] = [...pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const noMenu = (e: Event) => e.preventDefault();

  // Touch drags look around instead of scrolling or zooming the page.
  canvas.style.touchAction = "none";
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", noMenu);
  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerUp);
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("contextmenu", noMenu);
    input.keys.clear();
  };
}

/** Movement intent from the keyboard: x = strafe (right +), y = forward (+), each -1..1. */
/** Gamepad stick state, refreshed by pollGamepad() each frame. */
const pad = { x: 0, y: 0, run: false, buttons: [] as boolean[] };
/** Stick travel ignored around the centre (worn sticks drift). */
const DEADZONE = 0.18;
/** Right stick look speed, in pixels of drag per frame at full tilt (matches mouse-drag feel). */
const PAD_LOOK = 14;
const dead = (v: number) => (Math.abs(v) < DEADZONE ? 0 : (v - Math.sign(v) * DEADZONE) / (1 - DEADZONE));

/**
 * Reads the first connected gamepad (standard mapping): left stick walks,
 * right stick looks, A uses, Y or Start opens the Codex, RT or LB runs.
 * Returns true when the Codex button was just pressed. Call once per frame.
 */
export function pollGamepad(): { codex: boolean } {
  const gp = typeof navigator !== "undefined" && navigator.getGamepads ? [...navigator.getGamepads()].find((g) => g?.connected) : null;
  if (!gp) {
    pad.x = pad.y = 0;
    pad.run = false;
    return { codex: false };
  }
  const pressed = gp.buttons.map((b) => b.pressed);
  const edge = (i: number) => !!pressed[i] && !pad.buttons[i];
  pad.x = dead(gp.axes[0] ?? 0);
  pad.y = -dead(gp.axes[1] ?? 0);
  pad.run = !!pressed[7] || !!pressed[4];
  const lx = dead(gp.axes[2] ?? 0);
  const ly = dead(gp.axes[3] ?? 0);
  if (lx || ly) {
    input.lookX += lx * PAD_LOOK;
    input.lookY += ly * PAD_LOOK;
    input.lastLook = performance.now();
  }
  if (edge(0)) input.interact = true;
  const codex = edge(3) || edge(9);
  pad.buttons = pressed;
  return { codex };
}

/** Movement intent from the keyboard or gamepad: x = strafe (right +), y = forward (+), each -1..1. */
export function moveAxes() {
  const k = input.keys;
  const kx = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
  const ky = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
  const x = kx || pad.x;
  const y = ky || pad.y;
  return { x, y, run: k.has("ShiftLeft") || k.has("ShiftRight") || pad.run };
}
