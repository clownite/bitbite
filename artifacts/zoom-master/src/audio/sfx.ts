/** Short square-wave taps, on the same clock as the music. */

import { playNotes } from "./chiptune";

const KEY = "zoom-sfx-muted";

let off = false;
try { off = localStorage.getItem(KEY) === "1"; } catch { /**/ }

export function clicksEnabled(): boolean {
  return !off;
}

export function setClicksEnabled(next: boolean) {
  off = !next;
  try { localStorage.setItem(KEY, off ? "1" : "0"); } catch { /**/ }
}

/** The rising Game Boy "yes": a short note, then a higher one. Silent when clicks are off. */
export function playClick() {
  if (off) return;
  playNotes([
    { freq: 784, at: 0, dur: 0.04, gain: 0.07 },
    { freq: 1174, at: 0.046, dur: 0.07, gain: 0.06 },
  ]);
}

/** A cookie caught in the game. Silent when clicks are off. */
export function playBite() {
  if (off) return;
  playNotes([
    { freq: 660, at: 0, dur: 0.05, gain: 0.05 },
    { freq: 880, at: 0.05, dur: 0.09, gain: 0.05 },
  ]);
}

/** A cookie that hit the floor. Silent when clicks are off. */
export function playMiss() {
  if (off) return;
  playNotes([{ freq: 180, at: 0, dur: 0.12, gain: 0.045 }]);
}

/** Coins landing. This stays on even when clicks are off. */
export function playClaim() {
  playNotes([
    { freq: 523, at: 0, dur: 0.08, gain: 0.06 },
    { freq: 659, at: 0.07, dur: 0.08, gain: 0.06 },
    { freq: 784, at: 0.14, dur: 0.1, gain: 0.055 },
    { freq: 1046, at: 0.22, dur: 0.16, gain: 0.05 },
  ]);
}
