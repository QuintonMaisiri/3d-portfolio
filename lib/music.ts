import { create } from "zustand";

/**
 * The exploring soundtrack: one ambient track, looped. Browsers only allow
 * sound after the visitor interacts, so it starts (fading in) on their first
 * key press, click or tap in the world. Muting is remembered. It goes quiet
 * while the Codex is open and pauses while the tab is hidden.
 */
const SRC = "/audio/ambient.mp3";
const STORAGE_KEY = "codex:sound";
/** Normal volume, and while the Codex is open. */
const VOLUME = 0.42;
const DUCKED = 0.16;
/** Seconds to fade in and out. */
const FADE = 2.2;

interface MusicState {
  /** The visitor wants sound (remembered). */
  enabled: boolean;
  /** Sound is actually playing (it waits for a first interaction). */
  playing: boolean;
  toggle: () => void;
}

const readEnabled = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
};

export const useMusic = create<MusicState>()((set, get) => ({
  enabled: true,
  playing: false,
  toggle: () => {
    const enabled = !get().enabled;
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
    } catch {
      // No storage: the choice lasts for this visit.
    }
    set({ enabled });
    if (enabled) void music.start();
    else music.fadeTo(0, () => music.pause());
  },
}));

let audio: HTMLAudioElement | null = null;
let target = 0;
let raf = 0;
let ducked = false;
let onFaded: (() => void) | null = null;

function step(last: number) {
  raf = requestAnimationFrame((now) => {
    if (!audio) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    const next = audio.volume + Math.sign(target - audio.volume) * Math.min(Math.abs(target - audio.volume), (VOLUME / FADE) * dt);
    audio.volume = Math.max(0, Math.min(1, next));
    if (Math.abs(audio.volume - target) > 0.001) step(now);
    else {
      raf = 0;
      const done = onFaded;
      onFaded = null;
      done?.();
    }
  });
}

export const music = {
  /** Reads the saved choice (call once on the client). */
  init() {
    useMusic.setState({ enabled: readEnabled() });
  },
  /** Starts (or resumes) playback with a fade in, if the visitor wants sound. Must follow a user gesture the first time. */
  async start() {
    if (!useMusic.getState().enabled || document.hidden) return;
    if (!audio) {
      audio = new Audio(SRC);
      audio.loop = true;
      audio.preload = "auto";
      audio.volume = 0;
    }
    try {
      await audio.play();
      useMusic.setState({ playing: true });
      this.fadeTo(ducked ? DUCKED : VOLUME);
    } catch {
      // Blocked (no gesture yet) or unavailable: try again on the next interaction.
    }
  },
  pause() {
    audio?.pause();
    useMusic.setState({ playing: false });
  },
  fadeTo(volume: number, done?: () => void) {
    target = volume;
    onFaded = done ?? null;
    if (!audio) return done?.();
    if (!raf) step(performance.now());
  },
  /** Quieter while something (the Codex) is open over the world. */
  duck(on: boolean) {
    ducked = on;
    if (audio && !audio.paused) this.fadeTo(on ? DUCKED : VOLUME);
  },
  /** Stops for good (leaving the world for the page view). */
  stop() {
    this.fadeTo(0, () => this.pause());
  },
};
