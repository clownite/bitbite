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

/** A tiny press, like a Game Boy button. Silent when clicks are off. */
export function playClick() {
  if (off) return;
  playNotes([{ freq: 880, at: 0, dur: 0.04, gain: 0.05 }]);
}

export type ClickStyle = "tick" | "pop" | "cursor" | "ok";

/** Original square-wave clicks in the Game Boy family. The preview always plays. */
const CLICKS: Record<ClickStyle, { freq: number; at: number; dur: number; gain: number }[]> = {
  tick: [{ freq: 1046, at: 0, dur: 0.026, gain: 0.08 }],
  pop: [
    { freq: 1720, at: 0, dur: 0.014, gain: 0.07 },
    { freq: 860, at: 0.014, dur: 0.02, gain: 0.06 },
    { freq: 430, at: 0.03, dur: 0.016, gain: 0.045 },
  ],
  cursor: [
    { freq: 1318, at: 0, dur: 0.02, gain: 0.07 },
    { freq: 988, at: 0.03, dur: 0.024, gain: 0.06 },
  ],
  ok: [
    { freq: 784, at: 0, dur: 0.04, gain: 0.07 },
    { freq: 1174, at: 0.046, dur: 0.07, gain: 0.06 },
  ],
};

export function playClickStyle(style: ClickStyle) {
  playNotes(CLICKS[style]);
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
