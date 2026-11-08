/** A quiet square-and-triangle loop, the way a Game Boy keeps a theme under the game. */

let ctx: AudioContext | null = null;
let music: GainNode | null = null;
let sfx: GainNode | null = null;
let nextAt = 0;
let step = 0;
let timer = 0;
let muted = false;

const LEAD = [72, 76, 79, 76, 72, 67, 69, 72, 76, 79, 84, 79, 76, 72, 67, 64];
const BASS = [48, 55, 43, 52];

function midi(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function blip(freq: number, when: number, dur: number, type: OscillatorType, amount: number, bus: GainNode) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(amount, when + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(gain);
  gain.connect(bus);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function schedule() {
  if (!ctx || !music) return;
  const beat = 0.34;
  while (nextAt < ctx.currentTime + 0.45) {
    blip(midi(LEAD[step % LEAD.length]), nextAt, beat * 0.82, "square", 0.07, music);
    if (step % 2 === 0) blip(midi(BASS[(step / 2) % BASS.length]), nextAt, beat * 1.5, "triangle", 0.11, music);
    nextAt += beat;
    step += 1;
  }
  timer = window.setTimeout(schedule, 140);
}

export function setChiptuneMuted(next: boolean) {
  muted = next;
  if (music) music.gain.value = next ? 0 : 0.2;
}

function ensure(): AudioContext | null {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    music = ctx.createGain();
    music.gain.value = muted ? 0 : 0.2;
    music.connect(ctx.destination);
    sfx = ctx.createGain();
    sfx.gain.value = 1;
    sfx.connect(ctx.destination);
    nextAt = ctx.currentTime + 0.06;
    schedule();
  }
  return ctx;
}

export function resumeChiptune() {
  const audio = ensure();
  if (audio) void audio.resume();
}

/** A sound on the same clock as the music, so the first tap is not late. */
export function playNotes(notes: { freq: number; at: number; dur: number; gain: number }[]) {
  const audio = ensure();
  if (!audio || !sfx) return;
  const bus = sfx;
  const ring = () => {
    const start = audio.currentTime + 0.012;
    for (const note of notes) {
      blip(note.freq, start + note.at, note.dur, "square", note.gain, bus);
    }
  };
  if (audio.state === "suspended") void audio.resume().then(ring);
  else ring();
}
