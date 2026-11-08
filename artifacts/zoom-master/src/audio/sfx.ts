/** Short square-wave taps, in the same family as the chiptune. */

const KEY = "zoom-sfx-muted";

let off = false;
try { off = localStorage.getItem(KEY) === "1"; } catch { /**/ }

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (off) return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!ctx) ctx = new Ctx();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, at: number, dur: number, gain: number) {
  const audio = context();
  if (!audio) return;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain, audio.currentTime + at);
  amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + at + dur);
  osc.connect(amp);
  amp.connect(audio.destination);
  osc.start(audio.currentTime + at);
  osc.stop(audio.currentTime + at + dur + 0.02);
}

export function clicksEnabled(): boolean {
  return !off;
}

export function setClicksEnabled(next: boolean) {
  off = !next;
  try { localStorage.setItem(KEY, off ? "1" : "0"); } catch { /**/ }
}

/** A tiny press, like a Game Boy button. */
export function playClick() {
  tone(880, 0, 0.045, 0.035);
}

/** Coins landing. Played when Crumbs are claimed. */
export function playClaim() {
  tone(523, 0, 0.08, 0.05);
  tone(659, 0.07, 0.08, 0.05);
  tone(784, 0.14, 0.1, 0.05);
  tone(1046, 0.22, 0.16, 0.045);
}
