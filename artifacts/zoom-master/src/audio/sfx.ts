/** Short square-wave taps, on their own clock beside the song. */

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
const BITE_SET: Note[][] = [
  [
    { freq: 660, at: 0, dur: 0.05, gain: 0.05 },
    { freq: 880, at: 0.05, dur: 0.09, gain: 0.05 },
  ],
  [
    { freq: 523, at: 0, dur: 0.04, gain: 0.05 },
    { freq: 784, at: 0.045, dur: 0.08, gain: 0.048 },
  ],
  [
    { freq: 740, at: 0, dur: 0.04, gain: 0.05 },
    { freq: 988, at: 0.04, dur: 0.05, gain: 0.046 },
    { freq: 1174, at: 0.1, dur: 0.08, gain: 0.04 },
  ],
];

export function playBite() {
  if (off) return;
  playNotes(pick(BITE_SET));
}

/** A cookie that hit the floor. Silent when clicks are off. */
export function playMiss() {
  if (off) return;
  playNotes([{ freq: 180, at: 0, dur: 0.12, gain: 0.045 }]);
}

type Note = { freq: number; at: number; dur: number; gain: number };

/** Short phrases. Each call picks a different one, the way a Tamagotchi does. */
const HAPPY_SET: Note[][] = [
  [
    { freq: 523, at: 0, dur: 0.07, gain: 0.05 },
    { freq: 659, at: 0.08, dur: 0.07, gain: 0.05 },
    { freq: 784, at: 0.16, dur: 0.12, gain: 0.045 },
  ],
  [
    { freq: 659, at: 0, dur: 0.06, gain: 0.05 },
    { freq: 784, at: 0.07, dur: 0.06, gain: 0.05 },
    { freq: 1046, at: 0.14, dur: 0.08, gain: 0.045 },
    { freq: 784, at: 0.24, dur: 0.1, gain: 0.04 },
  ],
  [
    { freq: 392, at: 0, dur: 0.05, gain: 0.045 },
    { freq: 523, at: 0.06, dur: 0.05, gain: 0.048 },
    { freq: 659, at: 0.12, dur: 0.06, gain: 0.05 },
    { freq: 784, at: 0.2, dur: 0.12, gain: 0.045 },
  ],
  [
    { freq: 784, at: 0, dur: 0.05, gain: 0.045 },
    { freq: 988, at: 0.06, dur: 0.06, gain: 0.045 },
    { freq: 1174, at: 0.14, dur: 0.14, gain: 0.04 },
  ],
];

const NO_SET: Note[][] = [
  [
    { freq: 392, at: 0, dur: 0.06, gain: 0.05 },
    { freq: 262, at: 0.07, dur: 0.12, gain: 0.048 },
  ],
  [
    { freq: 220, at: 0, dur: 0.07, gain: 0.05 },
    { freq: 196, at: 0.08, dur: 0.14, gain: 0.046 },
  ],
  [
    { freq: 330, at: 0, dur: 0.05, gain: 0.05 },
    { freq: 247, at: 0.06, dur: 0.06, gain: 0.046 },
    { freq: 196, at: 0.14, dur: 0.12, gain: 0.044 },
  ],
];

const SAD_SET: Note[][] = [
  [
    { freq: 440, at: 0, dur: 0.12, gain: 0.045 },
    { freq: 349, at: 0.18, dur: 0.14, gain: 0.042 },
    { freq: 262, at: 0.36, dur: 0.2, gain: 0.04 },
  ],
  [
    { freq: 349, at: 0, dur: 0.14, gain: 0.044 },
    { freq: 330, at: 0.18, dur: 0.14, gain: 0.04 },
    { freq: 262, at: 0.36, dur: 0.22, gain: 0.038 },
  ],
  [
    { freq: 494, at: 0, dur: 0.1, gain: 0.044 },
    { freq: 440, at: 0.14, dur: 0.12, gain: 0.042 },
    { freq: 349, at: 0.3, dur: 0.14, gain: 0.04 },
    { freq: 294, at: 0.48, dur: 0.2, gain: 0.036 },
  ],
  [
    { freq: 311, at: 0, dur: 0.16, gain: 0.042 },
    { freq: 277, at: 0.2, dur: 0.16, gain: 0.04 },
    { freq: 233, at: 0.4, dur: 0.24, gain: 0.036 },
  ],
];

function pick(list: Note[][]): Note[] {
  return list[Math.floor(Math.random() * list.length)];
}

/** Four notes. Something is finished. */
const DONE: Note[] = [
  { freq: 523, at: 0, dur: 0.08, gain: 0.05 },
  { freq: 659, at: 0.1, dur: 0.08, gain: 0.048 },
  { freq: 784, at: 0.2, dur: 0.09, gain: 0.046 },
  { freq: 988, at: 0.31, dur: 0.16, gain: 0.042 },
];

function later(notes: Note[], wait: number): Note[] {
  if (wait <= 0) return notes;
  return notes.map((note) => ({ ...note, at: note.at + wait }));
}

function voice(notes: Note[]) {
  if (off) return;
  if (typeof window === "undefined") return;
  playNotes(notes);
}

/** Glad. Starts after the button click, so the two sounds stay apart. */
export function playHappy(wait = 0.28) {
  voice(later(pick(HAPPY_SET), wait));
}

/** Full, or unwilling. Starts after the button click. */
export function playNo(wait = 0.28) {
  voice(later(pick(NO_SET), wait));
}

/** Lost, hurt, or ill. */
export function playSad(wait = 0.28) {
  voice(later(pick(SAD_SET), wait));
}

/** A finished game. */
export function playDone(wait = 0.4) {
  voice(later(DONE, wait));
}

/** A finished game that went well: the closing phrase, then the glad one. */
export function playDoneHappy(wait = 0.4) {
  voice([...later(DONE, wait), ...later(pick(HAPPY_SET), wait + 0.52)]);
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
