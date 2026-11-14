/** Background song, looping. Sound effects stay on a separate clock. */

const SONG_VOLUME = 0.5;
const TRACK = `${import.meta.env.BASE_URL}audio/lonely-cherry-tree.mp3`;

let ctx: AudioContext | null = null;
let sfx: GainNode | null = null;
let track: HTMLAudioElement | null = null;
let muted = (() => {
  try { return localStorage.getItem("zoom-bgm-muted") === "1"; } catch { return false; }
})();
let started = false;
let watching = false;

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

function song(): HTMLAudioElement {
  if (track) return track;
  const prior = (window as unknown as { __bitbiteSong?: HTMLAudioElement }).__bitbiteSong;
  const el = prior instanceof HTMLAudioElement ? prior : new Audio(TRACK);
  el.loop = true;
  el.preload = "auto";
  el.volume = muted ? 0 : SONG_VOLUME;
  el.setAttribute("playsinline", "true");
  el.setAttribute("aria-hidden", "true");
  el.dataset.bitbiteSong = "lonely-cherry-tree";
  el.style.display = "none";
  document.body.appendChild(el);
  el.addEventListener("ended", () => {
    el.currentTime = 0;
    if (started && !muted) void el.play().catch(() => {});
  });
  track = el;
  if (!watching) {
    watching = true;
    document.addEventListener("visibilitychange", () => {
      if (!track || !started || muted || document.hidden) return;
      track.volume = SONG_VOLUME;
      void track.play().catch(() => {});
    });
  }
  return el;
}

function playSong() {
  const el = song();
  el.volume = muted ? 0 : SONG_VOLUME;
  if (muted) {
    el.pause();
    return;
  }
  void el.play().catch(() => {});
}

export function setChiptuneMuted(next: boolean) {
  muted = next;
  if (!track && !started) return;
  playSong();
}

function ensure(): AudioContext | null {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    sfx = ctx.createGain();
    sfx.gain.value = 1;
    sfx.connect(ctx.destination);
  }
  return ctx;
}

export function resumeChiptune() {
  started = true;
  const audio = ensure();
  if (audio && audio.state === "suspended") void audio.resume();
  playSong();
}

/** Build the sound clock during a tap that already happened, so the game tap is not the first one. */
export function primeChiptune() {
  resumeChiptune();
}

/** A sound on the same clock as the effects, so the first tap is not late. */
export function playNotes(notes: { freq: number; at: number; dur: number; gain: number }[]) {
  const audio = ensure();
  if (!audio || !sfx) return;
  const bus = sfx;
  const ring = () => {
    if (audio.state !== "running") return false;
    const start = audio.currentTime + 0.02;
    for (const note of notes) {
      blip(note.freq, start + note.at, note.dur, "square", note.gain, bus);
    }
    return true;
  };
  if (ring()) return;
  void audio.resume().then(() => {
    if (!ring()) window.setTimeout(() => { ring(); }, 40);
  });
}
